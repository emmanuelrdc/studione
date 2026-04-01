import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { checkAndCreateNotifications } from "@/lib/notifications";
import { validateId, isPositiveNumber, sanitizeString } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  const db = getDb();
  const product = db.prepare("SELECT p.*, c.name as category_name, b.name as brand_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id WHERE p.id = ?").get(id);
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  try {
    const body = await request.json();
    const { name, description, brand_id, stock_sales, stock_internal, transfer_to, transfer_amount, price, cost, image, category_id, active } = body;
    const db = getDb();

    // Handle stock transfer between sales <-> internal
    if (transfer_to && transfer_amount) {
      if (!["internal", "sales"].includes(transfer_to)) {
        return NextResponse.json({ error: "transfer_to debe ser 'internal' o 'sales'" }, { status: 400 });
      }
      if (!isPositiveNumber(Number(transfer_amount))) {
        return NextResponse.json({ error: "transfer_amount debe ser > 0" }, { status: 400 });
      }

      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as { id: number; name: string; stock_sales: number; stock_internal: number } | undefined;
      if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

      const amount = Number(transfer_amount);
      if (transfer_to === "internal") {
        if (product.stock_sales < amount) return NextResponse.json({ error: "Stock de ventas insuficiente" }, { status: 400 });
        db.prepare("UPDATE products SET stock_sales = stock_sales - ?, stock_internal = stock_internal + ? WHERE id = ?").run(amount, amount, id);
      } else if (transfer_to === "sales") {
        if (product.stock_internal < amount) return NextResponse.json({ error: "Stock interno insuficiente" }, { status: 400 });
        db.prepare("UPDATE products SET stock_internal = stock_internal - ?, stock_sales = stock_sales + ? WHERE id = ?").run(amount, amount, id);
      }

      const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as { id: number; name: string; stock_sales: number; stock_internal: number; product_type: string };
      checkAndCreateNotifications(updated);
      return NextResponse.json(updated);
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) { fields.push("name = ?"); values.push(sanitizeString(name, 200)); }
    if (description !== undefined) { fields.push("description = ?"); values.push(sanitizeString(description, 2000)); }
    if (brand_id !== undefined) { fields.push("brand_id = ?"); values.push(brand_id); }
    if (stock_sales !== undefined) { fields.push("stock_sales = ?"); values.push(stock_sales); }
    if (stock_internal !== undefined) { fields.push("stock_internal = ?"); values.push(stock_internal); }
    if (price !== undefined) { fields.push("price = ?"); values.push(price); }
    if (cost !== undefined) { fields.push("cost = ?"); values.push(cost); }
    if (image !== undefined) { fields.push("image = ?"); values.push(image); }
    if (category_id !== undefined) { fields.push("category_id = ?"); values.push(category_id); }
    if (active !== undefined) { fields.push("active = ?"); values.push(active); }
    if (body.product_type !== undefined) {
      const validTypes = ["sell", "internal", "both"];
      if (validTypes.includes(body.product_type)) {
        fields.push("product_type = ?");
        values.push(body.product_type);
      }
    }

    if (fields.length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    values.push(id);
    db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as { id: number; name: string; stock_sales: number; stock_internal: number; product_type: string };
    checkAndCreateNotifications(updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  const db = getDb();
  db.prepare("UPDATE products SET active = 0 WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
