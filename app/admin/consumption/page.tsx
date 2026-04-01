"use client";

import { useState, useEffect, useCallback } from "react";

interface Consumption {
  id: number;
  product_name: string;
  user_name: string;
  quantity: number;
  reason: string | null;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  brand_name: string | null;
  stock_internal: number;
  category_name: string | null;
  product_type: string;
}

export default function InternalConsumptionPage() {
  const [records, setRecords] = useState<Consumption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_id: "", quantity: 1, reason: "" });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      fetch("/api/internal-consumption"),
      fetch("/api/products?active=1"),
    ]);
    setRecords(await r.json());
    setProducts(await p.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.product_id || !form.quantity) return;
    setSaving(true);
    try {
      const res = await fetch("/api/internal-consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: parseInt(form.product_id),
          quantity: form.quantity,
          reason: form.reason || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ product_id: "", quantity: 1, reason: "" });
        load();
      }
    } finally { setSaving(false); }
  };

  const filtered = records.filter(
    (r) =>
      r.product_name.toLowerCase().includes(search.toLowerCase()) ||
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.user_name.toLowerCase().includes(search.toLowerCase())
  );

  const reasons = ["Tinte para cliente", "Producto para servicio", "Loción / tratamiento", "Uso interno general", "Muestra / degustación", "Otro"];

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Consumo Interno</h1>
          <p className="mt-1 text-sm text-white/35">Tintes, productos y lociones usados internamente</p>
        </div>
        <button
          onClick={() => { setForm({ product_id: "", quantity: 1, reason: "" }); setShowForm(true); }}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          + Registrar Consumo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass-card p-5">
          <p className="text-2xl font-bold text-white/90">{records.length}</p>
          <p className="text-[11px] text-white/30">Registros totales</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-2xl font-bold text-white/90">{records.reduce((a, r) => a + r.quantity, 0)}</p>
          <p className="text-[11px] text-white/30">Unidades consumidas</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-2xl font-bold text-white/90">
            {records.filter(r => {
              const d = new Date(r.created_at);
              const today = new Date();
              return d.toDateString() === today.toDateString();
            }).length}
          </p>
          <p className="text-[11px] text-white/30">Hoy</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-2xl font-bold text-white/90">
            {new Set(records.map(r => r.product_name)).size}
          </p>
          <p className="text-[11px] text-white/30">Productos distintos</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por producto, razón o usuario..."
          className="w-full rounded-xl glass-input py-2.5 pl-10 pr-4 text-sm placeholder:text-white/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden glass-card !rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Fecha</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Producto</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Cantidad</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Motivo</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-white/40">
                    {new Date(r.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white/80">{r.product_name}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-block rounded-full bg-accent-500/10 px-2.5 py-0.5 text-xs font-medium text-accent-400">
                      -{r.quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/40">{r.reason || "—"}</td>
                  <td className="px-5 py-3.5 text-white/40">{r.user_name}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-white/20">
                    Sin registros de consumo interno
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md glass-modal animate-modal flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Registrar Consumo</h2>
                <p className="mt-0.5 text-xs text-white/30">Descontar producto del inventario interno</p>
              </div>
              <button onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-all hover:bg-white/[0.1] hover:text-white/70">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-7 pb-2 space-y-5">
              {/* Product select */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Producto</p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Seleccionar producto <span className="text-primary-400/60">*</span></label>
                  <select
                    value={form.product_id}
                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 text-sm [&>option]:bg-neutral-900 [&>option]:text-white"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.filter(p => p.stock_internal > 0 && (p.product_type === "internal" || p.product_type === "both")).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.brand_name ? ` — ${p.brand_name}` : ""} (stock: {p.stock_internal})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Cantidad <span className="text-primary-400/60">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={form.product_id ? products.find(p => p.id === parseInt(form.product_id))?.stock_internal || 999 : 999}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="glass-input w-full px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Motivo</p>
                <div className="flex flex-wrap gap-1.5">
                  {reasons.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, reason: r })}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all border ${
                        form.reason === r
                          ? "border-primary-500/30 bg-primary-500/10 text-primary-400"
                          : "border-white/[0.06] bg-white/[0.03] text-white/40 hover:bg-white/[0.06]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="O escribe un motivo personalizado..."
                  className="glass-input w-full px-4 py-2.5 text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-3 text-sm">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.product_id || !form.quantity}
                className="flex-1 btn-primary py-3 text-sm"
              >
                {saving ? "Registrando..." : "Registrar Consumo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
