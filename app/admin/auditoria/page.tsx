"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  status: "success" | "denied" | "error";
  details: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface ApiResult {
  data: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_STYLE: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400",
  denied: "bg-red-500/10 text-red-400",
  error: "bg-yellow-500/10 text-yellow-400",
};

const STATUS_LABEL: Record<string, string> = {
  success: "Éxito",
  denied: "Rechazado",
  error: "Error",
};

export default function AuditoriaPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Filters
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  // Client-side guard (cosmetic — the API enforces admin-only server-side).
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role === "admin") {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          router.replace("/admin");
        }
      })
      .catch(() => {
        setAuthorized(false);
        router.replace("/admin");
      });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("limit", "50");
      if (action) qs.set("action", action);
      if (status) qs.set("status", status);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/audit-logs?${qs.toString()}`);
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }, [page, action, status, from, to]);

  useEffect(() => {
    if (authorized) load();
  }, [authorized, load]);

  // Reset to page 1 whenever a filter changes (set alongside the filter, not in an effect).
  const onFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const fmtDetails = (raw: string | null): string => {
    if (!raw) return "—";
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  if (authorized === null) {
    return <div className="p-8 text-sm text-white/30">Verificando acceso…</div>;
  }
  if (authorized === false) {
    return <div className="p-8 text-sm text-white/30">Redirigiendo…</div>;
  }

  return (
    <div className="p-5 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Auditoría</h1>
        <p className="mt-1 text-sm text-white/35">Registro de acciones que modifican el sistema — quién, qué y cuándo</p>
      </div>

      {/* Filters */}
      <div className="glass-card !rounded-2xl p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">Acción</label>
          <input
            value={action}
            onChange={(e) => onFilter(setAction)(e.target.value)}
            placeholder="ej. sale.cancel"
            className="glass-input w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">Estado</label>
          <select value={status} onChange={(e) => onFilter(setStatus)(e.target.value)} className="glass-input w-full px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="success">Éxito</option>
            <option value="denied">Rechazado</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">Desde</label>
          <input type="date" value={from} onChange={(e) => onFilter(setFrom)(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">Hasta</label>
          <input type="date" value={to} onChange={(e) => onFilter(setTo)(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden glass-card !rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Fecha</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Usuario</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Acción</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Entidad</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Estado</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {result?.data.map((log) => (
                <Fragment key={log.id}>
                  <tr
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                      {new Date(log.created_at + "Z").toLocaleString("es-MX")}
                    </td>
                    <td className="px-4 py-3 text-white/70">{log.user_name ?? <span className="text-white/25">anónimo</span>}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-white/70">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {log.entity_type ? `${log.entity_type}${log.entity_id != null ? ` #${log.entity_id}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[log.status] ?? "bg-white/10 text-white/50"}`}>
                        {STATUS_LABEL[log.status] ?? log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs font-mono">{log.ip ?? "—"}</td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="bg-black/20">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="text-[11px] text-white/40">
                          <p className="mb-1"><span className="text-white/25">Email:</span> {log.user_email ?? "—"}</p>
                          <p className="mb-1 break-all"><span className="text-white/25">User-Agent:</span> {log.user_agent ?? "—"}</p>
                          <span className="text-white/25">Detalles:</span>
                          <pre className="mt-1 overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-[11px] text-white/60">{fmtDetails(log.details)}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {result && result.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/20">
                    {loading ? "Cargando…" : "Sin registros para los filtros seleccionados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {result && result.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/30">
            {result.total} registros · página {result.page} de {result.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn-secondary px-4 py-2 text-xs disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(result.pages, p + 1))}
              disabled={page >= result.pages || loading}
              className="btn-secondary px-4 py-2 text-xs disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
