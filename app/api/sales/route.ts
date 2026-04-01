import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, type JWTPayload } from "@/lib/auth";
import { checkAndCreateNotifications } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const limit = request.nextUrl.searchParams.get("limit") || "100";
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  let query = "SELECT s.*, u.name as user_name, c.name as client_name FROM sales s JOIN users u ON s.user_id = u.id LEFT JOIN clients c ON s.client_id = c.id WHERE 1=1";
  const params: (string | number)[] = [];

  if (from) { query += " AND DATE(s.created_at) >= ?"; params.push(from); }
  if (to) { query += " AND DATE(s.created_at) <= ?"; params.push(to); }

  query += " ORDER BY s.created_at DESC LIMIT ?";
  params.push(Math.min(Number(limit) || 100, 500));

  const sales = db.prepare(query).all(...params);
  return NextResponse.json(sales);
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

    // Find open cash register
    const register = db.prepare(
      "SELECT id FROM cash_registers WHERE user_id = ? AND status = 'open'"
    ).get(session.userId) as { id: number } | undefined;

    if (!register) {
      return NextResponse.json({ error: "No hay caja abierta. Abre una caja primero." }, { status: 400 });
    }

    // Wrap entire sale in a transaction for atomicity
    const executeSale = db.transaction(() => {
      // Calculate totals
      let subtotal = 0;
      let hasProducts = false;
      let hasServices = false;

      for (const item of items) {
        subtotal += item.unit_price * item.quantity;
        if (item.product_id) hasProducts = true;
        if (item.service_id) hasServices = true;
      }

      const total = subtotal;
      const change_given = payment_method === "cash" && amount_paid ? Math.max(0, amount_paid - total) : 0;
      const sale_type = hasProducts && hasServices ? "mixed" : hasProducts ? "product" : "service";

      // Insert sale
      const saleResult = db.prepare(
        "INSERT INTO sales (cash_register_id, user_id, payment_method, subtotal, total, amount_paid, change_given, sale_type, notes, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(register.id, session.userId, payment_method, subtotal, total, amount_paid || total, change_given, sale_type, notes || null, client_id || null);

      const saleId = saleResult.lastInsertRowid;

      // Insert sale items and update stock
      const insertItem = db.prepare(
        "INSERT INTO sale_items (sale_id, product_id, service_id, item_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      const updateStockSales = db.prepare("UPDATE products SET stock_sales = stock_sales - ? WHERE id = ? AND stock_sales >= ?");
      const updateStockInternal = db.prepare("UPDATE products SET stock_internal = stock_internal - ? WHERE id = ? AND stock_internal >= ?");

      for (const item of items) {
        insertItem.run(saleId, item.product_id || null, item.service_id || null, item.name, item.quantity, item.unit_price, item.unit_price * item.quantity);

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

      return { saleId, total, change_given, payment_method };
    });

    try {
      const result = executeSale();
      return NextResponse.json({
        sale_id: result.saleId,
        total: result.total,
        change_given: result.change_given,
        payment_method: result.payment_method,
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
