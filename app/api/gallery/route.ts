import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAudit, actorFromSession, auditContext } from "@/lib/audit";
import { sanitizeString, isNonEmptyString } from "@/lib/validation";

// Public endpoint — no auth required (used by the landing page)
export async function GET() {
  try {
    const db = getDb();
    const images = db.prepare(
      "SELECT id, url, alt, sort_order FROM gallery_images WHERE active = 1 ORDER BY sort_order ASC"
    ).all();
    return NextResponse.json(images);
  } catch (error) {
    console.error("GET /api/gallery error:", error);
    return NextResponse.json([], { status: 200 }); // Fail gracefully — empty gallery is better than broken page
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const { url, alt } = body;

    if (!isNonEmptyString(url)) {
      return NextResponse.json({ error: "La URL de la imagen es requerida" }, { status: 400 });
    }

    const safeUrl = sanitizeString(url, 500)!;
    const safeAlt = sanitizeString(alt, 200) ?? null;

    const db = getDb();
    const maxOrder = db.prepare(
      "SELECT COALESCE(MAX(sort_order), 0) as max FROM gallery_images WHERE active = 1"
    ).get() as { max: number };

    const result = db.prepare(
      "INSERT INTO gallery_images (url, alt, sort_order) VALUES (?, ?, ?)"
    ).run(safeUrl, safeAlt, maxOrder.max + 1);

    const image = db.prepare("SELECT * FROM gallery_images WHERE id = ?").get(result.lastInsertRowid);
    writeAudit({
      actor: actorFromSession(session),
      action: "gallery.create",
      entityType: "gallery",
      entityId: Number(result.lastInsertRowid),
      details: { url: safeUrl },
      ...auditContext(request),
    });
    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("POST /api/gallery error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
