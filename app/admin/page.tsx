"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportData {
  summary: { total_sales: number; total_revenue: number; cash_total: number; card_total: number; avg_sale: number };
  topProducts: { item_name: string; qty: number; revenue: number }[];
  topServices: { item_name: string; qty: number; revenue: number }[];
  dailySales: { date: string; count: number; total: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState("today");

  useEffect(() => {
    fetch(`/api/sales/reports?period=${period}`).then(r => r.json()).then(setData).catch(() => {});
  }, [period]);

  const stats = data ? [
    { label: "Ventas", value: data.summary.total_sales.toString(), sub: "transacciones" },
    { label: "Ingresos", value: `$${data.summary.total_revenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, sub: "total" },
    { label: "Efectivo", value: `$${data.summary.cash_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, sub: "en efectivo" },
    { label: "Tarjeta", value: `$${data.summary.card_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, sub: "en tarjeta" },
  ] : [];

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-white/35">Resumen general de tu negocio</p>
        </div>
        <div className="flex gap-0.5 rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
          {[{ key: "today", label: "Hoy" }, { key: "week", label: "Semana" }, { key: "month", label: "Mes" }].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${period === p.key ? "bg-primary-500/15 text-primary-400" : "text-white/35 hover:text-white/55"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white/90 tracking-tight">{stat.value}</p>
            <p className="mt-1 text-[11px] text-white/25">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts area */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="mb-4 text-[13px] font-medium text-white/50">Ventas últimos 14 días</h3>
          <div className="flex items-end gap-[3px] h-36">
            {(data?.dailySales || []).slice(-14).map((d, i) => {
              const max = Math.max(...(data?.dailySales || []).map(s => s.total), 1);
              const height = (d.total / max) * 100;
              return (
                <div key={i} className="group relative flex-1 flex flex-col items-center justify-end">
                  <div className="absolute -top-8 hidden group-hover:block rounded-lg bg-white/[0.08] backdrop-blur-sm px-2 py-1 text-[10px] text-white/70 whitespace-nowrap z-10 border border-white/[0.06]">
                    ${d.total.toFixed(0)} · {d.date.slice(5)}
                  </div>
                  <div
                    className="w-full rounded-sm bg-gradient-to-t from-primary-500/50 to-primary-400/30 transition-all duration-300 hover:from-primary-400/70 hover:to-primary-300/50 min-h-[2px]"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          {(!data?.dailySales || data.dailySales.length === 0) && (
            <div className="flex h-36 items-center justify-center text-sm text-white/15">Sin datos aún</div>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-4 text-[13px] font-medium text-white/50">Top Productos & Servicios</h3>
          <div className="space-y-2.5 max-h-36 overflow-y-auto">
            {[...(data?.topProducts || []), ...(data?.topServices || [])].slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-500/10 text-[9px] font-medium text-primary-400">{i + 1}</span>
                  <span className="text-[13px] text-white/60">{item.item_name}</span>
                </div>
                <span className="text-[13px] font-medium text-white/40">${item.revenue.toFixed(2)}</span>
              </div>
            ))}
            {(!data?.topProducts?.length && !data?.topServices?.length) && (
              <p className="text-sm text-white/15 text-center py-8">Sin datos aún</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { href: "/admin/pos", label: "Abrir Caja", desc: "Iniciar punto de venta", icon: "💳" },
          { href: "/admin/calendar", label: "Ver Citas", desc: "Calendario de hoy", icon: "📅" },
          { href: "/admin/products", label: "Inventario", desc: "Gestionar productos", icon: "📦" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group glass-card p-5 hover:border-primary-500/15"
          >
            <span className="text-2xl">{action.icon}</span>
            <p className="mt-3 text-[13px] font-semibold text-white/80">{action.label}</p>
            <p className="mt-0.5 text-[11px] text-white/30">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
