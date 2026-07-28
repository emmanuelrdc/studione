import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { validateId, sanitizeString } from "@/lib/validation";
import { checkAndCreateNotifications } from "@/lib/notifications";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* no body */ }

  const { type, quantity, stock_type, reason } = body as {
    type?: unknown;
    quantity?: unknown;
    stock_type?: unknown;
    reason?: unknown;
  };

  if (type !== "in" && type !== "out") {
    return NextResponse.json({ error: "type debe ser 'in' o 'out'" }, { status: 400 });
  }
  if (stock_type !== "sales" && stock_type !== "internal") {
    return NextResponse.json({ error: "stock_type debe ser 'sales' o 'internal'" }, { status: 400 });
  }
  const qty = Math.floor(Number(quantity));
  if (!Number.isInteger(qty) || qty <= 0) {
    return NextResponse.json({ error: "quantity debe ser un entero > 0" }, { status: 400 });
  }

  const db = getDb();
  const product = db.prepare(
    "SELECT id, name, stock_sales, stock_internal, product_type FROM products WHERE id = ? AND active = 1"
  ).get(id) as { id: number; name: string; stock_sales: number; stock_internal: number; product_type: string } | undefined;

  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const current = stock_type === "sales" ? product.stock_sales : product.stock_internal;
  if (type === "out" && current < qty) {
    return NextResponse.json(
      { error: `Stock insuficiente — disponible: ${current}` },
      { status: 400 }
    );
  }

  const safeReason = sanitizeString(reason, 500);

  const executeAdjust = db.transaction(() => {
    if (stock_type === "sales") {
      if (type === "in") {
        db.prepare("UPDATE products SET stock_sales = stock_sales + ? WHERE id = ?").run(qty, id);
      } else {
        db.prepare("UPDATE products SET stock_sales = stock_sales - ? WHERE id = ?").run(qty, id);
      }
    } else {
      if (type === "in") {
        db.prepare("UPDATE products SET stock_internal = stock_internal + ? WHERE id = ?").run(qty, id);
      } else {
        db.prepare("UPDATE products SET stock_internal = stock_internal - ? WHERE id = ?").run(qty, id);
      }
    }
    db.prepare(
      "INSERT INTO stock_adjustments (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)"
    ).run(id, session.userId, type, qty, safeReason);
    writeAuditTx(db, {
      actor: actorFromSession(session),
      action: "product.stock_adjust",
      entityType: "product",
      entityId: id,
      details: { type, stock_type, quantity: qty, reason: safeReason },
      ...auditContext(request),
    });
    return db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  });

  try {
    const updated = executeAdjust() as { id: number; name: string; stock_sales: number; stock_internal: number; product_type: string };
    checkAndCreateNotifications(updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/products/[id]/adjust error:", error);
    return NextResponse.json({ error: "Error al ajustar stock" }, { status: 500 });
  }
}
