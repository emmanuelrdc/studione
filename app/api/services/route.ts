import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { isNonEmptyString, isNonNegativeNumber, isPositiveNumber, sanitizeString } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const categoryId = request.nextUrl.searchParams.get("category_id");
  const search = request.nextUrl.searchParams.get("search");

  let query = "SELECT s.*, c.name as category_name FROM services s LEFT JOIN categories c ON s.category_id = c.id WHERE s.active = 1";
  const params: (string | number)[] = [];

  if (categoryId) { query += " AND s.category_id = ?"; params.push(Number(categoryId)); }
  if (search) { query += " AND s.name LIKE ?"; params.push(`%${search}%`); }

  query += " ORDER BY s.name";
  const services = db.prepare(query).all(...params) as { id: number }[];

  // Attach associated products to each service
  const spStmt = db.prepare(
    "SELECT sp.*, p.name as product_name FROM service_products sp JOIN products p ON sp.product_id = p.id WHERE sp.service_id = ?"
  );
  const result = services.map(s => ({
    ...s,
    products: spStmt.all(s.id),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const { name, description, price, duration, image, category_id, products } = body;

    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });
    }
    if (!isNonNegativeNumber(price)) {
      return NextResponse.json({ error: "Precio debe ser un número >= 0" }, { status: 400 });
    }
    if (duration !== undefined && duration !== null && !isPositiveNumber(duration)) {
      return NextResponse.json({ error: "Duración debe ser > 0" }, { status: 400 });
    }

    const db = getDb();
    const safeName = sanitizeString(name, 200);
    const safeDesc = sanitizeString(description, 2000);

    const createService = db.transaction(() => {
      const result = db.prepare(
        "INSERT INTO services (name, description, price, duration, image, category_id) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(safeName, safeDesc, price, duration || 60, image || null, category_id || null);

      const serviceId = result.lastInsertRowid;

      if (products && Array.isArray(products) && products.length > 0) {
        const insertSP = db.prepare("INSERT INTO service_products (service_id, product_id, quantity) VALUES (?, ?, ?)");
        for (const p of products) {
          if (p.product_id && p.quantity > 0) {
            insertSP.run(serviceId, p.product_id, p.quantity);
          }
        }
      }

      return serviceId;
    });

    const serviceId = createService();

    return NextResponse.json({ id: serviceId, ...body }, { status: 201 });
  } catch (error) {
    console.error("POST /api/services error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
