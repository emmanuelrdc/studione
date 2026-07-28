"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  active: number;
  created_at: string;
}

const emptyForm = { name: "", email: "", role: "cashier", password: "" };

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 backdrop-blur-xl shadow-lg">
      <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <p className="text-sm text-red-300">{message}</p>
      <button onClick={onClose} className="ml-2 text-red-400/50 hover:text-red-400 transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

function SuccessBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 backdrop-blur-xl shadow-lg">
      <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-emerald-300">{message}</p>
      <button onClick={onClose} className="ml-2 text-emerald-400/50 hover:text-emerald-400 transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    if (!form.email.trim() || !form.email.includes("@")) { setError("Ingresa un email válido"); return; }
    if (!editing && (!form.password || form.password.length < 6)) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const url = editing ? `/api/users/${editing.id}` : "/api/users";
      const method = editing ? "PUT" : "POST";
      const body: Record<string, string> = {
        name: form.name,
        email: form.email,
        role: form.role,
      };
      if (!editing) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
        setSuccess(editing ? "Usuario actualizado" : "Usuario creado correctamente");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Error al guardar el usuario");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const action = user.active ? "desactivar" : "activar";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a ${user.name}?`)) return;

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: user.active ? 0 : 1 }),
    });

    if (res.ok) {
      setSuccess(`Usuario ${action === "activar" ? "activado" : "desactivado"}`);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Error al ${action} el usuario`);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordId) return;
    if (!newPassword || newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/users/${resetPasswordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setResetPasswordId(null);
        setNewPassword("");
        setSuccess("Contraseña actualizada correctamente");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Error al cambiar la contraseña");
      }
    } finally {
      setResetting(false);
    }
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: "" });
    setShowForm(true);
  };

  const roleLabel = (role: string) =>
    role === "admin" ? "Administrador" : "Cajero";

  const roleColor = (role: string) =>
    role === "admin" ? "bg-primary-500/10 text-primary-400" : "bg-white/[0.06] text-white/50";

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      {success && <SuccessBanner message={success} onClose={() => setSuccess(null)} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-white/35">Gestiona el acceso al panel administrativo</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Users table */}
      <div className="overflow-hidden glass-card !rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Nombre</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Email</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Rol</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Estado</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-white/30">Creado</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-white/30">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((u) => (
                <tr key={u.id} className={`transition-colors hover:bg-white/[0.02] ${!u.active ? "opacity-40" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400/30 to-primary-600/30 text-xs font-bold text-primary-300">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white/80">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-white/40">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${roleColor(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${u.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {u.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/30 text-xs">
                    {new Date(u.created_at).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-lg px-2.5 py-1 text-xs text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { setResetPasswordId(u.id); setNewPassword(""); }}
                      className="rounded-lg px-2.5 py-1 text-xs text-accent-400/70 hover:bg-accent-500/10 hover:text-accent-400 transition-colors"
                    >
                      Contraseña
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                        u.active
                          ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                          : "text-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-400"
                      }`}
                    >
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/20">
                    Sin usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC info */}
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/25 mb-3">Permisos por Rol</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-primary-500/10 bg-primary-500/[0.04] p-4">
            <p className="text-sm font-medium text-primary-400 mb-2">Administrador</p>
            <ul className="space-y-1 text-xs text-white/40">
              <li>✓ Acceso completo al sistema</li>
              <li>✓ Crear y gestionar usuarios</li>
              <li>✓ Cancelar ventas</li>
              <li>✓ Configuración del POS</li>
              <li>✓ Reportes completos</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-white/60 mb-2">Cajero</p>
            <ul className="space-y-1 text-xs text-white/40">
              <li>✓ Punto de Venta</li>
              <li>✓ Citas y Calendario</li>
              <li>✓ Consultar productos y servicios</li>
              <li>✗ Cancelar ventas</li>
              <li>✗ Configuración y usuarios</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => { setShowForm(false); setEditing(null); }}
        >
          <div className="w-full max-w-md glass-modal animate-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{editing ? "Editar Usuario" : "Nuevo Usuario"}</h2>
                <p className="mt-0.5 text-xs text-white/30">
                  {editing ? "Modifica los datos del usuario" : "Crea una nueva cuenta de acceso"}
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 hover:bg-white/[0.1] hover:text-white/70"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-7 pb-2 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Nombre completo <span className="text-primary-400/60">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre del empleado"
                  className="glass-input w-full px-4 py-2.5 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Email <span className="text-primary-400/60">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="glass-input w-full px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-white/40">Rol <span className="text-primary-400/60">*</span></label>
                <div className="flex gap-2">
                  {(["cashier", "admin"] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                        form.role === r
                          ? r === "admin"
                            ? "border-primary-500/30 bg-primary-500/10 text-primary-400"
                            : "border-white/[0.1] bg-white/[0.06] text-white/70"
                          : "border-white/[0.06] text-white/25 hover:text-white/50"
                      }`}
                    >
                      {r === "admin" ? "Administrador" : "Cajero"}
                    </button>
                  ))}
                </div>
              </div>
              {!editing && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Contraseña <span className="text-primary-400/60">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="glass-input w-full px-4 py-2.5 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3 mt-4">
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 btn-secondary py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-primary py-3 text-sm"
              >
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={() => { setResetPasswordId(null); setNewPassword(""); }}
        >
          <div className="w-full max-w-sm glass-modal animate-modal" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4">
              <h2 className="text-base font-semibold text-white">Cambiar Contraseña</h2>
              <p className="mt-0.5 text-xs text-white/30">
                {users.find(u => u.id === resetPasswordId)?.name}
              </p>
            </div>
            <div className="px-7 pb-4">
              <label className="mb-1.5 block text-xs font-medium text-white/40">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="glass-input w-full px-4 py-2.5 text-sm"
                autoFocus
              />
            </div>
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3">
              <button
                onClick={() => { setResetPasswordId(null); setNewPassword(""); }}
                className="flex-1 btn-secondary py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || !newPassword || newPassword.length < 6}
                className="flex-1 btn-primary py-3 text-sm"
              >
                {resetting ? "Guardando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
