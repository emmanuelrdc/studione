"use client";

import { useState, useEffect, useCallback } from "react";

interface Brand {
  id: number;
  name: string;
  description: string | null;
  active: number;
  created_at: string;
}

const emptyBrand = { name: "", description: "" };

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState(emptyBrand);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/brands");
    if (res.ok) setBrands(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `/api/brands/${editing.id}` : "/api/brands";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setForm(emptyBrand);
        load();
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Desactivar esta marca? Los productos asociados no se eliminarán.")) return;
    await fetch(`/api/brands/${id}`, { method: "DELETE" });
    load();
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ name: b.name, description: b.description || "" });
    setShowForm(true);
  };

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Marcas</h1>
          <p className="mt-1 text-sm text-white/35">Administra las marcas de productos</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyBrand); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          + Nueva Marca
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar marca..."
          className="w-full rounded-xl glass-input py-2.5 pl-10 pr-4 text-sm placeholder:text-white/20 outline-none" />
      </div>

      {/* Brands grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <div key={b.id} className="glass-card !rounded-2xl p-5 flex flex-col gap-3 transition-all hover:bg-white/[0.04]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white/85 truncate">{b.name}</h3>
                  <p className="text-[11px] text-white/25 mt-0.5">
                    {new Date(b.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
            {b.description ? (
              <p className="text-xs text-white/40 line-clamp-2">{b.description}</p>
            ) : (
              <p className="text-xs text-white/15 italic">Sin descripción</p>
            )}
            <div className="mt-auto flex gap-2 pt-2 border-t border-white/[0.04]">
              <button onClick={() => openEdit(b)} className="flex-1 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-medium text-accent-400 transition-all hover:bg-accent-500/10">
                Editar
              </button>
              <button onClick={() => handleDelete(b.id)} className="flex-1 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10">
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/10 mb-4">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <p className="text-sm text-white/20">{search ? "No se encontraron marcas" : "Sin marcas registradas"}</p>
            {!search && <p className="text-xs text-white/10 mt-1">Agrega la primera marca con el botón de arriba</p>}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="w-full max-w-md glass-modal animate-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{editing ? "Editar" : "Nueva"} Marca</h2>
                <p className="mt-0.5 text-xs text-white/30">{editing ? "Modifica la información de la marca" : "Agrega una nueva marca al catálogo"}</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-all hover:bg-white/[0.1] hover:text-white/70">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 pb-2 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Nombre <span className="text-primary-400/60">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre de la marca" className="glass-input w-full px-4 py-2.5 text-sm" autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Descripción de la marca (opcional)" className="glass-input w-full px-4 py-2.5 text-sm resize-none" />
              </div>
            </div>
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3 mt-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary py-3 text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 btn-primary py-3 text-sm">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
