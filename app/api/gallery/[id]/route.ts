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
    const { alt, sort_order, active } = body;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (alt !== undefined) {
      fields.push("alt = ?");
      values.push(sanitizeString(alt, 200));
    }
    if (sort_order !== undefined) {
      const n = Number(sort_order);
      if (!Number.isFinite(n)) {
        return NextResponse.json({ error: "sort_order debe ser un número" }, { status: 400 });
      }
      fields.push("sort_order = ?");
      values.push(Math.round(n));
    }
    if (active !== undefined) {
      fields.push("active = ?");
      values.push(active ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM gallery_images WHERE id = ?").get(id);
    if (!existing) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });

    values.push(id);
    db.prepare(`UPDATE gallery_images SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM gallery_images WHERE id = ?").get(id);
    writeAudit({
      actor: actorFromSession(session),
      action: "gallery.update",
      entityType: "gallery",
      entityId: id,
      details: { changed: fields.map((f) => f.split(" ")[0]) },
      ...auditContext(request),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/gallery/[id] error:", error);
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
  const existing = db.prepare("SELECT id FROM gallery_images WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });

  // Soft delete — leaves the file on disk (uploads are shared with products)
  db.prepare("UPDATE gallery_images SET active = 0 WHERE id = ?").run(id);
  writeAudit({
    actor: actorFromSession(session),
    action: "gallery.delete",
    entityType: "gallery",
    entityId: id,
    ...auditContext(request),
  });
  return NextResponse.json({ success: true });
}
