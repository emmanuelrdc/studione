import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, type JWTPayload } from "@/lib/auth";
import { writeAudit, actorFromSession, auditContext } from "@/lib/audit";
import { validateId } from "@/lib/validation";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  try {
    const body = await request.json();
    const db = getDb();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, val] of Object.entries(body)) {
      if (["client_name", "client_phone", "service_id", "service_name", "date", "time", "end_time", "status", "notes", "client_id"].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(val as string | number | null);
      }
    }

    if (fields.length === 0) return NextResponse.json({ error: "No hay campos" }, { status: 400 });
    values.push(id);
    db.prepare(`UPDATE appointments SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    writeAudit({
      actor: actorFromSession(session),
      action: "appointment.update",
      entityType: "appointment",
      entityId: id,
      details: { changed: fields.map((f) => f.split(" ")[0]) },
      ...auditContext(request),
    });
    const updated = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  const db = getDb();
  db.prepare("DELETE FROM appointments WHERE id = ?").run(id);
  writeAudit({
    actor: actorFromSession(session),
    action: "appointment.delete",
    entityType: "appointment",
    entityId: id,
    ...auditContext(request),
  });
  return NextResponse.json({ success: true });
}
