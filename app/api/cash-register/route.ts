import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, type JWTPayload } from "@/lib/auth";
import { isNonNegativeNumber } from "@/lib/validation";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const registers = db.prepare(
    "SELECT cr.*, u.name as user_name FROM cash_registers cr JOIN users u ON cr.user_id = u.id ORDER BY cr.opened_at DESC LIMIT 50"
  ).all();
  return NextResponse.json(registers);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  try {
    const { action, opening_amount, closing_amount, notes, id } = await request.json();

    if (!action || !["open", "close"].includes(action)) {
      return NextResponse.json({ error: "Acción debe ser 'open' o 'close'" }, { status: 400 });
    }

    const db = getDb();

    if (action === "open") {
      if (opening_amount !== undefined && !isNonNegativeNumber(opening_amount)) {
        return NextResponse.json({ error: "Monto de apertura debe ser >= 0" }, { status: 400 });
      }

      // Check no open register
      const existing = db.prepare("SELECT id FROM cash_registers WHERE user_id = ? AND status = 'open'").get(session.userId);
      if (existing) return NextResponse.json({ error: "Ya tienes una caja abierta" }, { status: 400 });

      const result = db.prepare(
        "INSERT INTO cash_registers (user_id, opening_amount, notes) VALUES (?, ?, ?)"
      ).run(session.userId, opening_amount || 0, notes || null);

      const register = db.prepare("SELECT * FROM cash_registers WHERE id = ?").get(result.lastInsertRowid);
      return NextResponse.json(register, { status: 201 });
    }

    if (action === "close" && id) {
      // Calculate expected amount
      const salesTotal = db.prepare(
        "SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE cash_register_id = ? AND payment_method = 'cash'"
      ).get(id) as { total: number };

      const register = db.prepare("SELECT * FROM cash_registers WHERE id = ?").get(id) as { opening_amount: number; user_id: number } | undefined;
      if (!register) return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });

      // Only the same user or admin can close the register
      if (register.user_id !== session.userId && session.role !== "admin") {
        return NextResponse.json({ error: "No autorizado para cerrar esta caja" }, { status: 403 });
      }

      const expectedAmount = register.opening_amount + salesTotal.total;

      db.prepare(
        "UPDATE cash_registers SET closing_amount = ?, expected_amount = ?, notes = ?, closed_at = CURRENT_TIMESTAMP, status = 'closed' WHERE id = ?"
      ).run(closing_amount || 0, expectedAmount, notes || null, id);

      const updated = db.prepare("SELECT * FROM cash_registers WHERE id = ?").get(id);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/cash-register error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
