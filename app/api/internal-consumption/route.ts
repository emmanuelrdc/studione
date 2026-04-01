import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, type JWTPayload } from "@/lib/auth";
import { checkAndCreateNotifications } from "@/lib/notifications";
import { isPositiveNumber } from "@/lib/validation";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const items = db.prepare(
    "SELECT ic.*, p.name as product_name, u.name as user_name FROM internal_consumption ic JOIN products p ON ic.product_id = p.id JOIN users u ON ic.user_id = u.id ORDER BY ic.created_at DESC LIMIT 100"
  ).all();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  try {
    const { product_id, quantity, reason } = await request.json();
    if (!product_id || !isPositiveNumber(quantity)) {
      return NextResponse.json({ error: "Producto y cantidad (> 0) son requeridos" }, { status: 400 });
    }

    const db = getDb();

    const executeConsumption = db.transaction(() => {
      // Validate stock
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as { id: number; name: string; stock_sales: number; stock_internal: number } | undefined;
      if (!product) throw new Error("NOT_FOUND");
      if (product.stock_internal < quantity) throw new Error("INSUFFICIENT_STOCK");

      // Update internal stock
      db.prepare("UPDATE products SET stock_internal = stock_internal - ? WHERE id = ?").run(quantity, product_id);
      const result = db.prepare(
        "INSERT INTO internal_consumption (user_id, product_id, quantity, reason) VALUES (?, ?, ?, ?)"
      ).run(session.userId, product_id, quantity, reason || null);

      const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as { id: number; name: string; stock_sales: number; stock_internal: number };
      checkAndCreateNotifications(updated);

      return result.lastInsertRowid;
    });

    try {
      const id = executeConsumption();
      return NextResponse.json({ id }, { status: 201 });
    } catch (txError) {
      const msg = txError instanceof Error ? txError.message : "";
      if (msg === "NOT_FOUND") return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
      if (msg === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "Stock interno insuficiente" }, { status: 400 });
      throw txError;
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("POST /api/internal-consumption error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
