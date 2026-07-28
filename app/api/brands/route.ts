import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAudit, actorFromSession, auditContext } from "@/lib/audit";
import { isNonEmptyString, sanitizeString } from "@/lib/validation";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const brands = db.prepare("SELECT * FROM brands WHERE active = 1 ORDER BY name").all();
  return NextResponse.json(brands);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const { name, description } = await request.json();

    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "El nombre de la marca es requerido" }, { status: 400 });
    }

    const db = getDb();
    const safeName = sanitizeString(name, 200)!;
    const safeDesc = sanitizeString(description, 2000);

    const existing = db.prepare("SELECT id FROM brands WHERE name = ? AND active = 1").get(safeName);
    if (existing) {
      return NextResponse.json({ error: "Ya existe una marca con ese nombre" }, { status: 409 });
    }

    const result = db.prepare(
      "INSERT INTO brands (name, description) VALUES (?, ?)"
    ).run(safeName, safeDesc);

    const brand = db.prepare("SELECT * FROM brands WHERE id = ?").get(result.lastInsertRowid);
    writeAudit({
      actor: actorFromSession(session),
      action: "brand.create",
      entityType: "brand",
      entityId: Number(result.lastInsertRowid),
      details: { name: safeName },
      ...auditContext(request),
    });
    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("POST /api/brands error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
