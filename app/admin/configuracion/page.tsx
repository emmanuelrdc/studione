"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PosSettings } from "@/lib/types";

interface GalleryImage {
  id: number;
  url: string;
  alt: string | null;
  sort_order: number;
}

type Status = "idle" | "saving" | "saved" | "error";

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-white" : "bg-white/[0.08]"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full transition-transform duration-200 ${
          checked ? "translate-x-[22px] bg-neutral-900" : "translate-x-0.5 bg-white/60"
        }`}
      />
    </button>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-white/80">{title}</p>
        {description && <p className="mt-1 text-[11px] text-white/30 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">{label}</p>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </section>
  );
}

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [draft, setDraft] = useState<PosSettings | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar las preferencias");
      const data = (await res.json()) as PosSettings;
      setSettings(data);
      setDraft(data);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Error de carga");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty =
    !!settings &&
    !!draft &&
    (Object.keys(draft) as (keyof PosSettings)[]).some(
      (k) => draft[k] !== settings[k]
    );

  const update = <K extends keyof PosSettings>(key: K, value: PosSettings[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (status === "saved") setStatus("idle");
  };

  const save = async () => {
    if (!draft || !dirty) return;
    setStatus("saving");
    setErrorMsg(null);
    try {
      const payload: Partial<PosSettings> = {
        theme: draft.theme,
        allow_discounts: draft.allow_discounts,
        allow_promotions: draft.allow_promotions,
        show_clients_panel: draft.show_clients_panel,
        birthday_discount_enabled: draft.birthday_discount_enabled,
        birthday_discount_percent: draft.birthday_discount_percent,
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al guardar");
      setSettings(data as PosSettings);
      setDraft(data as PosSettings);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2200);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Error desconocido");
    }
  };

  // ── Gallery state ──────────────────────────────────────────────────────────
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const res = await fetch("/api/gallery");
      if (res.ok) setGallery(await res.json());
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const MAX_SIZE = 5 * 1024 * 1024;

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected after deletion
    e.target.value = "";

    if (!ALLOWED_TYPES.includes(file.type)) {
      setGalleryError("Solo se permiten imágenes JPG, PNG, WebP o AVIF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setGalleryError("El archivo excede el límite de 5 MB.");
      return;
    }

    setGalleryError(null);
    setGalleryUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        setGalleryError(uploadData.error || "Error al subir la imagen.");
        return;
      }
      const createRes = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadData.url, alt: null }),
      });
      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({}));
        setGalleryError(d.error || "Error al guardar la imagen.");
        return;
      }
      await loadGallery();
    } catch {
      setGalleryError("Error de conexión. Intenta de nuevo.");
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleDeleteImage = async (img: GalleryImage) => {
    if (!confirm(`¿Eliminar esta foto de la galería?\nEsta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/gallery/${img.id}`, { method: "DELETE" });
    if (res.ok) {
      setGallery(g => g.filter(i => i.id !== img.id));
    } else {
      const d = await res.json().catch(() => ({}));
      setGalleryError(d.error || "Error al eliminar la imagen.");
    }
  };

  const handleDrop = async (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const dragged = gallery.find(i => i.id === dragId);
    const target = gallery.find(i => i.id === targetId);
    if (!dragged || !target) return;

    // Optimistic UI update: swap sort_order in local state
    setGallery(g => g.map(i => {
      if (i.id === dragId) return { ...i, sort_order: target.sort_order };
      if (i.id === targetId) return { ...i, sort_order: dragged.sort_order };
      return i;
    }).sort((a, b) => a.sort_order - b.sort_order));

    // Persist both changes
    await Promise.all([
      fetch(`/api/gallery/${dragId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: target.sort_order }) }),
      fetch(`/api/gallery/${targetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: dragged.sort_order }) }),
    ]);
  };

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight text-white">Configuración</h1>
        <p className="mt-2 text-sm text-white/30">
          Ajusta el comportamiento del punto de venta y las preferencias del módulo.
        </p>
      </div>

      <div className="space-y-4">
        {/* Apariencia */}
        <Section label="Apariencia">
          <div className="py-4">
            <p className="text-[13px] font-medium text-white/80">Tema del punto de venta</p>
            <p className="mt-1 text-[11px] text-white/30">Cambia la apariencia general del POS.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["dark", "light"] as const).map((t) => {
                const active = draft.theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("theme", t)}
                    className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                      active
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`mb-3 h-16 rounded-lg ${
                        t === "dark"
                          ? "bg-gradient-to-br from-neutral-900 to-neutral-800 border border-white/[0.04]"
                          : "bg-gradient-to-br from-neutral-50 to-white border border-neutral-200"
                      }`}
                    >
                      <div className="flex h-full items-end gap-1 p-2">
                        <div className={`h-1.5 w-8 rounded-full ${t === "dark" ? "bg-white/30" : "bg-neutral-300"}`} />
                        <div className={`h-1.5 w-5 rounded-full ${t === "dark" ? "bg-white/15" : "bg-neutral-200"}`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] font-medium ${active ? "text-white/90" : "text-white/50"}`}>
                        {t === "dark" ? "Oscuro" : "Claro"}
                      </span>
                      {active && (
                        <svg className="h-3.5 w-3.5 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Ventas */}
        <Section label="Ventas">
          <Row
            title="Permitir descuentos manuales"
            description="Habilita la opción de aplicar un porcentaje de descuento por artículo en el carrito."
          >
            <Toggle
              checked={draft.allow_discounts === 1}
              onChange={(v) => update("allow_discounts", v ? 1 : 0)}
            />
          </Row>
          <Row
            title="Permitir promociones"
            description={
              <>
                Aplica descuentos configurados en{" "}
                <Link href="/admin/promociones" className="text-accent-400 hover:underline">
                  Promociones →
                </Link>{" "}
                al cobrar en el POS.
              </>
            }
          >
            <Toggle
              checked={draft.allow_promotions === 1}
              onChange={(v) => update("allow_promotions", v ? 1 : 0)}
            />
          </Row>
        </Section>

        {/* Clientes */}
        <Section label="Clientes">
          <Row
            title="Mostrar panel de clientes en el POS"
            description="Permite asociar un cliente al cobrar una venta."
          >
            <Toggle
              checked={draft.show_clients_panel === 1}
              onChange={(v) => update("show_clients_panel", v ? 1 : 0)}
            />
          </Row>
          <Row
            title="Descuento por cumpleaños"
            description="Aplica un descuento automático cuando el cliente seleccionado cumple años hoy."
          >
            <Toggle
              checked={draft.birthday_discount_enabled === 1}
              onChange={(v) => update("birthday_discount_enabled", v ? 1 : 0)}
              disabled={draft.show_clients_panel === 0}
            />
          </Row>
          {draft.birthday_discount_enabled === 1 && draft.show_clients_panel === 1 && (
            <div className="py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/25">Porcentaje de descuento</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative w-32">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={draft.birthday_discount_percent}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      update("birthday_discount_percent", Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0)));
                    }}
                    className="glass-input w-full py-2.5 pl-4 pr-9 text-sm text-white"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">%</span>
                </div>
                <p className="text-[11px] text-white/25">Entre 0 y 100.</p>
              </div>
            </div>
          )}
        </Section>

        {/* ── Galería Pública ────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6">
          <div className="mb-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Galería Pública</p>
            <p className="mt-1.5 text-[11px] text-white/30 leading-relaxed">
              Las fotos que subas aquí aparecen en la página de inicio. Arrastra para cambiar el orden.
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={galleryFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleGalleryUpload}
            className="hidden"
          />

          {/* Skeleton while loading */}
          {galleryLoading ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {gallery.map(img => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragId(img.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  onDragOver={e => { e.preventDefault(); setDragOverId(img.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={() => { handleDrop(img.id); setDragOverId(null); }}
                  className={`group relative aspect-square cursor-grab overflow-hidden rounded-xl border transition-all duration-200 ${
                    dragId === img.id
                      ? "opacity-40 scale-95"
                      : dragOverId === img.id
                        ? "border-primary-400/50 ring-1 ring-primary-400/30 scale-105"
                        : "border-white/[0.06]"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? "Foto de galería"}
                    fill
                    className="object-cover"
                    sizes="120px"
                    draggable={false}
                  />

                  {/* Hover actions — visible on hover */}
                  <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Drag handle */}
                    <div className="self-start rounded-md bg-black/60 p-1 cursor-grab">
                      <svg className="h-3 w-3 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-7 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-7 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
                      </svg>
                    </div>
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img)}
                      className="self-end rounded-md bg-red-500/80 p-1 transition-colors hover:bg-red-500"
                      title="Eliminar foto"
                    >
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload card */}
              {galleryUploading ? (
                <div className="aspect-square rounded-xl border border-dashed border-white/[0.10] bg-white/[0.02] flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/50" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setGalleryError(null); galleryFileRef.current?.click(); }}
                  className="aspect-square rounded-xl border border-dashed border-white/[0.10] bg-white/[0.02] text-white/20 transition-all duration-200 hover:border-primary-400/30 hover:bg-primary-500/[0.04] hover:text-primary-400/50 flex flex-col items-center justify-center gap-1"
                  title="Subir foto"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-[9px] font-medium uppercase tracking-wider">Subir</span>
                </button>
              )}
            </div>
          )}

          {/* Error + hints */}
          <div className="mt-3 space-y-1">
            {galleryError && (
              <p className="flex items-center gap-1.5 text-[11px] text-red-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {galleryError}
              </p>
            )}
            <p className="text-[10px] text-white/20">
              JPG, PNG, WebP, AVIF · Máx 5 MB · Los cambios se reflejan en la página de inicio inmediatamente.
            </p>
          </div>
        </section>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-4 mt-8 flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-neutral-950/80 px-5 py-3 backdrop-blur-xl">
        <div className="min-w-0 flex-1 text-[11px]">
          {status === "saving" && <span className="text-white/40">Guardando...</span>}
          {status === "saved" && (
            <span className="flex items-center gap-1.5 text-emerald-400/80">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Cambios guardados
            </span>
          )}
          {status === "error" && <span className="text-red-400/80">{errorMsg || "Error al guardar"}</span>}
          {status === "idle" && (
            <span className="text-white/25">
              {dirty ? "Cambios sin guardar" : "Todo al día"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => settings && setDraft(settings)}
            disabled={!dirty || status === "saving"}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-30 disabled:pointer-events-none"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || status === "saving"}
            className="rounded-lg bg-white px-5 py-2 text-[12px] font-medium text-neutral-900 transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
