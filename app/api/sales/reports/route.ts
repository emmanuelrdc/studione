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

  // Build date filter for sales (applies to most queries)
  let dateFilter = "";
  const params: string[] = [];

  if (from && to) {
    dateFilter = "AND DATE(s.created_at, 'localtime') BETWEEN ? AND ?";
    params.push(from, to);
  } else if (period === "today") {
    dateFilter = "AND DATE(s.created_at, 'localtime') = DATE('now', 'localtime')";
  } else if (period === "week" || period === "7d") {
    dateFilter = "AND DATE(s.created_at, 'localtime') >= DATE('now', 'localtime', '-7 days')";
  } else if (period === "month" || period === "30d") {
    dateFilter = "AND DATE(s.created_at, 'localtime') >= DATE('now', 'localtime', '-30 days')";
  } else if (period === "year") {
    dateFilter = "AND strftime('%Y', s.created_at, 'localtime') = strftime('%Y', 'now', 'localtime')";
  }

  // Build date filter for cash_exits (no alias)
  let exitsFilter = "";
  const exitsParams: string[] = [];
  if (from && to) {
    exitsFilter = "AND DATE(created_at, 'localtime') BETWEEN ? AND ?";
    exitsParams.push(from, to);
  } else if (period === "today") {
    exitsFilter = "AND DATE(created_at, 'localtime') = DATE('now', 'localtime')";
  } else if (period === "week" || period === "7d") {
    exitsFilter = "AND DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-7 days')";
  } else if (period === "month" || period === "30d") {
    exitsFilter = "AND DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-30 days')";
  } else if (period === "year") {
    exitsFilter = "AND strftime('%Y', created_at, 'localtime') = strftime('%Y', 'now', 'localtime')";
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_sales,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card_total,
      COALESCE(AVG(total), 0) as avg_sale,
      COALESCE(SUM(discount_total), 0) as total_discounts
    FROM sales s WHERE s.status = 'active' ${dateFilter}
  `).get(...params) as Record<string, number>;

  // ── Sales by type ───────────────────────────────────────────────────────────
  const byType = db.prepare(`
    SELECT sale_type, COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM sales s WHERE s.status = 'active' ${dateFilter}
    GROUP BY sale_type
  `).all(...params);

  // ── Top products ────────────────────────────────────────────────────────────
  const topProducts = db.prepare(`
    SELECT si.item_name, SUM(si.quantity) as qty, SUM(si.total) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.id
    WHERE si.product_id IS NOT NULL AND s.status = 'active' ${dateFilter}
    GROUP BY si.item_name ORDER BY revenue DESC LIMIT 10
  `).all(...params);

  // ── Top services ────────────────────────────────────────────────────────────
  const topServices = db.prepare(`
    SELECT si.item_name, SUM(si.quantity) as qty, SUM(si.total) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.id
    WHERE si.service_id IS NOT NULL AND s.status = 'active' ${dateFilter}
    GROUP BY si.item_name ORDER BY revenue DESC LIMIT 10
  `).all(...params);

  // ── Daily breakdown (last 30 days, fixed) ────────────────────────────────────
  const dailySales = db.prepare(`
    SELECT DATE(created_at, 'localtime') as date, COUNT(*) as count, SUM(total) as total
    FROM sales
    WHERE status = 'active' AND DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-30 days')
    GROUP BY DATE(created_at, 'localtime') ORDER BY date
  `).all();

  // ── Hourly breakdown (today, fixed) ─────────────────────────────────────────
  const hourlySales = db.prepare(`
    SELECT strftime('%H', created_at, 'localtime') as hour, COUNT(*) as count, SUM(total) as total
    FROM sales
    WHERE status = 'active' AND DATE(created_at, 'localtime') = DATE('now', 'localtime')
    GROUP BY strftime('%H', created_at, 'localtime') ORDER BY hour
  `).all();

  // ── NEW: Sales by employee ───────────────────────────────────────────────────
  const salesByEmployee = db.prepare(`
    SELECT u.id, u.name, COUNT(s.id) as total_sales,
      COALESCE(SUM(s.total), 0) as total_revenue,
      COALESCE(AVG(s.total), 0) as avg_sale
    FROM sales s JOIN users u ON s.user_id = u.id
    WHERE s.status = 'active' ${dateFilter}
    GROUP BY u.id, u.name ORDER BY total_revenue DESC
  `).all(...params);

  // ── NEW: Frequent clients (top 20) ──────────────────────────────────────────
  const frequentClients = db.prepare(`
    SELECT c.id, c.name, c.phone, COUNT(s.id) as visit_count,
      COALESCE(SUM(s.total), 0) as total_spent,
      MAX(s.created_at) as last_visit
    FROM sales s JOIN clients c ON s.client_id = c.id
    WHERE s.status = 'active' ${dateFilter}
    GROUP BY c.id, c.name, c.phone ORDER BY visit_count DESC LIMIT 20
  `).all(...params);

  // ── NEW: Month comparison (last 6 months, always fixed) ─────────────────────
  const monthComparison = db.prepare(`
    SELECT strftime('%Y-%m', s.created_at, 'localtime') as month,
      COUNT(*) as total_sales, COALESCE(SUM(s.total), 0) as total_revenue
    FROM sales s WHERE s.status = 'active'
      AND s.created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all();

  // ── NEW: Cash flow (daily ingresos vs egresos) ───────────────────────────────
  const cashInflow = db.prepare(`
    SELECT DATE(created_at, 'localtime') as date, COALESCE(SUM(total), 0) as ingresos
    FROM sales WHERE payment_method = 'cash' AND status = 'active'
    ${from && to ? "AND DATE(created_at, 'localtime') BETWEEN ? AND ?" :
      period === "today" ? "AND DATE(created_at, 'localtime') = DATE('now', 'localtime')" :
      period === "week" || period === "7d" ? "AND DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-7 days')" :
      period === "month" || period === "30d" ? "AND DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-30 days')" :
      period === "year" ? "AND strftime('%Y', created_at, 'localtime') = strftime('%Y', 'now', 'localtime')" : ""}
    GROUP BY DATE(created_at, 'localtime') ORDER BY date
  `).all(...(from && to ? [from, to] : [])) as { date: string; ingresos: number }[];

  // cash_register_exits may not exist yet on older DBs — guard with try/catch
  let cashOutflow: { date: string; egresos: number }[] = [];
  try {
    cashOutflow = db.prepare(`
      SELECT DATE(created_at, 'localtime') as date, COALESCE(SUM(amount), 0) as egresos
      FROM cash_register_exits WHERE 1=1 ${exitsFilter}
      GROUP BY DATE(created_at, 'localtime') ORDER BY date
    `).all(...exitsParams) as { date: string; egresos: number }[];
  } catch { /* table may not exist in very old databases — safe to skip */ }

  // Merge inflow and outflow by date
  const cashFlowMap = new Map<string, { date: string; ingresos: number; egresos: number }>();
  for (const row of cashInflow) {
    cashFlowMap.set(row.date, { date: row.date, ingresos: row.ingresos, egresos: 0 });
  }
  for (const row of cashOutflow) {
    if (cashFlowMap.has(row.date)) {
      cashFlowMap.get(row.date)!.egresos = row.egresos;
    } else {
      cashFlowMap.set(row.date, { date: row.date, ingresos: 0, egresos: row.egresos });
    }
  }
  const cashFlow = Array.from(cashFlowMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // ── NEW: Profit summary (utilidad real) ─────────────────────────────────────
  const cogsResult = db.prepare(`
    SELECT COALESCE(SUM(si.quantity * p.cost), 0) as cogs
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'active' AND p.cost > 0 ${dateFilter}
  `).get(...params) as { cogs: number };

  const exitsTotal = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cash_register_exits WHERE 1=1 ${exitsFilter}
  `).get(...exitsParams) as { total: number };

  const profitSummary = {
    gross_revenue: summary.total_revenue,
    cogs: cogsResult.cogs,
    cash_exits: exitsTotal.total,
    net_profit: summary.total_revenue - cogsResult.cogs - exitsTotal.total,
  };

  return NextResponse.json({
    summary,
    byType,
    topProducts,
    topServices,
    dailySales,
    hourlySales,
    salesByEmployee,
    frequentClients,
    monthComparison,
    cashFlow,
    profitSummary,
  });
}
