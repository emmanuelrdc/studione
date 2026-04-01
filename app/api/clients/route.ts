import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { isNonEmptyString, sanitizeString } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const search = request.nextUrl.searchParams.get("search");
  const active = request.nextUrl.searchParams.get("active");

  let query = "SELECT * FROM clients WHERE 1=1";
  const params: (string | number)[] = [];

  if (active !== null) {
    query += " AND active = ?";
    params.push(active === "0" ? 0 : 1);
  } else {
    query += " AND active = 1";
  }

  if (search) {
    query += " AND (name LIKE ? OR phone LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term);
  }

  query += " ORDER BY name";
  const clients = db.prepare(query).all(...params);
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const { name, phone, birth_date } = await request.json();

    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "El nombre del cliente es requerido" }, { status: 400 });
    }

    const safeName = sanitizeString(name, 200)!;
    const safePhone = sanitizeString(phone, 20);
    const safeBirthDate = birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null;

    const db = getDb();
    const result = db.prepare(
      "INSERT INTO clients (name, phone, birth_date) VALUES (?, ?, ?)"
    ).run(safeName, safePhone, safeBirthDate);

    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
