"use client";

import { useState, useEffect, useMemo } from "react";

interface Appointment { id: number; client_name: string; client_phone: string; client_id: number | null; service_id: number; service_name?: string; date: string; time: string; end_time: string; status: string; notes: string; }
interface Service { id: number; name: string; price: number; duration: number; category_name?: string; }
interface Client { id: number; name: string; phone: string | null; }

const HOURS = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState({ client_name: "", client_phone: "", service_id: "", date: "", time: "10:00", notes: "", client_id: "" });
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetch(`/api/appointments?month=${year}-${(month + 1).toString().padStart(2, "0")}`)
      .then(r => r.json()).then(setAppointments).catch(() => {});
  }, [year, month, showForm]);

  useEffect(() => {
    fetch("/api/services?active=1").then(r => r.json()).then(setServices).catch(() => {});
    fetch("/api/clients").then(r => r.json()).then(setClients).catch(() => {});
  }, []);

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
    return weeks;
  }, [year, month]);

  const dayAppointments = useMemo(() =>
    appointments.filter(a => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDate]
  );

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach(a => { map[a.date] = (map[a.date] || 0) + 1; });
    return map;
  }, [appointments]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const openNew = (date?: string) => {
    setEditing(null);
    setForm({ client_name: "", client_phone: "", service_id: "", date: date || selectedDate, time: "10:00", notes: "", client_id: "" });
    setClientSearch("");
    setShowClientDropdown(false);
    setShowForm(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setForm({ client_name: a.client_name, client_phone: a.client_phone || "", service_id: a.service_id?.toString() || "", date: a.date, time: a.time, notes: a.notes || "", client_id: a.client_id?.toString() || "" });
    setClientSearch("");
    setShowClientDropdown(false);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.client_name || !form.date || !form.time) return;
    const body = { ...form, service_id: form.service_id ? parseInt(form.service_id) : null, client_id: form.client_id ? parseInt(form.client_id) : null };
    if (editing) {
      await fetch(`/api/appointments/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setShowForm(false);
    // Refresh
    fetch(`/api/appointments?month=${year}-${(month + 1).toString().padStart(2, "0")}`)
      .then(r => r.json()).then(setAppointments).catch(() => {});
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/appointments/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const deleteAppointment = async (id: number) => {
    if (!confirm("¿Eliminar esta cita?")) return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const today = new Date().toISOString().slice(0, 10);
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Calendario de Citas</h1>
          <p className="mt-1 text-sm text-white/35">Gestiona las citas de tus clientes</p>
        </div>
        <button onClick={() => openNew()} className="btn-primary px-5 py-2.5 text-sm">
          + Nueva Cita
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Calendar */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white transition">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-medium text-white">{monthNames[month]} {year}</span>
            <button onClick={nextMonth} className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white transition">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map(d => (
              <span key={d} className="text-center text-[10px] font-medium uppercase text-white/20">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendar.flat().map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const count = appointmentsByDate[dateStr] || 0;
              return (
                <button key={i} onClick={() => setSelectedDate(dateStr)}
                  className={`relative flex flex-col items-center rounded-xl py-2 text-sm transition-all
                    ${isSelected ? "bg-primary-500/15 text-primary-400 font-semibold ring-1 ring-primary-500/20" :
                      isToday ? "bg-primary-500/8 text-primary-300" :
                        "text-white/45 hover:bg-white/[0.05] hover:text-white/70"}`}>
                  {day}
                  {count > 0 && (
                    <span className="mt-0.5 flex h-1 w-1 rounded-full bg-primary-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2">
            <button onClick={() => { setSelectedDate(today); setCurrentDate(new Date()); }}
              className="w-full rounded-xl bg-white/[0.04] py-2 text-xs text-white/40 hover:bg-white/[0.08] hover:text-white/60 transition">
              Ir a Hoy
            </button>
          </div>
        </div>

        {/* Day detail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <span className="text-xs text-white/30">{dayAppointments.length} cita{dayAppointments.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            {dayAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.06] py-16 text-center">
                <p className="text-white/20 text-sm">Sin citas este día</p>
                <button onClick={() => openNew(selectedDate)} className="mt-3 text-xs text-primary-400 hover:text-primary-300 transition">+ Agregar cita</button>
              </div>
            ) : (
              dayAppointments.map(a => {
                const svc = services.find(s => s.id === a.service_id);
                return (
                  <div key={a.id} className={`group rounded-2xl border p-4 transition-all
                    ${a.status === "completed" ? "border-primary-500/10 bg-primary-500/[0.03]" :
                      a.status === "cancelled" ? "border-red-500/10 bg-red-500/[0.03] opacity-50" :
                        "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">{a.time}</p>
                          {a.end_time && <p className="text-[10px] text-white/20">{a.end_time}</p>}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{a.client_name}</p>
                          {a.client_phone && <p className="text-xs text-white/30">{a.client_phone}</p>}
                          {svc && <p className="mt-1 text-xs text-primary-400/60">{svc.name} · ${svc.price}</p>}
                          {a.notes && <p className="mt-1 text-xs text-white/20 italic">{a.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {a.status === "scheduled" && (
                          <button onClick={() => updateStatus(a.id, "completed")}
                            className="rounded-lg p-1.5 text-primary-400/50 hover:bg-primary-500/10 hover:text-primary-400" title="Completar">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                        {a.status === "scheduled" && (
                          <button onClick={() => updateStatus(a.id, "cancelled")}
                            className="rounded-lg p-1.5 text-red-400/50 hover:bg-red-500/10 hover:text-red-400" title="Cancelar">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                        <button onClick={() => openEdit(a)}
                          className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white/60" title="Editar">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => deleteAppointment(a.id)}
                          className="rounded-lg p-1.5 text-white/20 hover:bg-red-500/10 hover:text-red-400" title="Eliminar">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium
                        ${a.status === "completed" ? "bg-primary-500/10 text-primary-400" :
                          a.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                            "bg-accent-500/10 text-accent-400"}`}>
                        {a.status === "completed" ? "Completada" : a.status === "cancelled" ? "Cancelada" : "Programada"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md glass-modal animate-modal flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{editing ? "Editar Cita" : "Nueva Cita"}</h2>
                <p className="mt-0.5 text-xs text-white/30">Agenda una cita para tu cliente</p>
              </div>
              <button onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-all hover:bg-white/[0.1] hover:text-white/70">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-7 pb-2 space-y-5">
              {/* Client section */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Cliente</p>
                {/* Client search */}
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Buscar cliente registrado</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    <input
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="glass-input w-full pl-10 pr-10 py-2.5 text-sm"
                      placeholder="Buscar por nombre o teléfono..."
                    />
                    {form.client_id && (
                      <button onClick={() => { setForm({ ...form, client_id: "", client_name: "", client_phone: "" }); setClientSearch(""); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  {showClientDropdown && clientSearch.length >= 1 && (
                    <div className="absolute z-10 mt-1 max-h-36 w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl shadow-lg">
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                        <button key={c.id} onClick={() => {
                          setForm({ ...form, client_id: c.id.toString(), client_name: c.name, client_phone: c.phone || "" });
                          setClientSearch(c.name);
                          setShowClientDropdown(false);
                        }}
                          className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.06] transition">
                          <span className="font-medium text-white/90">{c.name}</span>
                          {c.phone && <span className="ml-2 text-xs text-white/30">{c.phone}</span>}
                        </button>
                      ))}
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                        <p className="px-4 py-2.5 text-xs text-white/20">Sin resultados</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Nombre del cliente <span className="text-primary-400/60">*</span></label>
                  <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 text-sm" placeholder="Nombre del cliente" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Teléfono</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    <input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })}
                      className="glass-input w-full pl-10 pr-4 py-2.5 text-sm" placeholder="Teléfono" />
                  </div>
                </div>
              </div>

              {/* Service section */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Servicio</p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Seleccionar servicio</label>
                  <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}
                    className="glass-input w-full px-4 py-2.5 text-sm [&>option]:bg-neutral-900 [&>option]:text-white">
                    <option value="">Sin servicio</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>)}
                  </select>
                </div>
              </div>

              {/* Date & Time section */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Fecha y hora</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Fecha <span className="text-primary-400/60">*</span></label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 text-sm [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Hora <span className="text-primary-400/60">*</span></label>
                    <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                      className="glass-input w-full px-4 py-2.5 text-sm [&>option]:bg-neutral-900 [&>option]:text-white">
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      {["08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30", "20:30"].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes section */}
              <div className="space-y-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Notas</p>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="glass-input w-full px-4 py-2.5 text-sm resize-none" placeholder="Notas adicionales..." />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-7 py-5 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-3 text-sm">Cancelar</button>
              <button onClick={save} className="flex-1 btn-primary py-3 text-sm">
                {editing ? "Guardar Cambios" : "Crear Cita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
