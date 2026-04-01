"use client";

import { useState, useEffect, useCallback } from "react";

interface Client {
  id: number;
  name: string;
  phone: string | null;
  birth_date: string | null;
  active: number;
  created_at: string;
}

const emptyClient = { name: "", phone: "", birth_date: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/clients");
    if (res.ok) setClients(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `/api/clients/${editing.id}` : "/api/clients";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setForm(emptyClient);
        load();
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Desactivar este cliente?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    load();
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", birth_date: c.birth_date || "" });
    setShowForm(true);
  };

  const filtered = clients.filter(c =>
    c.active && (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-white/35">Administra tu cartera de clientes</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyClient); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          + Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..."
          className="w-full rounded-xl glass-input py-2.5 pl-10 pr-4 text-sm placeholder:text-white/20 outline-none" />
      </div>

      {/* Clients table */}
      <div className="overflow-hidden glass-card !rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">Nombre</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">Teléfono</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">Fecha de Nacimiento</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">Registrado</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/30">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-white/80">{c.name}</td>
                  <td className="px-5 py-3.5 text-white/40">{c.phone || "—"}</td>
                  <td className="px-5 py-3.5 text-white/40">{formatDate(c.birth_date)}</td>
                  <td className="px-5 py-3.5 text-white/40">{new Date(c.created_at).toLocaleDateString("es-MX")}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => openEdit(c)} className="mr-1 rounded-lg px-2 py-1 text-xs text-accent-400 hover:bg-accent-500/10">Editar</button>
                    <button onClick={() => handleDelete(c.id)} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">Eliminar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-white/20">Sin clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="w-full max-w-md glass-modal animate-modal flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{editing ? "Editar" : "Nuevo"} Cliente</h2>
                <p className="mt-0.5 text-xs text-white/30">Información de contacto del cliente</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-all hover:bg-white/[0.1] hover:text-white/70">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-7 pb-2 space-y-5">
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Datos personales</p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Nombre completo <span className="text-primary-400/60">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del cliente" className="glass-input w-full px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Teléfono</label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Número de teléfono" className="glass-input w-full pl-10 pr-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Fecha de nacimiento</label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="glass-input w-full pl-10 pr-4 py-2.5 text-sm [color-scheme:dark]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3">
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
