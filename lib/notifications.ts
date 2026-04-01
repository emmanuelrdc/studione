import { getDb } from "./db";

interface Product {
  id: number;
  name: string;
  stock_sales: number;
  stock_internal: number;
  product_type?: string;
}

export function checkAndCreateNotifications(product: Product) {
  const db = getDb();

  const type = product.product_type || "both";
  const checkSales = type === "sell" || type === "both";
  const checkInternal = type === "internal" || type === "both";

  const thresholds: { stock: number; type: string; stockType: string; label: string }[] = [];

  if (checkSales) {
    thresholds.push({ stock: product.stock_sales, type: product.stock_sales === 0 ? "out_of_stock_sales" : "low_stock_sales", stockType: "ventas", label: "Stock Ventas" });
  }
  if (checkInternal) {
    thresholds.push({ stock: product.stock_internal, type: product.stock_internal === 0 ? "out_of_stock_internal" : "low_stock_internal", stockType: "interno", label: "Stock Interno" });
  }

  for (const t of thresholds) {
    if (t.stock <= 2) {
      const notifType = t.stock === 0
        ? (t.stockType === "ventas" ? "out_of_stock_sales" : "out_of_stock_internal")
        : (t.stockType === "ventas" ? "low_stock_sales" : "low_stock_internal");

      // Check if unread notification already exists for this product and type
      const existing = db.prepare(
        "SELECT id FROM notifications WHERE product_id = ? AND type = ? AND is_read = 0"
      ).get(product.id, notifType);

      if (!existing) {
        const title = t.stock === 0
          ? `Sin stock (${t.label})`
          : `Stock bajo (${t.label})`;
        const message = t.stock === 0
          ? `"${product.name}" se ha quedado sin stock de ${t.stockType}.`
          : `"${product.name}" tiene solo ${t.stock} unidades en stock de ${t.stockType}.`;

        db.prepare(
          "INSERT INTO notifications (type, title, message, product_id) VALUES (?, ?, ?, ?)"
        ).run(notifType, title, message, product.id);
      }
    }
  }
}
