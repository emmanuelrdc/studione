import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { checkAndCreateNotifications } from "@/lib/notifications";
import { clampDiscount, roundMoney, isBirthdayToday } from "@/lib/validation";
import { DEFAULT_POS_SETTINGS, type PosSettings } from "@/lib/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const limit = request.nextUrl.searchParams.get("limit") || "100";
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const clientId = request.nextUrl.searchParams.get("client_id");
  const search = request.nextUrl.searchParams.get("search");

  let query = "SELECT DISTINCT s.*, u.name as user_name, c.name as client_name FROM sales s JOIN users u ON s.user_id = u.id LEFT JOIN clients c ON s.client_id = c.id";
  const params: (string | number)[] = [];

  if (search) {
    query += " JOIN sale_items si ON si.sale_id = s.id";
  }

  query += " WHERE 1=1";

  if (from) { query += " AND DATE(s.created_at, 'localtime') >= ?"; params.push(from); }
  if (to) { query += " AND DATE(s.created_at, 'localtime') <= ?"; params.push(to); }
  if (clientId === "0") { query += " AND s.client_id IS NULL"; }
  else if (clientId) { query += " AND s.client_id = ?"; params.push(Number(clientId)); }
  if (search) { query += " AND si.item_name LIKE ?"; params.push(`%${search}%`); }

  query += " ORDER BY s.created_at DESC LIMIT ?";
  params.push(Math.min(Number(limit) || 100, 500));

  const sales = db.prepare(query).all(...params);

  // Attach items to each sale
  const itemStmt = db.prepare("SELECT item_name, quantity, unit_price, total, product_id, service_id FROM sale_items WHERE sale_id = ?");
  const result = (sales as { id: number }[]).map(s => ({
    ...s,
    items: itemStmt.all(s.id),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  try {
    const { items, payment_method, amount_paid, notes, client_id } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No hay items en la venta" }, { status: 400 });
    }
    if (!payment_method || !["cash", "card"].includes(payment_method)) {
      return NextResponse.json({ error: "Método de pago debe ser 'cash' o 'card'" }, { status: 400 });
    }
    for (const item of items) {
      if (!item.name || !item.quantity || item.quantity <= 0 || item.unit_price === undefined || item.unit_price < 0) {
        return NextResponse.json({ error: "Cada item debe tener name, quantity > 0 y unit_price >= 0" }, { status: 400 });
      }
    }

    const db = getDb();

    // Load POS settings — server is the source of truth for discount/birthday flags.
    // If row missing for any reason, fall back to safe defaults (everything off).
    const settings =
      (db.prepare("SELECT * FROM pos_settings WHERE id = 1").get() as PosSettings | undefined) ||
      { ...DEFAULT_POS_SETTINGS };

    // Find open cash register
    const register = db.prepare(
      "SELECT id FROM cash_registers WHERE user_id = ? AND status = 'open'"
    ).get(session.userId) as { id: number } | undefined;

    if (!register) {
      return NextResponse.json({ error: "No hay caja abierta. Abre una caja primero." }, { status: 400 });
    }

    // Resolve birthday discount server-side (anti-tampering).
    // Only applies when: setting enabled, percent > 0, client provided, client has birth_date, and today matches.
    let birthdayPercent = 0;
    if (settings.birthday_discount_enabled === 1 && settings.birthday_discount_percent > 0 && client_id) {
      const client = db.prepare("SELECT birth_date FROM clients WHERE id = ?").get(Number(client_id)) as
        | { birth_date: string | null }
        | undefined;
      if (client && isBirthdayToday(client.birth_date)) {
        birthdayPercent = clampDiscount(settings.birthday_discount_percent);
      }
    }

    // Load currently-active promotions server-side (anti-tampering, same as birthday discount).
    type PromoRow = { type: "percent" | "fixed"; discount_value: number; target_type: "product" | "service" | "all"; target_id: number | null };
    const promoByProduct = new Map<number, PromoRow>();
    const promoByService = new Map<number, PromoRow>();
    let promoAll: PromoRow | null = null;

    if (settings.allow_promotions === 1) {
      const activePromos = db.prepare(
        `SELECT type, discount_value, target_type, target_id FROM promotions
         WHERE active = 1
           AND (valid_from IS NULL OR valid_from <= DATE('now', 'localtime'))
           AND (valid_to IS NULL OR valid_to >= DATE('now', 'localtime'))`
      ).all() as PromoRow[];

      for (const promo of activePromos) {
        if (promo.target_type === "product" && promo.target_id !== null) promoByProduct.set(promo.target_id, promo);
        else if (promo.target_type === "service" && promo.target_id !== null) promoByService.set(promo.target_id, promo);
        else if (promo.target_type === "all" && !promoAll) promoAll = promo;
      }
    }

    const promoPercentFor = (item: { product_id?: number; service_id?: number; unit_price: number }): number => {
      const promo =
        (item.product_id && promoByProduct.get(item.product_id)) ||
        (item.service_id && promoByService.get(item.service_id)) ||
        promoAll;
      if (!promo) return 0;
      if (promo.type === "percent") return clampDiscount(promo.discount_value);
      return item.unit_price > 0 ? clampDiscount((promo.discount_value / item.unit_price) * 100) : 0;
    };

    // Wrap entire sale in a transaction for atomicity
    const productPriceStmt = db.prepare("SELECT price FROM products WHERE id = ? AND active = 1");
    const servicePriceStmt = db.prepare("SELECT price FROM services WHERE id = ? AND active = 1");

    const auditActor = actorFromSession(session);
    const auditReq = auditContext(request);

    const executeSale = db.transaction(() => {
      let subtotal = 0;
      let discountTotal = 0;
      let hasProducts = false;
      let hasServices = false;

      // Pre-compute per-item totals (server-authoritative)
      const computed = items.map((item: {
        name: string;
        quantity: number;
        unit_price: number;
        product_id?: number;
        service_id?: number;
        discount_percent?: number;
      }) => {
        if (item.product_id) hasProducts = true;
        if (item.service_id) hasServices = true;

        // Resolve the authoritative price server-side (anti price-tampering) — never trust
        // client-supplied unit_price for a catalog item, only for a free-form line (no
        // product_id/service_id), which the current POS UI never sends.
        let unitPrice = item.unit_price;
        if (item.product_id) {
          const product = productPriceStmt.get(item.product_id) as { price: number } | undefined;
          if (!product) throw new Error(`Producto no encontrado o inactivo (ID ${item.product_id})`);
          unitPrice = product.price;
        } else if (item.service_id) {
          const service = servicePriceStmt.get(item.service_id) as { price: number } | undefined;
          if (!service) throw new Error(`Servicio no encontrado o inactivo (ID ${item.service_id})`);
          unitPrice = service.price;
        }

        // Discount selection: only allow client-supplied if setting is on, otherwise force 0.
        // Stacking rule: use the GREATEST among manual, birthday and promotion (never sum).
        const manual = settings.allow_discounts === 1 ? clampDiscount(item.discount_percent) : 0;
        const promoPercent = promoPercentFor({ product_id: item.product_id, service_id: item.service_id, unit_price: unitPrice });
        const effective = Math.max(manual, birthdayPercent, promoPercent);

        const gross = unitPrice * item.quantity;
        const lineTotal = roundMoney(gross * (1 - effective / 100));
        const lineDiscount = roundMoney(gross - lineTotal);

        subtotal += gross;
        discountTotal += lineDiscount;

        return { ...item, unit_price: unitPrice, effective_percent: effective, line_total: lineTotal };
      });

      subtotal = roundMoney(subtotal);
      discountTotal = roundMoney(discountTotal);
      const total = roundMoney(subtotal - discountTotal);

      const paidNum = typeof amount_paid === "number" && Number.isFinite(amount_paid) ? amount_paid : total;
      const change_given = payment_method === "cash" ? roundMoney(Math.max(0, paidNum - total)) : 0;
      const sale_type = hasProducts && hasServices ? "mixed" : hasProducts ? "product" : "service";
      const birthdayApplied = birthdayPercent > 0 ? 1 : 0;

      // Insert sale
      const saleResult = db.prepare(
        "INSERT INTO sales (cash_register_id, user_id, payment_method, subtotal, total, amount_paid, change_given, sale_type, notes, client_id, discount_total, birthday_discount_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        register.id,
        session.userId,
        payment_method,
        subtotal,
        total,
        paidNum,
        change_given,
        sale_type,
        notes || null,
        client_id || null,
        discountTotal,
        birthdayApplied
      );

      const saleId = saleResult.lastInsertRowid;

      // Insert sale items and update stock
      const insertItem = db.prepare(
        "INSERT INTO sale_items (sale_id, product_id, service_id, item_name, quantity, unit_price, total, discount_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const updateStockSales = db.prepare("UPDATE products SET stock_sales = stock_sales - ? WHERE id = ? AND stock_sales >= ?");
      const updateStockInternal = db.prepare("UPDATE products SET stock_internal = stock_internal - ? WHERE id = ? AND stock_internal >= ?");

      for (const item of computed) {
        insertItem.run(
          saleId,
          item.product_id || null,
          item.service_id || null,
          item.name,
          item.quantity,
          item.unit_price,
          item.line_total,
          item.effective_percent
        );

        // Deduct from sales stock for direct product sales
        if (item.product_id) {
          const result = updateStockSales.run(item.quantity, item.product_id, item.quantity);
          if (result.changes === 0) {
            throw new Error(`Stock insuficiente para producto ID ${item.product_id}`);
          }
          const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id) as { id: number; name: string; stock_sales: number; stock_internal: number };
          if (prod) checkAndCreateNotifications(prod);
        }

        // Deduct associated products from internal stock for service sales
        if (item.service_id) {
          const serviceProducts = db.prepare(
            "SELECT sp.product_id, sp.quantity, p.name, p.stock_internal FROM service_products sp JOIN products p ON sp.product_id = p.id WHERE sp.service_id = ?"
          ).all(item.service_id) as { product_id: number; quantity: number; name: string; stock_internal: number }[];

          for (const sp of serviceProducts) {
            const totalQty = sp.quantity * item.quantity;
            const result = updateStockInternal.run(totalQty, sp.product_id, totalQty);
            if (result.changes === 0) {
              throw new Error(`Stock interno insuficiente para ${sp.name}`);
            }
            const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(sp.product_id) as { id: number; name: string; stock_sales: number; stock_internal: number };
            if (prod) checkAndCreateNotifications(prod);
          }
        }
      }

      // Audit inside the transaction: no sale without a log, no log without a sale.
      writeAuditTx(db, {
        actor: auditActor,
        action: "sale.create",
        entityType: "sale",
        entityId: Number(saleId),
        details: { total, payment_method, item_count: computed.length, discount_total: discountTotal },
        ip: auditReq.ip,
        userAgent: auditReq.userAgent,
      });

      return { saleId, total, change_given, payment_method, discount_total: discountTotal, birthday_discount_applied: birthdayApplied };
    });

    try {
      const result = executeSale();
      return NextResponse.json({
        sale_id: result.saleId,
        total: result.total,
        change_given: result.change_given,
        payment_method: result.payment_method,
        discount_total: result.discount_total,
        birthday_discount_applied: result.birthday_discount_applied,
      }, { status: 201 });
    } catch (txError) {
      const message = txError instanceof Error ? txError.message : "Error en la transacción";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/sales error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
