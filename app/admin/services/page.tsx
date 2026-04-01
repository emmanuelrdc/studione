"use client";

import { useState, useEffect, useCallback } from "react";

interface Service { id: number; name: string; description: string; price: number; duration: number; category_id: number; category_name: string; active: number; products?: ServiceProduct[]; }
interface Category { id: number; name: string; parent_id: number | null; }
interface Product { id: number; name: string; }
interface ServiceProduct { product_id: number; product_name: string; quantity: number; }

const emptyService = { name: "", description: "", price: 0, duration: 60, category_id: 0 };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyService);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [formProducts, setFormProducts] = useState<{ product_id: number; quantity: number }[]>([]);

  const load = useCallback(async () => {
    const [s, c, p] = await Promise.all([fetch("/api/services"), fetch("/api/categories?type=service"), fetch("/api/products?active=1")]);
    setServices(await s.json());
    const cats = await c.json();
    setCategories(cats.filter((cat: Category) => !cat.parent_id));
    setSubCategories(cats.filter((cat: Category) => cat.parent_id));
    setAllProducts(await p.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const url = editing ? `/api/services/${editing.id}` : "/api/services";
      const method = editing ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, products: formProducts }) });
      setShowForm(false);
      setEditing(null);
      setForm(emptyService);
      setFormProducts([]);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Desactivar este servicio?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    load();
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", price: s.price, duration: s.duration, category_id: s.category_id || 0 });
    setFormProducts(s.products?.map(p => ({ product_id: p.product_id, quantity: p.quantity })) || []);
    setShowForm(true);
  };

  // Group services by category
  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const key = s.category_name || "Sin categoría";
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  const allCats = [...categories, ...subCategories];

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Servicios</h1>
          <p className="mt-1 text-sm text-white/35">Administra tu menú de servicios</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyService); setFormProducts([]); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          + Nuevo Servicio
        </button>
      </div>

      {/* Services by category */}
      {Object.entries(grouped).map(([catName, catServices]) => (
        <div key={catName}>
          <h3 className="mb-3 text-sm font-medium text-white/50 uppercase tracking-wider">{catName}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catServices.map((s) => (
              <div key={s.id} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white/80">{s.name}</h4>
                    {s.description && <p className="mt-1 text-xs text-white/30 line-clamp-2">{s.description}</p>}
                  </div>
                  <span className="ml-3 text-lg font-bold text-white">${s.price.toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-white/20">{s.duration} min</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="rounded-lg px-2.5 py-1 text-xs text-accent-400 hover:bg-accent-500/10">Editar</button>
                    <button onClick={() => handleDelete(s.id)} className="rounded-lg px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10">Eliminar</button>
                  </div>
                </div>
                {s.products && s.products.length > 0 && (
                  <div className="mt-2 border-t border-white/[0.04] pt-2">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Productos asociados</p>
                    {s.products.map((p, i) => (
                      <span key={i} className="mr-1 inline-block rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/40">{p.product_name} ×{p.quantity}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-white/[0.06] text-sm text-white/20">
          No hay servicios registrados
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="w-full max-w-md glass-modal animate-modal flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{editing ? "Editar" : "Nuevo"} Servicio</h2>
                <p className="mt-0.5 text-xs text-white/30">Define el servicio y sus productos asociados</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-all hover:bg-white/[0.1] hover:text-white/70">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-7 pb-2 space-y-5">
              {/* Basic info */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Información</p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Nombre <span className="text-primary-400/60">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del servicio" className="glass-input w-full px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Descripción</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Descripción breve del servicio" className="glass-input w-full px-4 py-2.5 text-sm resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Categoría</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })} className="glass-input w-full px-4 py-2.5 text-sm [&>option]:bg-neutral-900 [&>option]:text-white">
                    <option value={0}>Sin categoría</option>
                    {allCats.map(c => <option key={c.id} value={c.id}>{c.parent_id ? `  └ ${c.name}` : c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Precio y duración</p>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Precio <span className="text-primary-400/60">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-white/25">$</span>
                      <input type="number" step="0.01" value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="glass-input w-full pl-7 pr-4 py-2.5 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Duración</label>
                    <div className="relative">
                      <input type="number" value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 60 })} placeholder="60" className="glass-input w-full px-4 pr-12 py-2.5 text-sm" />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-white/25">min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product association */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Productos que consume</p>
                <div className="space-y-2">
                  {formProducts.map((fp, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <select value={fp.product_id} onChange={(e) => { const updated = [...formProducts]; updated[idx].product_id = Number(e.target.value); setFormProducts(updated); }} className="glass-input flex-1 px-3 py-1.5 text-xs [&>option]:bg-neutral-900 [&>option]:text-white">
                        <option value={0}>Seleccionar producto</option>
                        {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min={1} value={fp.quantity} onChange={(e) => { const updated = [...formProducts]; updated[idx].quantity = parseInt(e.target.value) || 1; setFormProducts(updated); }} className="glass-input w-16 px-2 py-1.5 text-xs text-center" placeholder="Cant" />
                      <button onClick={() => setFormProducts(formProducts.filter((_, i) => i !== idx))} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400/60 transition-all hover:bg-red-500/10 hover:text-red-400">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setFormProducts([...formProducts, { product_id: 0, quantity: 1 }])} className="w-full rounded-xl border border-dashed border-white/[0.1] px-3 py-2.5 text-xs text-white/40 transition-all hover:border-primary-400/30 hover:bg-primary-500/[0.04] hover:text-primary-400/60">
                  + Agregar producto
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary py-3 text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="flex-1 btn-primary py-3 text-sm">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
