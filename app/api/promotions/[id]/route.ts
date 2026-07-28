import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { validateId, sanitizeString, isPositiveNumber, clampDiscount, isValidDate } from "@/lib/validation";

const IS_CURRENT_SQL = `
  CASE WHEN active = 1
    AND (valid_from IS NULL OR valid_from <= DATE('now', 'localtime'))
    AND (valid_to IS NULL OR valid_to >= DATE('now', 'localtime'))
  THEN 1 ELSE 0 END AS is_current
`;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  try {
    const body = await request.json();
    const { name, type, discount_value, target_type, target_id, valid_from, valid_to, active } = body;
    const db = getDb();

    const existing = db.prepare("SELECT * FROM promotions WHERE id = ?").get(id) as
      | { type: string; target_type: string }
      | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) { fields.push("name = ?"); values.push(sanitizeString(name, 200)); }

    if (type !== undefined) {
      if (type !== "percent" && type !== "fixed") {
        return NextResponse.json({ error: "El tipo debe ser 'percent' o 'fixed'" }, { status: 400 });
      }
      fields.push("type = ?"); values.push(type);
    }

    if (discount_value !== undefined) {
      if (!isPositiveNumber(discount_value)) {
        return NextResponse.json({ error: "El valor del descuento debe ser un número mayor a 0" }, { status: 400 });
      }
      const effectiveType = type !== undefined ? type : existing.type;
      fields.push("discount_value = ?");
      values.push(effectiveType === "percent" ? clampDiscount(discount_value) : discount_value);
    }

    let effectiveTargetType = existing.target_type;
    if (target_type !== undefined) {
      if (!["product", "service", "all"].includes(target_type)) {
        return NextResponse.json({ error: "target_type debe ser 'product', 'service' o 'all'" }, { status: 400 });
      }
      effectiveTargetType = target_type;
      fields.push("target_type = ?"); values.push(target_type);
    }

    if (target_id !== undefined || target_type !== undefined) {
      if (effectiveTargetType === "all") {
        fields.push("target_id = ?"); values.push(null);
      } else {
        // If target_type is changing to 'product'/'service', target_id must be supplied in
        // the same request — the old target_id (from a possibly different target_type) can't
        // be assumed valid for the new type.
        if (target_id === undefined) {
          return NextResponse.json({ error: "Debes especificar target_id al cambiar el destino" }, { status: 400 });
        }
        if (!isPositiveNumber(target_id)) {
          return NextResponse.json({ error: "Debes seleccionar un producto o servicio" }, { status: 400 });
        }
        const table = effectiveTargetType === "product" ? "products" : "services";
        const exists = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND active = 1`).get(target_id);
        if (!exists) {
          return NextResponse.json({ error: `El ${effectiveTargetType === "product" ? "producto" : "servicio"} seleccionado no existe` }, { status: 400 });
        }
        fields.push("target_id = ?"); values.push(target_id);
      }
    }

    if (valid_from !== undefined) {
      if (valid_from !== null && !isValidDate(valid_from)) {
        return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
      }
      fields.push("valid_from = ?"); values.push(valid_from || null);
    }
    if (valid_to !== undefined) {
      if (valid_to !== null && !isValidDate(valid_to)) {
        return NextResponse.json({ error: "Fecha de fin inválida" }, { status: 400 });
      }
      fields.push("valid_to = ?"); values.push(valid_to || null);
    }
    if (valid_from && valid_to && valid_from > valid_to) {
      return NextResponse.json({ error: "La fecha de inicio no puede ser posterior a la fecha de fin" }, { status: 400 });
    }

    if (active !== undefined) { fields.push("active = ?"); values.push(active ? 1 : 0); }

    if (fields.length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    values.push(id);
    db.transaction(() => {
      db.prepare(`UPDATE promotions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
      writeAuditTx(db, {
        actor: actorFromSession(session),
        action: "promotion.update",
        entityType: "promotion",
        entityId: id,
        details: { changed: fields.map((f) => f.split(" ")[0]) },
        ...auditContext(request),
      });
    })();

    const updated = db.prepare(`SELECT *, ${IS_CURRENT_SQL} FROM promotions WHERE id = ?`).get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/promotions/[id] error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
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

  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE promotions SET active = 0 WHERE id = ?").run(id);
    writeAuditTx(db, {
      actor: actorFromSession(session),
      action: "promotion.delete",
      entityType: "promotion",
      entityId: id,
      ...auditContext(request),
    });
  })();
  return NextResponse.json({ success: true });
}
