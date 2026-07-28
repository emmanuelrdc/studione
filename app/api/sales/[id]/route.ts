import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { validateId, sanitizeString } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  const db = getDb();
  const sale = db.prepare("SELECT s.*, u.name as user_name, c.name as client_name FROM sales s JOIN users u ON s.user_id = u.id LEFT JOIN clients c ON s.client_id = c.id WHERE s.id = ?").get(id);
  if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });

  const items = db.prepare(
    "SELECT si.*, p.name as product_name, sv.name as service_name_detail FROM sale_items si LEFT JOIN products p ON si.product_id = p.id LEFT JOIN services sv ON si.service_id = sv.id WHERE si.sale_id = ?"
  ).all(id);

  return NextResponse.json({ sale, items });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  let reason: string | null = null;
  try {
    const body = await request.json();
    reason = sanitizeString(body?.reason, 500);
  } catch {
    // No body or invalid JSON — proceed without reason
  }

  const db = getDb();

  const sale = db.prepare(
    "SELECT id, status FROM sales WHERE id = ?"
  ).get(id) as { id: number; status: string } | undefined;

  if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
  if (sale.status === "cancelled") {
    return NextResponse.json({ error: "La venta ya fue cancelada" }, { status: 409 });
  }

  const items = db.prepare(
    "SELECT product_id, service_id, quantity FROM sale_items WHERE sale_id = ?"
  ).all(id) as { product_id: number | null; service_id: number | null; quantity: number }[];

  const executeCancellation = db.transaction(() => {
    db.prepare("UPDATE sales SET status = 'cancelled' WHERE id = ?").run(id);

    const refundResult = db.prepare(
      "INSERT INTO sale_refunds (sale_id, refunded_by, reason) VALUES (?, ?, ?)"
    ).run(id, session.userId, reason);

    for (const item of items) {
      if (item.product_id) {
        db.prepare(
          "UPDATE products SET stock_sales = stock_sales + ? WHERE id = ?"
        ).run(item.quantity, item.product_id);
      }

      if (item.service_id) {
        const serviceProducts = db.prepare(
          "SELECT product_id, quantity FROM service_products WHERE service_id = ?"
        ).all(item.service_id) as { product_id: number; quantity: number }[];

        for (const sp of serviceProducts) {
          db.prepare(
            "UPDATE products SET stock_internal = stock_internal + ? WHERE id = ?"
          ).run(sp.quantity * item.quantity, sp.product_id);
        }
      }
    }

    writeAuditTx(db, {
      actor: actorFromSession(session),
      action: "sale.cancel",
      entityType: "sale",
      entityId: id,
      details: { refund_id: Number(refundResult.lastInsertRowid), reason },
      ...auditContext(request),
    });

    return { refundId: Number(refundResult.lastInsertRowid) };
  });

  try {
    const { refundId } = executeCancellation();
    return NextResponse.json({ message: "Venta cancelada", sale_id: id, refund_id: refundId });
  } catch (error) {
    console.error("DELETE /api/sales/[id] error:", error);
    return NextResponse.json({ error: "Error al cancelar la venta" }, { status: 500 });
  }
}
