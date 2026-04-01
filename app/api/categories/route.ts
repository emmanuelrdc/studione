import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { isNonEmptyString, sanitizeString } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const type = request.nextUrl.searchParams.get("type");
  const parentId = request.nextUrl.searchParams.get("parent_id");

  let query = "SELECT * FROM categories WHERE 1=1";
  const params: (string | number)[] = [];

  if (type) { query += " AND type = ?"; params.push(type); }
  if (parentId) { query += " AND parent_id = ?"; params.push(Number(parentId)); }
  else if (!parentId && type) { query += " AND parent_id IS NULL"; }

  query += " ORDER BY name";
  const categories = db.prepare(query).all(...params);
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const { name, type, parent_id } = await request.json();
    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });
    }
    if (!type || !["product", "service"].includes(type)) {
      return NextResponse.json({ error: "Tipo debe ser 'product' o 'service'" }, { status: 400 });
    }
    const db = getDb();
    const safeName = sanitizeString(name, 200);
    const result = db.prepare("INSERT INTO categories (name, type, parent_id) VALUES (?, ?, ?)").run(safeName, type, parent_id || null);
    return NextResponse.json({ id: result.lastInsertRowid, name: safeName, type, parent_id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
