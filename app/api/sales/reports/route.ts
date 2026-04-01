import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  const db = getDb();
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const period = request.nextUrl.searchParams.get("period") || "today";

  let dateFilter = "";
  const params: string[] = [];

  if (from && to) {
    dateFilter = "AND DATE(s.created_at) BETWEEN ? AND ?";
    params.push(from, to);
  } else if (period === "today") {
    dateFilter = "AND DATE(s.created_at) = DATE('now', 'localtime')";
  } else if (period === "week") {
    dateFilter = "AND DATE(s.created_at) >= DATE('now', 'localtime', '-7 days')";
  } else if (period === "month") {
    dateFilter = "AND DATE(s.created_at) >= DATE('now', 'localtime', '-30 days')";
  }

  // Summary
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_sales,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card_total,
      COALESCE(AVG(total), 0) as avg_sale
    FROM sales s WHERE 1=1 ${dateFilter}
  `).get(...params);

  // Sales by type
  const byType = db.prepare(`
    SELECT sale_type, COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM sales s WHERE 1=1 ${dateFilter}
    GROUP BY sale_type
  `).all(...params);

  // Top products
  const topProducts = db.prepare(`
    SELECT si.item_name, SUM(si.quantity) as qty, SUM(si.total) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.id
    WHERE si.product_id IS NOT NULL ${dateFilter}
    GROUP BY si.item_name ORDER BY revenue DESC LIMIT 10
  `).all(...params);

  // Top services
  const topServices = db.prepare(`
    SELECT si.item_name, SUM(si.quantity) as qty, SUM(si.total) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.id
    WHERE si.service_id IS NOT NULL ${dateFilter}
    GROUP BY si.item_name ORDER BY revenue DESC LIMIT 10
  `).all(...params);

  // Daily breakdown (last 30 days)
  const dailySales = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as total
    FROM sales WHERE DATE(created_at) >= DATE('now', 'localtime', '-30 days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all();

  // Hourly breakdown for today
  const hourlySales = db.prepare(`
    SELECT strftime('%H', created_at) as hour, COUNT(*) as count, SUM(total) as total
    FROM sales WHERE DATE(created_at) = DATE('now', 'localtime')
    GROUP BY strftime('%H', created_at) ORDER BY hour
  `).all();

  return NextResponse.json({
    summary,
    byType,
    topProducts,
    topServices,
    dailySales,
    hourlySales,
  });
}
