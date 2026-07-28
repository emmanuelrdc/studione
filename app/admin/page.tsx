"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface ReportData {
  summary: { total_sales: number; total_revenue: number; cash_total: number; card_total: number; avg_sale: number };
  topProducts: { item_name: string; qty: number; revenue: number }[];
  topServices: { item_name: string; qty: number; revenue: number }[];
  dailySales: { date: string; count: number; total: number }[];
}

const statIcons: Record<string, React.ReactNode> = {
  Ventas: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
  ),
  Ingresos: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
  ),
  Efectivo: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
  ),
  Tarjeta: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
  ),
};

const quickActions = [
  {
    href: "/admin/pos",
    label: "Abrir Caja",
    desc: "Iniciar punto de venta",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    ),
  },
  {
    href: "/admin/calendar",
    label: "Ver Citas",
    desc: "Calendario de hoy",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    ),
  },
  {
    href: "/admin/products",
    label: "Inventario",
    desc: "Gestionar productos",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    ),
  },
];

export default function AdminDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState("today");
  const reduce = useReducedMotion();
  // Skeletons show on the very first load; period switches keep prior data visible (no flash).
  const loading = !data;

  useEffect(() => {
    let active = true;
    fetch(`/api/sales/reports?period=${period}`)
      .then(r => r.json())
      .then(d => { if (active) setData(d); })
      .catch(() => {});
    return () => { active = false; };
  }, [period]);

  const stats = data ? [
    { label: "Ventas", value: data.summary.total_sales.toString(), sub: "transacciones" },
    { label: "Ingresos", value: `$${data.summary.total_revenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, sub: "total" },
    { label: "Efectivo", value: `$${data.summary.cash_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, sub: "en efectivo" },
    { label: "Tarjeta", value: `$${data.summary.card_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, sub: "en tarjeta" },
  ] : [];

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  };

  const maxDaily = Math.max(...(data?.dailySales || []).map(s => s.total), 1);

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
              className={`press rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${period === p.key ? "bg-primary-500/15 text-primary-400 shadow-sm" : "text-white/35 hover:text-white/55"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {loading && !data
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-5">
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton mt-3 h-7 w-24 rounded" />
                <div className="skeleton mt-2 h-2.5 w-14 rounded" />
              </div>
            ))
          : stats.map((stat) => (
              <motion.div key={stat.label} variants={item} className="glass-card group p-5">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">{stat.label}</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-400 transition-colors duration-300 group-hover:bg-primary-500/20">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">{statIcons[stat.label]}</svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-white/90 tracking-tight tabular-nums">{stat.value}</p>
                <p className="mt-1 text-[11px] text-white/25">{stat.sub}</p>
              </motion.div>
            ))}
      </motion.div>

      {/* Charts area */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="mb-4 text-[13px] font-medium text-white/50">Ventas últimos 14 días</h3>
          <div className="flex items-end gap-[3px] h-36">
            {(data?.dailySales || []).slice(-14).map((d, i) => {
              const height = (d.total / maxDaily) * 100;
              return (
                <div key={i} className="group relative flex-1 flex flex-col items-center justify-end">
                  <div className="pointer-events-none absolute -top-9 z-10 hidden -translate-y-0 rounded-lg border border-white/[0.08] bg-neutral-900/90 px-2 py-1 text-[10px] text-white/80 whitespace-nowrap shadow-lg backdrop-blur-sm group-hover:block">
                    ${d.total.toFixed(0)} · {d.date.slice(5)}
                  </div>
                  <motion.div
                    initial={{ scaleY: reduce ? 1 : 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: `${Math.max(height, 2)}%`, transformOrigin: "bottom" }}
                    className="w-full rounded-t-[3px] bg-gradient-to-t from-primary-500/40 to-primary-400/70 transition-colors duration-300 hover:from-primary-500/60 hover:to-primary-300 min-h-[2px]"
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
          <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
            {[...(data?.topProducts || []), ...(data?.topServices || [])].slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-[9px] font-semibold text-primary-400 tabular-nums">{i + 1}</span>
                  <span className="truncate text-[13px] text-white/60">{item.item_name}</span>
                </div>
                <span className="shrink-0 text-[13px] font-medium text-white/40 tabular-nums">${item.revenue.toFixed(2)}</span>
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
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group glass-card glass-card-interactive flex items-center gap-4 p-5 hover:border-primary-500/20"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 transition-colors duration-300 group-hover:bg-primary-500/20">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">{action.icon}</svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/85">{action.label}</p>
              <p className="mt-0.5 text-[11px] text-white/30">{action.desc}</p>
            </div>
            <svg className="h-4 w-4 shrink-0 text-white/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary-400/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
