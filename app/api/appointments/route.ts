import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isNonEmptyString, isValidDate, isValidTime, sanitizeString } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const date = request.nextUrl.searchParams.get("date");
  const month = request.nextUrl.searchParams.get("month");
  const status = request.nextUrl.searchParams.get("status");

  let query = "SELECT a.*, c.name as registered_client_name FROM appointments a LEFT JOIN clients c ON a.client_id = c.id WHERE 1=1";
  const params: string[] = [];

  if (date) { query += " AND date = ?"; params.push(date); }
  if (month) { query += " AND date LIKE ?"; params.push(`${month}%`); }
  if (status) { query += " AND status = ?"; params.push(status); }

  query += " ORDER BY a.date, a.time";
  const appointments = db.prepare(query).all(...params);
  return NextResponse.json(appointments);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { client_name, client_phone, service_id, service_name, date, time, end_time, notes, client_id } = body;

    if (!isNonEmptyString(client_name)) {
      return NextResponse.json({ error: "Nombre del cliente es requerido" }, { status: 400 });
    }
    if (!isValidDate(date)) {
      return NextResponse.json({ error: "Fecha debe tener formato YYYY-MM-DD" }, { status: 400 });
    }
    if (!isValidTime(time)) {
      return NextResponse.json({ error: "Hora debe tener formato HH:MM" }, { status: 400 });
    }
    if (end_time && !isValidTime(end_time)) {
      return NextResponse.json({ error: "Hora fin debe tener formato HH:MM" }, { status: 400 });
    }

    const db = getDb();
    const safeName = sanitizeString(client_name, 200);
    const safePhone = sanitizeString(client_phone, 20);
    const safeNotes = sanitizeString(notes, 1000);

    const result = db.prepare(
      "INSERT INTO appointments (client_name, client_phone, service_id, service_name, date, time, end_time, notes, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(safeName, safePhone, service_id || null, service_name || null, date, time, end_time || null, safeNotes, client_id || null);

    return NextResponse.json({ id: result.lastInsertRowid, ...body }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
