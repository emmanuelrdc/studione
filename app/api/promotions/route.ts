import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { isNonEmptyString, sanitizeString, isPositiveNumber, clampDiscount, isValidDate } from "@/lib/validation";

const IS_CURRENT_SQL = `
  CASE WHEN active = 1
    AND (valid_from IS NULL OR valid_from <= DATE('now', 'localtime'))
    AND (valid_to IS NULL OR valid_to >= DATE('now', 'localtime'))
  THEN 1 ELSE 0 END AS is_current
`;

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const promotions = db.prepare(
    `SELECT *, ${IS_CURRENT_SQL} FROM promotions ORDER BY created_at DESC`
  ).all();
  return NextResponse.json(promotions);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const { name, type, discount_value, target_type, target_id, valid_from, valid_to } = await request.json();

    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "El nombre de la promoción es requerido" }, { status: 400 });
    }
    if (type !== "percent" && type !== "fixed") {
      return NextResponse.json({ error: "El tipo debe ser 'percent' o 'fixed'" }, { status: 400 });
    }
    if (!isPositiveNumber(discount_value)) {
      return NextResponse.json({ error: "El valor del descuento debe ser un número mayor a 0" }, { status: 400 });
    }
    if (!["product", "service", "all"].includes(target_type)) {
      return NextResponse.json({ error: "target_type debe ser 'product', 'service' o 'all'" }, { status: 400 });
    }

    const db = getDb();
    let safeTargetId: number | null = null;

    if (target_type !== "all") {
      if (!isPositiveNumber(target_id)) {
        return NextResponse.json({ error: "Debes seleccionar un producto o servicio" }, { status: 400 });
      }
      const table = target_type === "product" ? "products" : "services";
      const exists = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND active = 1`).get(target_id);
      if (!exists) {
        return NextResponse.json({ error: `El ${target_type === "product" ? "producto" : "servicio"} seleccionado no existe` }, { status: 400 });
      }
      safeTargetId = target_id;
    }

    if (valid_from !== undefined && valid_from !== null && !isValidDate(valid_from)) {
      return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
    }
    if (valid_to !== undefined && valid_to !== null && !isValidDate(valid_to)) {
      return NextResponse.json({ error: "Fecha de fin inválida" }, { status: 400 });
    }
    if (valid_from && valid_to && valid_from > valid_to) {
      return NextResponse.json({ error: "La fecha de inicio no puede ser posterior a la fecha de fin" }, { status: 400 });
    }

    const safeValue = type === "percent" ? clampDiscount(discount_value) : discount_value;

    const result = db.transaction(() => {
      const r = db.prepare(
        `INSERT INTO promotions (name, type, discount_value, target_type, target_id, valid_from, valid_to)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sanitizeString(name, 200),
        type,
        safeValue,
        target_type,
        safeTargetId,
        valid_from || null,
        valid_to || null
      );
      writeAuditTx(db, {
        actor: actorFromSession(session),
        action: "promotion.create",
        entityType: "promotion",
        entityId: Number(r.lastInsertRowid),
        details: { name: sanitizeString(name, 200), type, discount_value: safeValue, target_type, target_id: safeTargetId },
        ...auditContext(request),
      });
      return r;
    })();

    const promotion = db.prepare(
      `SELECT *, ${IS_CURRENT_SQL} FROM promotions WHERE id = ?`
    ).get(result.lastInsertRowid);
    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error("POST /api/promotions error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
