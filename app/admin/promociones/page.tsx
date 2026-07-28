"use client";

import { useState, useEffect, useCallback } from "react";
import type { Promotion } from "@/lib/types";

interface Item { id: number; name: string; }

const emptyForm = {
  name: "",
  type: "percent" as "percent" | "fixed",
  discount_value: "",
  target_type: "all" as "all" | "product" | "service",
  target_id: "" as number | "",
  valid_from: "",
  valid_to: "",
  active: true,
};

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function statusBadge(p: Promotion) {
  if (!p.active) return { label: "Inactiva", className: "bg-white/[0.06] text-white/40" };
  if (p.is_current) return { label: "Vigente", className: "bg-emerald-500/10 text-emerald-400" };
  const today = todayStr();
  if (p.valid_from && p.valid_from > today) return { label: "Programada", className: "bg-accent-500/10 text-accent-400" };
  if (p.valid_to && p.valid_to < today) return { label: "Expirada", className: "bg-red-500/10 text-red-400" };
  return { label: "Inactiva", className: "bg-white/[0.06] text-white/40" };
}

export default function PromocionesPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [services, setServices] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [promoRes, prodRes, servRes] = await Promise.all([
      fetch("/api/promotions"),
      fetch("/api/products?active=1"),
      fetch("/api/services"),
    ]);
    if (promoRes.ok) setPromotions(await promoRes.json());
    if (prodRes.ok) setProducts(await prodRes.json());
    if (servRes.ok) setServices(await servRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        discount_value: Number(form.discount_value),
        target_type: form.target_type,
        target_id: form.target_type === "all" ? null : Number(form.target_id),
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        ...(editing ? { active: form.active } : {}),
      };
      const url = editing ? `/api/promotions/${editing.id}` : "/api/promotions";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
        load();
      } else {
        setError(data.error || "No se pudo guardar la promoción");
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Desactivar esta promoción?")) return;
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    load();
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      name: p.name,
      type: p.type,
      discount_value: String(p.discount_value),
      target_type: p.target_type,
      target_id: p.target_id ?? "",
      valid_from: p.valid_from || "",
      valid_to: p.valid_to || "",
      active: p.active === 1,
    });
    setShowForm(true);
  };

  const targetLabel = (p: Promotion) => {
    if (p.target_type === "all") return "Todo el catálogo";
    const list = p.target_type === "product" ? products : services;
    const item = list.find(i => i.id === p.target_id);
    return item ? item.name : `${p.target_type === "product" ? "Producto" : "Servicio"} #${p.target_id}`;
  };

  const filtered = promotions.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 backdrop-blur-xl shadow-lg">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-2 text-red-400/50 hover:text-red-400">✕</button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Promociones</h1>
          <p className="mt-1 text-sm text-white/35">Descuentos por producto, servicio o todo el catálogo</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          + Nueva Promoción
        </button>
      </div>

      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar promoción..."
          className="w-full rounded-xl glass-input py-2.5 pl-10 pr-4 text-sm placeholder:text-white/20 outline-none" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const badge = statusBadge(p);
          return (
            <div key={p.id} className="glass-card !rounded-2xl p-5 flex flex-col gap-3 transition-all hover:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white/85 truncate">{p.name}</h3>
                  <p className="text-[11px] text-white/25 mt-0.5">{targetLabel(p)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
              </div>
              <p className="text-lg font-semibold text-primary-400">
                {p.type === "percent" ? `${p.discount_value}%` : `$${p.discount_value.toFixed(2)}`}
                <span className="text-xs font-normal text-white/30 ml-1">{p.type === "percent" ? "descuento" : "de descuento"}</span>
              </p>
              {(p.valid_from || p.valid_to) && (
                <p className="text-xs text-white/35">
                  {p.valid_from || "Sin inicio"} — {p.valid_to || "Sin fin"}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-2 border-t border-white/[0.04]">
                <button onClick={() => openEdit(p)} className="flex-1 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-medium text-accent-400 transition-all hover:bg-accent-500/10">
                  Editar
                </button>
                <button onClick={() => handleDelete(p.id)} className="flex-1 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10">
                  Desactivar
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-white/20">{search ? "No se encontraron promociones" : "Sin promociones registradas"}</p>
            {!search && <p className="text-xs text-white/10 mt-1">Agrega la primera promoción con el botón de arriba</p>}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="w-full max-w-md glass-modal animate-modal max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{editing ? "Editar" : "Nueva"} Promoción</h2>
                <p className="mt-0.5 text-xs text-white/30">{editing ? "Modifica la promoción" : "Crea un nuevo descuento"}</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-all hover:bg-white/[0.1] hover:text-white/70">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 pb-2 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Nombre <span className="text-primary-400/60">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Descuento de temporada" className="glass-input w-full px-4 py-2.5 text-sm" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percent" | "fixed" })} className="glass-input w-full px-4 py-2.5 text-sm">
                    <option value="percent">% Descuento</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Valor <span className="text-primary-400/60">*</span></label>
                  <input type="number" min={0} max={form.type === "percent" ? 100 : undefined} step="0.01" value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.type === "percent" ? "0-100" : "0.00"}
                    className="glass-input w-full px-4 py-2.5 text-sm" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Aplica a</label>
                <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value as "all" | "product" | "service", target_id: "" })} className="glass-input w-full px-4 py-2.5 text-sm">
                  <option value="all">Todo el catálogo</option>
                  <option value="product">Producto específico</option>
                  <option value="service">Servicio específico</option>
                </select>
              </div>

              {form.target_type !== "all" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">
                    {form.target_type === "product" ? "Producto" : "Servicio"} <span className="text-primary-400/60">*</span>
                  </label>
                  <select value={form.target_id} onChange={(e) => setForm({ ...form, target_id: Number(e.target.value) })} className="glass-input w-full px-4 py-2.5 text-sm">
                    <option value="">Selecciona...</option>
                    {(form.target_type === "product" ? products : services).map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Desde</label>
                  <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Hasta</label>
                  <input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} className="glass-input w-full px-4 py-2.5 text-sm" />
                </div>
              </div>

              {editing && (
                <label className="flex items-center gap-2 text-sm text-white/60">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded" />
                  Activa
                </label>
              )}
            </div>
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3 mt-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary py-3 text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.discount_value || (form.target_type !== "all" && !form.target_id)} className="flex-1 btn-primary py-3 text-sm">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
