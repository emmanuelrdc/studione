import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Public endpoint — no auth required. Returns services + products grouped by category for the landing page menu. */
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "services" | "products" | null (both)

  const result: Record<string, unknown> = {};

  if (!type || type === "services") {
    // Get parent service categories
    const parentCats = db.prepare(
      "SELECT id, name FROM categories WHERE type = 'service' AND parent_id IS NULL ORDER BY id"
    ).all() as { id: number; name: string }[];

    const serviceGroups = parentCats.map((cat) => {
      // Get subcategories
      const subcats = db.prepare(
        "SELECT id, name FROM categories WHERE parent_id = ? ORDER BY id"
      ).all(cat.id) as { id: number; name: string }[];

      // Get services for each subcategory
      const subcatWithServices = subcats.map((sub) => {
        const services = db.prepare(
          "SELECT id, name, description, price, duration, image FROM services WHERE category_id = ? AND active = 1 ORDER BY name"
        ).all(sub.id) as { id: number; name: string; description: string | null; price: number; duration: number; image: string | null }[];
        return { ...sub, services };
      });

      // Also get services directly under parent category
      const directServices = db.prepare(
        "SELECT id, name, description, price, duration, image FROM services WHERE category_id = ? AND active = 1 ORDER BY name"
      ).all(cat.id) as { id: number; name: string; description: string | null; price: number; duration: number; image: string | null }[];

      return {
        id: cat.id,
        name: cat.name,
        subcategories: subcatWithServices,
        services: directServices,
      };
    });

    result.services = serviceGroups;
  }

  if (!type || type === "products") {
    const productCats = db.prepare(
      "SELECT id, name FROM categories WHERE type = 'product' AND parent_id IS NULL ORDER BY id"
    ).all() as { id: number; name: string }[];

    const productGroups = productCats.map((cat) => {
      const products = db.prepare(
        "SELECT p.id, p.name, p.description, b.name as brand, p.price, p.image, p.stock_sales as quantity FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE p.category_id = ? AND p.active = 1 ORDER BY p.name"
      ).all(cat.id) as { id: number; name: string; description: string | null; brand: string | null; price: number; image: string | null; quantity: number }[];
      return { ...cat, products };
    });

    result.products = productGroups;
  }

  return NextResponse.json(result);
}
