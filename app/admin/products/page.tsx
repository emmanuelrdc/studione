"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface Product { id: number; name: string; description: string; brand_id: number | null; brand_name: string | null; stock_sales: number; stock_internal: number; price: number; cost: number; image: string | null; category_id: number; category_name: string; product_type: string; active: number; }
interface Category { id: number; name: string; }
interface Brand { id: number; name: string; description: string | null; }

const emptyProduct = { name: "", description: "", brand_id: 0, stock_sales: 0, stock_internal: 0, price: 0, cost: 0, category_id: 0, image: "", product_type: "both" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [transferTo, setTransferTo] = useState<"sales" | "internal">("internal");
  const [transferAmount, setTransferAmount] = useState(1);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });
  const [savingBrand, setSavingBrand] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [p, c, b] = await Promise.all([fetch("/api/products"), fetch("/api/categories?type=product"), fetch("/api/brands")]);
    setProducts(await p.json());
    setCategories(await c.json());
    setBrands(await b.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowForm(false);
      setEditing(null);
      setForm(emptyProduct);
      setImagePreview(null);
      load();
    } finally { setSaving(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm(prev => ({ ...prev, image: data.url }));
        setImagePreview(data.url);
      }
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Desactivar este producto?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", brand_id: p.brand_id || 0, stock_sales: p.stock_sales, stock_internal: p.stock_internal, price: p.price, cost: p.cost, category_id: p.category_id || 0, image: p.image || "", product_type: p.product_type || "both" });
    setImagePreview(p.image || null);
    setShowBrandForm(false);
    setShowForm(true);
  };

  const handleSaveBrand = async () => {
    if (!brandForm.name.trim()) return;
    setSavingBrand(true);
    try {
      const res = await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brandForm) });
      if (res.ok) {
        const newBrand = await res.json();
        const bRes = await fetch("/api/brands");
        setBrands(await bRes.json());
        setForm(prev => ({ ...prev, brand_id: newBrand.id }));
        setBrandForm({ name: "", description: "" });
        setShowBrandForm(false);
      }
    } finally { setSavingBrand(false); }
  };

  const handleTransfer = async () => {
    if (!transferProduct || transferAmount <= 0) return;
    await fetch(`/api/products/${transferProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transfer_to: transferTo, transfer_amount: transferAmount }),
    });
    setTransferProduct(null);
    setTransferAmount(1);
    load();
  };

  const filtered = products.filter(p => p.active && (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand_name?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-white/35">Administra tu inventario</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyProduct); setImagePreview(null); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          + Nuevo Producto
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o marca..."
          className="w-full rounded-xl glass-input py-2.5 pl-10 pr-4 text-sm placeholder:text-white/20 outline-none" />
      </div>

      {/* Products table */}
      <div className="overflow-hidden glass-card !rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Imagen</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Producto</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Marca</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Tipo</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Categoría</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">St. Ventas</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">St. Interno</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Costo</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Precio</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-2">
                    {p.image ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-white/[0.08]">
                        <Image src={p.image} alt={p.name} fill className="object-cover" sizes="40px" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/10">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.375 21h17.25c.621 0 1.125-.504 1.125-1.125V4.125C21.75 3.504 21.246 3 20.625 3H3.375C2.754 3 2.25 3.504 2.25 4.125v15.75C2.25 20.496 2.754 21 3.375 21Z" /></svg>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white/80">{p.name}</td>
                  <td className="px-5 py-3.5 text-white/40">{p.brand_name || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.product_type === "sell" ? "bg-blue-500/10 text-blue-400" :
                      p.product_type === "internal" ? "bg-amber-500/10 text-amber-400" :
                      "bg-primary-500/10 text-primary-400"
                    }`}>
                      {p.product_type === "sell" ? "Venta" : p.product_type === "internal" ? "Interno" : "Ambos"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/40">{p.category_name || "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    {p.product_type === "sell" || p.product_type === "both" ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.stock_sales <= 2 ? "bg-red-500/10 text-red-400" : "bg-primary-500/10 text-primary-400"}`}>{p.stock_sales}</span>
                    ) : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {p.product_type === "internal" || p.product_type === "both" ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.stock_internal <= 2 ? "bg-red-500/10 text-red-400" : "bg-primary-500/10 text-primary-400"}`}>{p.stock_internal}</span>
                    ) : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right text-white/40">${p.cost.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-white/80">${p.price.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {p.product_type === "both" && <button onClick={() => { setTransferProduct(p); setTransferTo("internal"); setTransferAmount(1); }} className="mr-1 rounded-lg px-2 py-1 text-xs text-primary-400 hover:bg-primary-500/10">Transferir</button>}
                    <button onClick={() => openEdit(p)} className="mr-1 rounded-lg px-2 py-1 text-xs text-accent-400 hover:bg-accent-500/10">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">Eliminar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-white/20">Sin productos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="w-full max-w-lg glass-modal animate-modal flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{editing ? "Editar" : "Nuevo"} Producto</h2>
                <p className="mt-0.5 text-xs text-white/30">Completa la información del producto</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-all hover:bg-white/[0.1] hover:text-white/70">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-7 pb-2 space-y-5">
              {/* Image Upload — prominent area */}
              <div className="flex items-center gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                {imagePreview ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.08]">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="80px" />
                    <button onClick={() => { setImagePreview(null); setForm(f => ({ ...f, image: "" })); }} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.03] text-white/20 transition-all hover:border-primary-400/30 hover:bg-primary-500/[0.04] hover:text-primary-400/50">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleImageUpload} className="hidden" />
                  <p className="text-sm font-medium text-white/70">{imagePreview ? "Imagen cargada" : "Imagen del producto"}</p>
                  <p className="mt-0.5 text-[11px] text-white/25">JPG, PNG, WebP · Máx 5MB</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/50 transition-all hover:bg-white/[0.1] hover:text-white/70 disabled:opacity-30">
                    {uploading ? "Subiendo..." : imagePreview ? "Cambiar" : "Subir imagen"}
                  </button>
                </div>
              </div>

              {/* Product info section */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Información</p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Nombre <span className="text-primary-400/60">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del producto" className="glass-input w-full px-4 py-2.5 text-sm" />
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Marca</label>
                    <div className="flex gap-2">
                      <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: Number(e.target.value) })} className="glass-input flex-1 px-4 py-2.5 text-sm [&>option]:bg-neutral-900 [&>option]:text-white">
                        <option value={0}>Sin marca</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowBrandForm(!showBrandForm)} className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm transition-all ${showBrandForm ? "border-accent-400/30 bg-accent-500/10 text-accent-400" : "border-white/[0.08] bg-white/[0.04] text-white/40 hover:text-white/60"}`} title="Nueva marca">
                        +
                      </button>
                    </div>
                    {showBrandForm && (
                      <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                        <input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="Nombre de la marca" className="glass-input w-full px-3 py-2 text-xs" />
                        <input value={brandForm.description} onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })} placeholder="Descripción (opcional)" className="glass-input w-full px-3 py-2 text-xs" />
                        <button onClick={handleSaveBrand} disabled={savingBrand || !brandForm.name.trim()} className="w-full rounded-lg bg-accent-500 py-1.5 text-xs font-medium text-white hover:bg-accent-600 disabled:opacity-30 transition-all">
                          {savingBrand ? "Guardando..." : "Guardar Marca"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Categoría</label>
                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })} className="glass-input w-full px-4 py-2.5 text-sm [&>option]:bg-neutral-900 [&>option]:text-white">
                      <option value={0}>Sin categoría</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Descripción</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Descripción breve del producto" className="glass-input w-full px-4 py-2.5 text-sm resize-none" />
                </div>
              </div>

              {/* Pricing section */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Precio</p>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Precio de venta <span className="text-primary-400/60">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-white/25">$</span>
                      <input type="number" step="0.01" value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="glass-input w-full pl-7 pr-4 py-2.5 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Costo</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-white/25">$</span>
                      <input type="number" step="0.01" value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="glass-input w-full pl-7 pr-4 py-2.5 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock section */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Inventario</p>

                {/* Product type segmented control */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/40">Tipo de producto</label>
                  <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                    {([
                      { value: "sell", label: "Vender", icon: "🏷️" },
                      { value: "internal", label: "Consumo Interno", icon: "🧴" },
                      { value: "both", label: "Ambos", icon: "📦" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const updates: Partial<typeof form> = { product_type: opt.value };
                          if (opt.value === "sell") updates.stock_internal = 0;
                          if (opt.value === "internal") updates.stock_sales = 0;
                          setForm(prev => ({ ...prev, ...updates }));
                        }}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          form.product_type === opt.value
                            ? "bg-white/[0.1] text-white shadow-sm"
                            : "text-white/35 hover:text-white/55"
                        }`}
                      >
                        <span className="mr-1">{opt.icon}</span>{opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  {(form.product_type === "sell" || form.product_type === "both") && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/40">Stock Ventas</label>
                      <input type="number" value={form.stock_sales || ""} onChange={(e) => setForm({ ...form, stock_sales: parseInt(e.target.value) || 0 })} placeholder="0" className="glass-input w-full px-4 py-2.5 text-sm" />
                    </div>
                  )}
                  {(form.product_type === "internal" || form.product_type === "both") && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/40">Stock Interno</label>
                      <input type="number" value={form.stock_internal || ""} onChange={(e) => setForm({ ...form, stock_internal: parseInt(e.target.value) || 0 })} placeholder="0" className="glass-input w-full px-4 py-2.5 text-sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer buttons — sticky */}
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 btn-secondary py-3 text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="flex-1 btn-primary py-3 text-sm">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="w-full max-w-sm glass-modal p-7 animate-modal">
            <h2 className="mb-2 text-lg font-semibold text-white">Transferir Stock</h2>
            <p className="mb-5 text-sm text-white/40">{transferProduct.name}</p>
            <div className="mb-4 flex gap-3 rounded-xl bg-white/[0.03] p-3">
              <div className="flex-1 text-center">
                <p className="text-xs text-white/30">Ventas</p>
                <p className="text-lg font-bold text-primary-400">{transferProduct.stock_sales}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-white/30">Interno</p>
                <p className="text-lg font-bold text-accent-400">{transferProduct.stock_internal}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-white/40 uppercase tracking-wider">Dirección</label>
                <select value={transferTo} onChange={(e) => setTransferTo(e.target.value as "sales" | "internal")} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none [&>option]:bg-[#18181b]">
                  <option value="internal">Ventas → Interno</option>
                  <option value="sales">Interno → Ventas</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-white/40 uppercase tracking-wider">Cantidad</label>
                <input type="number" min={1} max={transferTo === "internal" ? transferProduct.stock_sales : transferProduct.stock_internal} value={transferAmount} onChange={(e) => setTransferAmount(parseInt(e.target.value) || 0)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setTransferProduct(null)} className="flex-1 btn-secondary py-3 text-sm">Cancelar</button>
              <button onClick={handleTransfer} disabled={transferAmount <= 0} className="flex-1 btn-primary py-3 text-sm">Transferir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
