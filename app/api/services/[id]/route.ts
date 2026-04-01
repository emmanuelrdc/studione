import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { validateId, sanitizeString } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  const db = getDb();
  const service = db.prepare(
    "SELECT s.*, c.name as category_name FROM services s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = ?"
  ).get(id);
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  const serviceProducts = db.prepare(
    "SELECT sp.*, p.name as product_name FROM service_products sp JOIN products p ON sp.product_id = p.id WHERE sp.service_id = ?"
  ).all(id);

  return NextResponse.json({ ...service as object, products: serviceProducts });
}

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
    const { name, description, price, duration, image, category_id, active, products } = body;
    const db = getDb();

    const updateService = db.transaction(() => {
      const fields: string[] = [];
      const values: (string | number | null)[] = [];

      if (name !== undefined) { fields.push("name = ?"); values.push(sanitizeString(name, 200)); }
      if (description !== undefined) { fields.push("description = ?"); values.push(sanitizeString(description, 2000)); }
      if (price !== undefined) { fields.push("price = ?"); values.push(price); }
      if (duration !== undefined) { fields.push("duration = ?"); values.push(duration); }
      if (image !== undefined) { fields.push("image = ?"); values.push(image); }
      if (category_id !== undefined) { fields.push("category_id = ?"); values.push(category_id); }
      if (active !== undefined) { fields.push("active = ?"); values.push(active); }

      if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE services SET ${fields.join(", ")} WHERE id = ?`).run(...values);
      }

      // Update associated products
      if (products !== undefined && Array.isArray(products)) {
        db.prepare("DELETE FROM service_products WHERE service_id = ?").run(id);
        const insertSP = db.prepare("INSERT INTO service_products (service_id, product_id, quantity) VALUES (?, ?, ?)");
        for (const p of products) {
          if (p.product_id && p.quantity > 0) {
            insertSP.run(id, p.product_id, p.quantity);
          }
        }
      }
    });

    updateService();

    const updated = db.prepare("SELECT * FROM services WHERE id = ?").get(id);
    const serviceProducts = db.prepare(
      "SELECT sp.*, p.name as product_name FROM service_products sp JOIN products p ON sp.product_id = p.id WHERE sp.service_id = ?"
    ).all(id);
    return NextResponse.json({ ...updated as object, products: serviceProducts });
  } catch (error) {
    console.error("PUT /api/services/[id] error:", error);
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
  db.prepare("UPDATE services SET active = 0 WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
