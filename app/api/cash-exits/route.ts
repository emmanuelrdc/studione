import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { sanitizeString, isNonEmptyString, isPositiveNumber } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  const db = getDb();
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const registerId = request.nextUrl.searchParams.get("cash_register_id");

  let query = `
    SELECT ce.*, u.name as user_name, cr.opened_at as register_opened_at
    FROM cash_register_exits ce
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN cash_registers cr ON ce.cash_register_id = cr.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (from) { query += " AND DATE(ce.created_at, 'localtime') >= ?"; params.push(from); }
  if (to)   { query += " AND DATE(ce.created_at, 'localtime') <= ?"; params.push(to); }
  if (registerId) { query += " AND ce.cash_register_id = ?"; params.push(Number(registerId)); }

  query += " ORDER BY ce.created_at DESC LIMIT 200";

  const exits = db.prepare(query).all(...params);

  const totalQuery = `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cash_register_exits ce WHERE 1=1
    ${from ? "AND DATE(ce.created_at, 'localtime') >= ?" : ""}
    ${to   ? "AND DATE(ce.created_at, 'localtime') <= ?" : ""}
    ${registerId ? "AND ce.cash_register_id = ?" : ""}
  `;
  const totalParams: (string | number)[] = [];
  if (from) totalParams.push(from);
  if (to) totalParams.push(to);
  if (registerId) totalParams.push(Number(registerId));

  const { total } = db.prepare(totalQuery).get(...totalParams) as { total: number };

  return NextResponse.json({ exits, total });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  try {
    const body = await request.json();
    const { amount, concept, description, cash_register_id } = body;

    const amt = typeof amount === "number" ? amount : Number(amount);
    if (!isPositiveNumber(amt)) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }
    if (!isNonEmptyString(concept)) {
      return NextResponse.json({ error: "El concepto es requerido" }, { status: 400 });
    }

    const safeConcept = sanitizeString(concept, 200)!;
    const safeDesc = sanitizeString(description, 500);
    const regId = cash_register_id ? Number(cash_register_id) : null;

    const db = getDb();

    // Validate cash_register_id if provided
    if (regId) {
      const reg = db.prepare("SELECT id FROM cash_registers WHERE id = ? AND status = 'open'").get(regId);
      if (!reg) {
        return NextResponse.json({ error: "Caja no encontrada o ya cerrada" }, { status: 400 });
      }
    }

    const result = db.transaction(() => {
      const r = db.prepare(
        "INSERT INTO cash_register_exits (cash_register_id, user_id, amount, concept, description) VALUES (?, ?, ?, ?, ?)"
      ).run(regId, session.userId, amt, safeConcept, safeDesc);
      writeAuditTx(db, {
        actor: actorFromSession(session),
        action: "cash_exit.create",
        entityType: "cash_exit",
        entityId: Number(r.lastInsertRowid),
        details: { amount: amt, concept: safeConcept, cash_register_id: regId },
        ...auditContext(request),
      });
      return r;
    })();

    const exit = db.prepare(`
      SELECT ce.*, u.name as user_name
      FROM cash_register_exits ce JOIN users u ON ce.user_id = u.id
      WHERE ce.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json(exit, { status: 201 });
  } catch (error) {
    console.error("POST /api/cash-exits error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
