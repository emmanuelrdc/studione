import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { validateId, sanitizeString } from "@/lib/validation";

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
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/brands/[id] error:", error);
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
  db.prepare("UPDATE brands SET active = 0 WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
