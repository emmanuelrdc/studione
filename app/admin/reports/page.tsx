"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  total_sales: number; total_revenue: number; cash_total: number;
  card_total: number; avg_sale: number; total_discounts: number;
}
interface ByType { sale_type: string; count: number; total: number; }
interface TopItem { item_name: string; qty: number; revenue: number; }
interface DailySale { date: string; count: number; total: number; }
interface HourlySale { hour: string; count: number; total: number; }
interface EmployeeSale { id: number; name: string; total_sales: number; total_revenue: number; avg_sale: number; }
interface FreqClient { id: number; name: string; phone: string | null; visit_count: number; total_spent: number; last_visit: string; }
interface MonthData { month: string; total_sales: number; total_revenue: number; }
interface CashFlowDay { date: string; ingresos: number; egresos: number; }
interface ProfitSummary { gross_revenue: number; cogs: number; cash_exits: number; net_profit: number; }

interface Report {
  summary: Summary; byType: ByType[]; topProducts: TopItem[]; topServices: TopItem[];
  dailySales: DailySale[]; hourlySales: HourlySale[];
  salesByEmployee: EmployeeSale[]; frequentClients: FreqClient[];
  monthComparison: MonthData[]; cashFlow: CashFlowDay[]; profitSummary: ProfitSummary;
}

interface Sale {
  id: number; created_at: string; client_name: string | null; user_name: string;
  sale_type: string; payment_method: string; total: number; amount_paid: number;
  change_given: number; status: string; discount_total: number;
}

interface CashExit {
  id: number; amount: number; concept: string; description: string | null;
  user_name: string; cash_register_id: number | null; created_at: string;
}

interface CashRegister {
  id: number; user_name: string; opening_amount: number; closing_amount: number | null;
  expected_amount: number | null; opened_at: string; closed_at: string | null; status: string;
}

interface Client { id: number; name: string; }
interface User { id: number; name: string; }

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$${(n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function getPeriodRange(period: string, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date().toISOString().split("T")[0];
  if (period === "custom") return { from: customFrom || today, to: customTo || today };
  if (period === "today") return { from: today, to: today };
  const d = new Date();
  if (period === "7d") { d.setDate(d.getDate() - 7); return { from: d.toISOString().split("T")[0], to: today }; }
  if (period === "30d") { d.setDate(d.getDate() - 30); return { from: d.toISOString().split("T")[0], to: today }; }
  if (period === "month") { return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, to: today }; }
  if (period === "year") { return { from: `${d.getFullYear()}-01-01`, to: today }; }
  return { from: today, to: today };
}

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, highlight, tooltip }: {
  label: string; value: string; sub?: string; highlight?: boolean; tooltip?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-1.5 relative group">
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/30">{label}</p>
        {tooltip && (
          <div className="relative">
            <svg className="h-3.5 w-3.5 text-white/20 cursor-help" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-[11px] text-white/50 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <p className={`text-2xl font-semibold tracking-tight ${highlight ? "text-emerald-400" : "text-white/90"}`}>{value}</p>
      {sub && <p className="text-xs text-white/25">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, onExport }: { title: string; onExport?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{title}</h2>
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 transition-all hover:bg-white/[0.08] hover:text-white/70"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar CSV
        </button>
      )}
    </div>
  );
}

