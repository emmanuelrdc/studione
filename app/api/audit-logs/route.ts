import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { parseId, sanitizeString, isValidDate } from "@/lib/validation";

// Read-only, admin-only view over the append-only audit trail.
// There is intentionally NO POST/PUT/DELETE here — the table is written only via
// lib/audit.ts, never through an HTTP mutation, which keeps it tamper-evident.
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  const sp = request.nextUrl.searchParams;

  // Pagination with a hard clamp — no unbounded dumps.
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 50));
  const offset = (page - 1) * limit;

  // Filters: the WHERE is built ONLY from an allowlist of hardcoded column names
  // with parameterized values — no user input ever reaches the SQL text.
  const where: string[] = [];
  const args: (string | number)[] = [];

  const action = sanitizeString(sp.get("action"), 60);
  if (action) { where.push("action = ?"); args.push(action); }

  const entityType = sanitizeString(sp.get("entity_type"), 40);
  if (entityType) { where.push("entity_type = ?"); args.push(entityType); }

  const userIdRaw = sp.get("user_id");
  const userId = userIdRaw ? parseId(userIdRaw) : null;
  if (userId) { where.push("user_id = ?"); args.push(userId); }

  const status = sp.get("status");
  if (status && ["success", "denied", "error"].includes(status)) {
    where.push("status = ?");
    args.push(status);
  }

  const from = sp.get("from");
  if (isValidDate(from)) { where.push("created_at >= ?"); args.push(`${from} 00:00:00`); }
  const to = sp.get("to");
  if (isValidDate(to)) { where.push("created_at <= ?"); args.push(`${to} 23:59:59`); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const db = getDb();
    const total = (db.prepare(`SELECT COUNT(*) AS c FROM audit_logs ${whereSql}`).get(...args) as { c: number }).c;
    const data = db.prepare(
      `SELECT id, user_id, user_name, user_email, action, entity_type, entity_id, status, details, ip, user_agent, created_at
       FROM audit_logs ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(...args, limit, offset);

    return NextResponse.json(
      { data, total, page, pages: Math.max(1, Math.ceil(total / limit)) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
