import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAudit, actorFromSession, auditContext } from "@/lib/audit";
import { validateId, sanitizeString } from "@/lib/validation";

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
    const { name, description, active } = body;
    const db = getDb();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) { fields.push("name = ?"); values.push(sanitizeString(name, 200)); }
    if (description !== undefined) { fields.push("description = ?"); values.push(sanitizeString(description, 2000)); }
    if (active !== undefined) { fields.push("active = ?"); values.push(active); }

    if (fields.length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    values.push(id);
    db.prepare(`UPDATE brands SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM brands WHERE id = ?").get(id);
    writeAudit({
      actor: actorFromSession(session),
      action: "brand.update",
      entityType: "brand",
      entityId: id,
      details: { changed: fields.map((f) => f.split(" ")[0]) },
      ...auditContext(request),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/brands/[id] error:", error);
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
  db.prepare("UPDATE brands SET active = 0 WHERE id = ?").run(id);
  writeAudit({
    actor: actorFromSession(session),
    action: "brand.delete",
    entityType: "brand",
    entityId: id,
    ...auditContext(request),
  });
  return NextResponse.json({ success: true });
}