function DualBarChart({ data }: { data: CashFlowDay[] }) {
  if (!data.length) return <div className="py-10 text-center text-sm text-white/20">Sin datos en el período</div>;
  const maxVal = Math.max(...data.flatMap(d => [d.ingresos, d.egresos]), 1);
  return (
    <div className="flex items-end gap-2 h-36 w-full overflow-x-auto pb-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-end gap-0.5 min-w-[28px] flex-1 group relative">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full rounded-t-sm bg-emerald-500/60 transition-all" style={{ height: `${Math.max((d.ingresos / maxVal) * 100, d.ingresos > 0 ? 2 : 0)}%` }} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full rounded-t-sm bg-red-500/60 transition-all" style={{ height: `${Math.max((d.egresos / maxVal) * 100, d.egresos > 0 ? 2 : 0)}%` }} />
          </div>
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-2 py-1.5 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            <p className="font-medium text-white/50 mb-1">{fmtDate(d.date)}</p>
            <p className="text-emerald-400">Ingr: {fmt(d.ingresos)}</p>
            {d.egresos > 0 && <p className="text-red-400">Egr: {fmt(d.egresos)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="py-12 text-center text-sm text-white/20">{message}</div>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONCEPT_OPTIONS = [
  "Compra de tintes",
  "Compra de shampoos",
  "Compra de herramientas",
  "Pago de servicios",
  "Pago de renta",
  "Suministros de limpieza",
  "Otros gastos",
];

const PERIOD_PRESETS = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "month", label: "Este mes" },
  { key: "year", label: "Este año" },
  { key: "custom", label: "Personalizado" },
];

type TabId = "resumen" | "ventas" | "empleados" | "clientes" | "flujo" | "cajas";

const TABS: { id: TabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "ventas", label: "Ventas" },
  { id: "empleados", label: "Empleados" },
  { id: "clientes", label: "Clientes" },
  { id: "flujo", label: "Flujo de Caja" },
  { id: "cajas", label: "Cajas" },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [view, setView] = useState<TabId>("resumen");

  const [report, setReport] = useState<Report | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [exits, setExits] = useState<CashExit[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);

  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingExits, setLoadingExits] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [filterClient, setFilterClient] = useState("none");
  const [filterEmployee, setFilterEmployee] = useState("none");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [exitForm, setExitForm] = useState({ amount: "", concept: CONCEPT_OPTIONS[0], description: "", cash_register_id: "" });
  const [savingExit, setSavingExit] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);

  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const fetchReport = useCallback(async (f: string, t: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/sales/reports?from=${f}&to=${t}`);
      if (res.ok) setReport(await res.json());
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const fetchSales = useCallback(async (f: string, t: string) => {
    setLoadingSales(true);
    try {
      let url = `/api/sales?from=${f}&to=${t}&limit=500`;
      if (filterClient !== "none") url += `&client_id=${filterClient}`;
      if (filterSearch) url += `&search=${encodeURIComponent(filterSearch)}`;
      const res = await fetch(url);
      if (res.ok) setSales(await res.json());
    } finally {
      setLoadingSales(false);
    }
  }, [filterClient, filterSearch]);

  const fetchExits = useCallback(async (f: string, t: string) => {
    setLoadingExits(true);
    try {
      const res = await fetch(`/api/cash-exits?from=${f}&to=${t}`);
      if (res.ok) {
        const data = await res.json();
        setExits(data.exits || []);
      }
    } finally {
      setLoadingExits(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user?.role === "admin") setIsAdmin(true);
    });
    fetch("/api/clients").then(r => r.json()).then(d => { if (Array.isArray(d)) setClients(d); });
    fetch("/api/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setEmployees(d); }).catch(() => {});
    fetch("/api/cash-register").then(r => r.json()).then(d => { if (Array.isArray(d)) setRegisters(d); });
  }, []);

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    fetchReport(from, to);
    fetchSales(from, to);
    fetchExits(from, to);
  }, [from, to, period, fetchReport, fetchSales, fetchExits]);

  const cancelSale = async (id: number) => {
    if (!confirm("¿Cancelar esta venta? Se restaurará el stock de los productos.")) return;
    setCancellingId(id);
    const res = await fetch(`/api/sales/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Cancelación desde reportes" }) });
    if (res.ok) { fetchSales(from, to); fetchReport(from, to); }
    setCancellingId(null);
  };

  const handleSaveExit = async () => {
    const amt = parseFloat(exitForm.amount);
    if (!amt || amt <= 0) { setExitError("El monto debe ser mayor a 0"); return; }
    if (!exitForm.concept.trim()) { setExitError("El concepto es requerido"); return; }
    setSavingExit(true);
    setExitError(null);
    try {
      const body: Record<string, unknown> = { amount: amt, concept: exitForm.concept, description: exitForm.description || null };
      if (exitForm.cash_register_id) body.cash_register_id = Number(exitForm.cash_register_id);
      const res = await fetch("/api/cash-exits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        setExitForm({ amount: "", concept: CONCEPT_OPTIONS[0], description: "", cash_register_id: "" });
        fetchExits(from, to);
        fetchReport(from, to);
        fetch("/api/cash-register").then(r => r.json()).then(d => { if (Array.isArray(d)) setRegisters(d); });
      } else {
        const d = await res.json().catch(() => ({}));
        setExitError(d.error || "Error al registrar salida");
      }
    } finally {
      setSavingExit(false);
    }
  };

  const filteredSales = sales.filter(s => {
    if (filterEmployee !== "none") {
      const emp = employees.find(e => e.id === Number(filterEmployee));
      if (emp && s.user_name !== emp.name) return false;
    }
    if (filterPayment !== "all" && s.payment_method !== filterPayment) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const openRegisters = registers.filter(r => r.status === "open");

  return (
    <div className="p-5 lg:p-8 space-y-5">

      {/* ── Page header + Period selector ─────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Reportes</h1>
          <p className="mt-1 text-sm text-white/35">Análisis financiero del negocio</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-1">
            {PERIOD_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${period === p.key
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "border border-white/[0.06] text-white/35 hover:text-white/60 hover:bg-white/[0.04]"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="glass-input px-3 py-1.5 text-xs" />
              <span className="text-white/20 text-xs">—</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="glass-input px-3 py-1.5 text-xs" />
            </div>
          )}
          {period !== "custom" && (
            <p className="text-[11px] text-white/20">{fmtDate(from)} — {fmtDate(to)}</p>
          )}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 min-w-max rounded-lg px-4 py-2 text-xs font-medium transition-all whitespace-nowrap ${view === tab.id
              ? "bg-white/[0.08] text-white/90 shadow-sm"
              : "text-white/35 hover:text-white/60"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingReport && (
        <div className="flex items-center gap-2 text-xs text-white/25">
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Actualizando datos...
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: RESUMEN                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === "resumen" && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard label="Ingresos" value={fmt(report.summary.total_revenue)} sub={`${report.summary.total_sales} ventas`} />
            <KPICard
              label="Utilidad neta"
              value={fmt(report.profitSummary.net_profit)}
              highlight={report.profitSummary.net_profit >= 0}
              tooltip={`Ingresos (${fmt(report.profitSummary.gross_revenue)}) − Costo de productos (${fmt(report.profitSummary.cogs)}) − Egresos de caja (${fmt(report.profitSummary.cash_exits)})`}
            />
            <KPICard label="Ticket promedio" value={fmt(report.summary.avg_sale)} />
            <KPICard label="Ventas" value={String(report.summary.total_sales)} sub={`Efectivo: ${fmt(report.summary.cash_total)} · Tarjeta: ${fmt(report.summary.card_total)}`} />
          </div>

          {/* Profit breakdown */}
          <div className="glass-card rounded-2xl p-5">
            <SectionHeader title="Desglose de utilidad" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Ingresos brutos", value: report.profitSummary.gross_revenue, color: "text-white/80" },
                { label: "Costo de productos", value: report.profitSummary.cogs, color: "text-amber-400", prefix: "−" },
                { label: "Egresos de caja", value: report.profitSummary.cash_exits, color: "text-red-400", prefix: "−" },
                { label: "Utilidad neta", value: report.profitSummary.net_profit, color: report.profitSummary.net_profit >= 0 ? "text-emerald-400" : "text-red-400" },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/25 mb-1.5">{item.label}</p>
                  <p className={`text-lg font-semibold ${item.color}`}>
                    {(item as { prefix?: string }).prefix}{fmt(Math.abs(item.value))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Month comparison */}
          <div className="glass-card rounded-2xl p-5">
            <SectionHeader title="Comparativa últimos 6 meses" />
            {report.monthComparison.length > 0 ? (
              <div className="flex items-end gap-2 h-32 mt-2">
                {report.monthComparison.map((m, i) => {
                  const maxRev = Math.max(...report.monthComparison.map(x => x.total_revenue), 1);
                  const pct = (m.total_revenue / maxRev) * 100;
                  const [y, mo] = m.month.split("-");
                  const monthName = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("es-MX", { month: "short" });
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      <div className="w-full rounded-t bg-primary-500/60 transition-all" style={{ height: `${Math.max(pct, 2)}%` }} />
                      <p className="text-[10px] text-white/30">{monthName}</p>
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-2 py-1.5 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                        <p className="font-medium text-white/60">{m.month}</p>
                        <p className="text-primary-400">{fmt(m.total_revenue)}</p>
                        <p className="text-white/30">{m.total_sales} ventas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState message="Sin ventas en los últimos 6 meses" />}
          </div>

          {/* Top products + services */}
          <div className="grid gap-5 lg:grid-cols-2">
            {[
              { title: "Productos más vendidos", items: report.topProducts, color: "bg-primary-500/50" },
              { title: "Servicios más solicitados", items: report.topServices, color: "bg-accent-500/50" },
            ].map(({ title, items, color }) => (
              <div key={title} className="glass-card rounded-2xl p-5">
                <SectionHeader title={title} />
                {items.length > 0 ? (
                  <div className="space-y-2.5">
                    {items.slice(0, 7).map((item, i) => {
                      const maxRev = items[0].revenue;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-4 text-[10px] font-bold text-white/20 text-right shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-white/70 truncate">{item.item_name}</p>
                              <p className="text-xs text-white/40 shrink-0 ml-2">{fmt(item.revenue)}</p>
                            </div>
                            <div className="h-1 w-full rounded-full bg-white/[0.04]">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${(item.revenue / maxRev) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-[10px] text-white/25 w-10 text-right shrink-0">{item.qty} u</span>
                        </div>
                      );
                    })}
                  </div>
                ) : <EmptyState message="Sin ventas en el período" />}
              </div>
            ))}
          </div>

          {/* By type */}
          {report.byType.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <SectionHeader title="Desglose por tipo de venta" />
              <div className="grid grid-cols-3 gap-3">
                {report.byType.map(t => (
                  <div key={t.sale_type} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
                      {t.sale_type === "product" ? "Productos" : t.sale_type === "service" ? "Servicios" : "Mixto"}
                    </p>
                    <p className="text-lg font-semibold text-white/80">{fmt(t.total)}</p>
                    <p className="text-xs text-white/30 mt-0.5">{t.count} ventas</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: VENTAS                                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === "ventas" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="glass-input px-3 py-2 text-xs [&>option]:bg-neutral-900">
              <option value="none">Todos los empleados</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="glass-input px-3 py-2 text-xs [&>option]:bg-neutral-900">
              <option value="none">Todos los clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="glass-input px-3 py-2 text-xs [&>option]:bg-neutral-900">
              <option value="all">Todo método</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input px-3 py-2 text-xs [&>option]:bg-neutral-900">
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Buscar producto o servicio..." className="glass-input w-full pl-8 pr-3 py-2 text-xs" />
            </div>
            <button
              onClick={() => exportCSV(`ventas-${from}-${to}.csv`, filteredSales.map(s => ({
                ID: s.id, Fecha: fmtDateTime(s.created_at), Cliente: s.client_name || "—",
                Empleado: s.user_name, Tipo: s.sale_type, "Método pago": s.payment_method,
                Total: s.total, "Monto pagado": s.amount_paid, Cambio: s.change_given,
                Descuento: s.discount_total, Estado: s.status,
              })))}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar CSV
            </button>
          </div>

          {filteredSales.length > 0 && (
            <div className="flex flex-wrap gap-4 text-xs text-white/40">
              <span>{filteredSales.filter(s => s.status === "active").length} ventas activas</span>
              <span>Total activas: {fmt(filteredSales.filter(s => s.status === "active").reduce((a, s) => a + s.total, 0))}</span>
              {filteredSales.some(s => s.status === "cancelled") && (
                <span className="text-red-400/60">{filteredSales.filter(s => s.status === "cancelled").length} canceladas</span>
              )}
            </div>
          )}

          <div className="overflow-hidden glass-card !rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["#", "Fecha", "Cliente", "Empleado", "Tipo", "Pago", "Total", "Descuento", "Estado", ""].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loadingSales ? (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-white/20 text-xs">Cargando...</td></tr>
                  ) : filteredSales.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-white/20 text-xs">Sin ventas en el período</td></tr>
                  ) : filteredSales.map(s => (
                    <tr key={s.id} className={`transition-colors hover:bg-white/[0.02] ${s.status === "cancelled" ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3 text-white/25 text-xs">#{s.id}</td>
                      <td className="px-4 py-3 text-white/45 text-xs whitespace-nowrap">{fmtDateTime(s.created_at)}</td>
                      <td className="px-4 py-3 text-white/70 text-xs">{s.client_name || <span className="text-white/20">—</span>}</td>
                      <td className="px-4 py-3 text-white/45 text-xs">{s.user_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/40">
                          {s.sale_type === "product" ? "Producto" : s.sale_type === "service" ? "Servicio" : "Mixto"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.payment_method === "cash" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {s.payment_method === "cash" ? "Efectivo" : "Tarjeta"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-white/80 whitespace-nowrap">{fmt(s.total)}</td>
                      <td className="px-4 py-3 text-xs">{s.discount_total > 0 ? <span className="text-amber-400/70">{fmt(s.discount_total)}</span> : <span className="text-white/20">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {s.status === "cancelled" ? "Cancelada" : "Activa"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && s.status === "active" && (
                          <button onClick={() => cancelSale(s.id)} disabled={cancellingId === s.id}
                            className="rounded-lg border border-red-500/20 px-2.5 py-1 text-[10px] font-medium text-red-400/70 transition-all hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40">
                            {cancellingId === s.id ? "..." : "Cancelar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: EMPLEADOS                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === "empleados" && report && (
        <div className="space-y-4">
          <SectionHeader
            title="Ventas por empleado"
            onExport={() => exportCSV(`empleados-${from}-${to}.csv`, report.salesByEmployee.map(e => ({
              Empleado: e.name, "Num Ventas": e.total_sales,
              "Total generado": e.total_revenue.toFixed(2), "Ticket promedio": e.avg_sale.toFixed(2),
            })))}
          />
          {report.salesByEmployee.length === 0 ? (
            <EmptyState message="Sin ventas en el período" />
          ) : (
            <div className="glass-card !rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Empleado", "Ventas", "Total generado", "Ticket prom.", "% del total", "Distribución"].map(col => (
                      <th key={col} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {report.salesByEmployee.map((e, i) => {
                    const maxRev = report.salesByEmployee[0].total_revenue;
                    const pct = report.summary.total_revenue > 0 ? (e.total_revenue / report.summary.total_revenue) * 100 : 0;
                    const barPct = maxRev > 0 ? (e.total_revenue / maxRev) * 100 : 0;
                    return (
                      <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/20 text-xs font-bold text-primary-400">{i + 1}</div>
                            <span className="font-medium text-white/80">{e.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-white/50">{e.total_sales}</td>
                        <td className="px-5 py-3.5 font-medium text-white/80">{fmt(e.total_revenue)}</td>
                        <td className="px-5 py-3.5 text-white/50">{fmt(e.avg_sale)}</td>
                        <td className="px-5 py-3.5 text-white/40">{pct.toFixed(1)}%</td>
                        <td className="px-5 py-3.5 w-32">
                          <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                            <div className="h-full rounded-full bg-primary-500/60 transition-all" style={{ width: `${barPct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: CLIENTES                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === "clientes" && report && (
        <div className="space-y-4">
          <SectionHeader
            title="Clientes frecuentes"
            onExport={() => exportCSV(`clientes-${from}-${to}.csv`, report.frequentClients.map(c => ({
              Cliente: c.name, Telefono: c.phone || "—", Visitas: c.visit_count,
              "Total gastado": c.total_spent.toFixed(2),
              "Ticket promedio": (c.total_spent / c.visit_count).toFixed(2),
              "Ultima visita": fmtDateTime(c.last_visit),
            })))}
          />
          {report.frequentClients.length === 0 ? (
            <EmptyState message="Sin ventas con cliente registrado en el período" />
          ) : (
            <div className="glass-card !rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["#", "Cliente", "Teléfono", "Visitas", "Total gastado", "Ticket prom.", "Última visita"].map(col => (
                      <th key={col} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {report.frequentClients.map((c, i) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-white/20 text-xs">{i + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-white/80">{c.name}</td>
                      <td className="px-5 py-3.5 text-white/40">{c.phone || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary-500/10 px-2 text-xs font-bold text-primary-400">
                          {c.visit_count}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-white/80">{fmt(c.total_spent)}</td>
                      <td className="px-5 py-3.5 text-white/40">{fmt(c.total_spent / c.visit_count)}</td>
                      <td className="px-5 py-3.5 text-white/30 text-xs whitespace-nowrap">{fmtDateTime(c.last_visit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: FLUJO DE CAJA                                         */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === "flujo" && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <KPICard label="Efectivo recibido" value={fmt(report.summary.cash_total)} sub="Ventas en efectivo" />
            <KPICard label="Egresos de caja" value={fmt(report.profitSummary.cash_exits)} sub="Salidas registradas" />
            <KPICard
              label="Flujo neto"
              value={fmt(report.summary.cash_total - report.profitSummary.cash_exits)}
              highlight={(report.summary.cash_total - report.profitSummary.cash_exits) >= 0}
              sub="Efectivo − Egresos"
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Flujo diario de efectivo</h2>
              <div className="flex items-center gap-4 text-[11px] text-white/30">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/60" />Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-red-500/60" />Egresos</span>
              </div>
            </div>
            <DualBarChart data={report.cashFlow} />
          </div>

          {/* Exit form */}
          <div className="glass-card rounded-2xl p-5">
            <SectionHeader title="Registrar salida de caja" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-white/30 uppercase tracking-wider">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm">$</span>
                  <input type="number" step="0.01" min="0.01" value={exitForm.amount} onChange={e => setExitForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="glass-input w-full pl-7 pr-3 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-white/30 uppercase tracking-wider">Concepto *</label>
                <select value={exitForm.concept} onChange={e => setExitForm(f => ({ ...f, concept: e.target.value }))} className="glass-input w-full px-3 py-2.5 text-sm [&>option]:bg-neutral-900">
                  {CONCEPT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-white/30 uppercase tracking-wider">Caja asociada</label>
                <select value={exitForm.cash_register_id} onChange={e => setExitForm(f => ({ ...f, cash_register_id: e.target.value }))} className="glass-input w-full px-3 py-2.5 text-sm [&>option]:bg-neutral-900">
                  <option value="">Sin caja asociada</option>
                  {openRegisters.map(r => <option key={r.id} value={r.id}>Caja #{r.id} — {r.user_name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-white/30 uppercase tracking-wider">Descripción</label>
                <input value={exitForm.description} onChange={e => setExitForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalle adicional..." maxLength={500} className="glass-input w-full px-3 py-2.5 text-sm" />
              </div>
            </div>
            {exitError && <p className="mt-3 text-xs text-red-400">{exitError}</p>}
            <div className="mt-4 flex justify-end">
              <button onClick={handleSaveExit} disabled={savingExit} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-40">
                {savingExit ? "Registrando..." : "Registrar salida"}
              </button>
            </div>
          </div>

          {/* Exits table */}
          <div className="glass-card !rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Historial de salidas</h2>
              <button onClick={() => exportCSV(`salidas-${from}-${to}.csv`, exits.map(e => ({ ID: e.id, Fecha: fmtDateTime(e.created_at), Concepto: e.concept, Descripcion: e.description || "—", Monto: e.amount, Registrado_por: e.user_name, "Caja ID": e.cash_register_id || "—" })))}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Fecha", "Concepto", "Descripción", "Monto", "Registrado por", "Caja"].map(col => (
                      <th key={col} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loadingExits ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-white/20 text-xs">Cargando...</td></tr>
                  ) : exits.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-white/20 text-xs">Sin salidas registradas en el período</td></tr>
                  ) : exits.map(e => (
                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-white/40 text-xs whitespace-nowrap">{fmtDateTime(e.created_at)}</td>
                      <td className="px-5 py-3.5 font-medium text-white/70">{e.concept}</td>
                      <td className="px-5 py-3.5 text-white/35 text-xs">{e.description || <span className="text-white/20">—</span>}</td>
                      <td className="px-5 py-3.5 font-medium text-red-400">{fmt(e.amount)}</td>
                      <td className="px-5 py-3.5 text-white/40 text-xs">{e.user_name}</td>
                      <td className="px-5 py-3.5 text-white/25 text-xs">{e.cash_register_id ? `#${e.cash_register_id}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: CAJAS                                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {view === "cajas" && (
        <div className="space-y-4">
          <SectionHeader
            title="Registros de caja"
            onExport={() => exportCSV(`cajas-${from}-${to}.csv`, registers.map(r => ({
              "Caja ID": r.id, Cajero: r.user_name, Apertura: fmtDateTime(r.opened_at),
              "Monto inicial": r.opening_amount, "Monto esperado": r.expected_amount ?? "—",
              "Cierre declarado": r.closing_amount ?? "—",
              Diferencia: r.expected_amount != null && r.closing_amount != null ? (r.closing_amount - r.expected_amount).toFixed(2) : "—",
              Estado: r.status,
            })))}
          />
          <div className="glass-card !rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Cajero", "Apertura", "Inicial", "Esperado", "Cierre declarado", "Diferencia", "Estado"].map(col => (
                      <th key={col} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {registers.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-white/20 text-xs">Sin registros de caja</td></tr>
                  ) : registers.map(r => {
                    const diff = r.expected_amount != null && r.closing_amount != null ? r.closing_amount - r.expected_amount : null;
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 font-medium text-white/70">{r.user_name}</td>
                        <td className="px-5 py-3.5 text-white/40 text-xs whitespace-nowrap">{fmtDateTime(r.opened_at)}</td>
                        <td className="px-5 py-3.5 text-white/60">{fmt(r.opening_amount)}</td>
                        <td className="px-5 py-3.5 text-white/60">{r.expected_amount != null ? fmt(r.expected_amount) : <span className="text-white/20">—</span>}</td>
                        <td className="px-5 py-3.5 text-white/60">{r.closing_amount != null ? fmt(r.closing_amount) : <span className="text-white/20">—</span>}</td>
                        <td className="px-5 py-3.5">
                          {diff != null ? (
                            <span className={`text-sm font-medium ${Math.abs(diff) < 0.01 ? "text-white/30" : diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {diff > 0 ? "+" : ""}{fmt(diff)}
                            </span>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${r.status === "open" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.06] text-white/40"}`}>
                            {r.status === "open" ? "Abierta" : "Cerrada"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-white/20">* Monto esperado = Apertura + Ventas en efectivo − Salidas de caja registradas</p>
        </div>
      )}
    </div>
  );
}
