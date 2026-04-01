"use client";

import { useState, useEffect } from "react";

interface Sale { id: number; total: number; payment_method: string; sale_type: string; user_name: string; created_at: string; amount_paid: number; change_given: number; }
interface Report {
  summary: { total_sales: number; total_revenue: number; cash_total: number; card_total: number; avg_sale: number };
  byType: { sale_type: string; count: number; total: number }[];
  topProducts: { item_name: string; qty: number; revenue: number }[];
  topServices: { item_name: string; qty: number; revenue: number }[];
  dailySales: { date: string; count: number; total: number }[];
  hourlySales: { hour: string; count: number; total: number }[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"overview" | "sales" | "cash">("overview");

  useEffect(() => {
    const params = from && to ? `from=${from}&to=${to}` : `period=${period}`;
    fetch(`/api/sales/reports?${params}`).then(r => r.json()).then(setReport).catch(() => {});
    fetch(`/api/sales?${from ? `from=${from}&to=${to}` : ""}&limit=200`).then(r => r.json()).then(setSales).catch(() => {});
  }, [period, from, to]);

  const fmt = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Reportes de Ventas</h1>
          <p className="mt-1 text-sm text-white/35">Análisis completo de tu negocio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
            {[{ key: "today", label: "Hoy" }, { key: "week", label: "7 días" }, { key: "month", label: "30 días" }].map(p => (
              <button key={p.key} onClick={() => { setPeriod(p.key); setFrom(""); setTo(""); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${period === p.key && !from ? "bg-primary-500/15 text-primary-400" : "text-white/35 hover:text-white/55"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none [color-scheme:dark]" />
            <span className="text-white/20">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none [color-scheme:dark]" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/[0.06] w-fit">
        {[{ key: "overview", label: "Resumen" }, { key: "sales", label: "Ventas" }, { key: "cash", label: "Cajas" }].map(t => (
          <button key={t.key} onClick={() => setView(t.key as typeof view)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${view === t.key ? "bg-primary-500/15 text-primary-400" : "text-white/35"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === "overview" && report && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Ventas", value: report.summary.total_sales.toString(), icon: "🧰" },
              { label: "Ingresos", value: fmt(report.summary.total_revenue), icon: "💰" },
              { label: "Efectivo", value: fmt(report.summary.cash_total), icon: "💵" },
              { label: "Tarjeta", value: fmt(report.summary.card_total), icon: "💳" },
              { label: "Promedio", value: fmt(report.summary.avg_sale), icon: "📊" },
            ].map(s => (
              <div key={s.label} className="glass-card p-5">
                <span className="text-lg">{s.icon}</span>
                <p className="mt-2 text-xl font-bold text-white/90">{s.value}</p>
                <p className="text-[11px] text-white/30">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Daily chart */}
            <div className="glass-card p-5">
              <h3 className="mb-4 text-[13px] font-medium text-white/50">Ventas Diarias</h3>
              <div className="flex items-end gap-1 h-44">
                {report.dailySales.map((d, i) => {
                  const max = Math.max(...report.dailySales.map(s => s.total), 1);
                  return (
                    <div key={i} className="group relative flex-1 flex flex-col items-center justify-end">
                      <div className="absolute -top-8 hidden group-hover:block rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/80 whitespace-nowrap z-10">
                        {d.date.slice(5)} · {fmt(d.total)} · {d.count} ventas
                      </div>
                      <div className="w-full rounded-t-md bg-gradient-to-t from-primary-500/50 to-primary-400/30 hover:from-primary-400 hover:to-primary-300 min-h-[2px] transition-all"
                        style={{ height: `${Math.max((d.total / max) * 100, 2)}%` }} />
                    </div>
                  );
                })}
              </div>
              {report.dailySales.length === 0 && <p className="text-center text-sm text-white/20 py-16">Sin datos</p>}
            </div>

            {/* Hourly chart */}
            <div className="glass-card p-5">
              <h3 className="mb-4 text-[13px] font-medium text-white/50">Ventas por Hora (Hoy)</h3>
              <div className="flex items-end gap-1 h-44">
                {Array.from({ length: 24 }, (_, h) => {
                  const data = report.hourlySales.find(s => parseInt(s.hour) === h);
                  const max = Math.max(...report.hourlySales.map(s => s.total), 1);
                  return (
                    <div key={h} className="group relative flex-1 flex flex-col items-center justify-end">
                      {data && (
                        <div className="absolute -top-8 hidden group-hover:block rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/80 whitespace-nowrap z-10">
                          {h}:00 · {fmt(data.total)}
                        </div>
                      )}
                      <div className={`w-full rounded-t-sm min-h-[2px] transition-all ${data ? "bg-gradient-to-t from-primary-500/50 to-charcoal-500/40 hover:from-primary-400 hover:to-charcoal-400" : "bg-white/[0.03]"}`}
                        style={{ height: data ? `${Math.max((data.total / max) * 100, 4)}%` : "2px" }} />
                    </div>
                  );
                })}
              </div>
              {report.hourlySales.length === 0 && <p className="text-center text-sm text-white/20 py-16">Sin datos</p>}
            </div>
          </div>

          {/* Top items */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-card p-5">
              <h3 className="mb-4 text-[13px] font-medium text-white/50">Top Productos</h3>
              <div className="space-y-3">
                {report.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-500/10 text-[9px] font-medium text-primary-400">{i + 1}</span>
                      <span className="text-sm text-white/70">{p.item_name}</span>
                      <span className="text-xs text-white/20">×{p.qty}</span>
                    </div>
                    <span className="text-sm font-medium text-white/50">{fmt(p.revenue)}</span>
                  </div>
                ))}
                {report.topProducts.length === 0 && <p className="text-sm text-white/15 text-center py-4">Sin datos</p>}
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="mb-4 text-[13px] font-medium text-white/50">Top Servicios</h3>
              <div className="space-y-3">
                {report.topServices.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-charcoal-500/10 text-[9px] font-medium text-charcoal-400">{i + 1}</span>
                      <span className="text-sm text-white/70">{s.item_name}</span>
                      <span className="text-xs text-white/20">×{s.qty}</span>
                    </div>
                    <span className="text-sm font-medium text-white/50">{fmt(s.revenue)}</span>
                  </div>
                ))}
                {report.topServices.length === 0 && <p className="text-sm text-white/15 text-center py-4">Sin datos</p>}
              </div>
            </div>
          </div>

          {/* By type */}
          <div className="glass-card p-5">
            <h3 className="mb-4 text-[13px] font-medium text-white/50">Desglose por Tipo</h3>
            <div className="grid grid-cols-3 gap-4">
              {report.byType.map(t => (
                <div key={t.sale_type} className="rounded-xl bg-white/[0.03] p-4 text-center">
                  <p className="text-xs text-white/30 capitalize">{t.sale_type === "product" ? "Productos" : t.sale_type === "service" ? "Servicios" : "Mixto"}</p>
                  <p className="mt-1 text-lg font-bold text-white">{fmt(t.total)}</p>
                  <p className="text-xs text-white/20">{t.count} ventas</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === "sales" && (
        <div className="overflow-hidden glass-card !rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">#</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Fecha</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Tipo</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Pago</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Total</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Pagó</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Cambio</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Cajero</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-white/40">{s.id}</td>
                    <td className="px-5 py-3 text-white/60">{new Date(s.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.sale_type === "product" ? "bg-primary-500/10 text-primary-300" : s.sale_type === "service" ? "bg-charcoal-400/10 text-charcoal-400" : "bg-accent-500/10 text-accent-400"}`}>
                        {s.sale_type === "product" ? "Producto" : s.sale_type === "service" ? "Servicio" : "Mixto"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.payment_method === "cash" ? "bg-primary-500/10 text-primary-400" : "bg-accent-500/10 text-accent-400"}`}>
                        {s.payment_method === "cash" ? "Efectivo" : "Tarjeta"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-white/80">{fmt(s.total)}</td>
                    <td className="px-5 py-3 text-right text-white/40">{fmt(s.amount_paid)}</td>
                    <td className="px-5 py-3 text-right text-white/40">{s.change_given > 0 ? fmt(s.change_given) : "—"}</td>
                    <td className="px-5 py-3 text-white/40">{s.user_name}</td>
                  </tr>
                ))}
                {sales.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-white/20">Sin ventas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "cash" && <CashRegisters />}
    </div>
  );
}

function CashRegisters() {
  const [registers, setRegisters] = useState<{ id: number; user_name: string; opening_amount: number; closing_amount: number; expected_amount: number; status: string; opened_at: string; closed_at: string }[]>([]);

  useEffect(() => {
    fetch("/api/cash-register").then(r => r.json()).then(setRegisters).catch(() => {});
  }, []);

  const fmt = (n: number) => n != null ? `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—";

  return (
    <div className="overflow-hidden glass-card !rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Cajero</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Apertura</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Monto Inicial</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Esperado</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Cierre</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Diferencia</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {registers.map(r => {
              const diff = r.closing_amount != null && r.expected_amount != null ? r.closing_amount - r.expected_amount : null;
              return (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-white/60">{r.user_name}</td>
                  <td className="px-5 py-3 text-white/40">{new Date(r.opened_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-5 py-3 text-right text-white/50">{fmt(r.opening_amount)}</td>
                  <td className="px-5 py-3 text-right text-white/50">{fmt(r.expected_amount)}</td>
                  <td className="px-5 py-3 text-right text-white/50">{fmt(r.closing_amount)}</td>
                  <td className="px-5 py-3 text-right">
                    {diff !== null ? (
                      <span className={diff >= 0 ? "text-primary-400" : "text-red-400"}>{diff >= 0 ? "+" : ""}{fmt(diff)}</span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "open" ? "bg-primary-500/10 text-primary-400" : "bg-white/[0.06] text-white/40"}`}>
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
  );
}
