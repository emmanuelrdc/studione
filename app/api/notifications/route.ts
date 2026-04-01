import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = getDb();
  const notifications = db.prepare(
    "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50"
  ).all();

  const unreadCount = (db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0"
  ).get() as { count: number }).count;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const db = getDb();

  if (body.markAllRead) {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0").run();
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(body.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
}
