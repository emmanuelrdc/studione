import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateId } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  const db = getDb();
  const sale = db.prepare("SELECT s.*, u.name as user_name, c.name as client_name FROM sales s JOIN users u ON s.user_id = u.id LEFT JOIN clients c ON s.client_id = c.id WHERE s.id = ?").get(id);
  if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });

  const items = db.prepare(
    "SELECT si.*, p.name as product_name, sv.name as service_name_detail FROM sale_items si LEFT JOIN products p ON si.product_id = p.id LEFT JOIN services sv ON si.service_id = sv.id WHERE si.sale_id = ?"
  ).all(id);

  return NextResponse.json({ sale, items });
}
