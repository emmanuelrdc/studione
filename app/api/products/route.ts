import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { checkAndCreateNotifications } from "@/lib/notifications";
import { isNonEmptyString, isNonNegativeNumber, sanitizeString } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const categoryId = request.nextUrl.searchParams.get("category_id");
  const search = request.nextUrl.searchParams.get("search");
  const active = request.nextUrl.searchParams.get("active");

  let query = "SELECT p.*, c.name as category_name, b.name as brand_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id WHERE 1=1";
  const params: (string | number)[] = [];

  if (categoryId) { query += " AND p.category_id = ?"; params.push(Number(categoryId)); }
  if (search) { query += " AND (p.name LIKE ? OR b.name LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  if (active !== null && active !== undefined) { query += " AND p.active = ?"; params.push(Number(active)); }

  query += " ORDER BY p.name";
  const products = db.prepare(query).all(...params);
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const { name, description, brand_id, stock_sales, stock_internal, price, cost, image, category_id, product_type } = body;

    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });
    }
    if (!isNonNegativeNumber(price)) {
      return NextResponse.json({ error: "Precio debe ser un número >= 0" }, { status: 400 });
    }
    if (cost !== undefined && cost !== null && !isNonNegativeNumber(cost)) {
      return NextResponse.json({ error: "Costo debe ser un número >= 0" }, { status: 400 });
    }
    if (stock_sales !== undefined && !isNonNegativeNumber(stock_sales)) {
      return NextResponse.json({ error: "Stock ventas debe ser >= 0" }, { status: 400 });
    }
    if (stock_internal !== undefined && !isNonNegativeNumber(stock_internal)) {
      return NextResponse.json({ error: "Stock interno debe ser >= 0" }, { status: 400 });
    }
    const validProductTypes = ["sell", "internal", "both"];
    const safeProductType = validProductTypes.includes(product_type) ? product_type : "both";

    const db = getDb();
    const safeName = sanitizeString(name, 200);
    const safeDesc = sanitizeString(description, 2000);

    const result = db.prepare(
      "INSERT INTO products (name, description, brand_id, stock_sales, stock_internal, price, cost, image, category_id, product_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(safeName, safeDesc, brand_id || null, stock_sales || 0, stock_internal || 0, price, cost || 0, image || null, category_id || null, safeProductType);

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid) as { id: number; name: string; stock_sales: number; stock_internal: number; product_type: string };
    checkAndCreateNotifications(product);

    return NextResponse.json({ id: result.lastInsertRowid, ...body }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
