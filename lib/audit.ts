import type BetterSqlite3 from "better-sqlite3";
import { getDb } from "./db";
import type { JWTPayload } from "./auth";

// ---------------------------------------------------------------------------
// Central, single write-path for the append-only security audit trail.
//
// Security invariants (see PLAN-audit-logs.md):
//  - Actor identity comes ONLY from the server-verified JWT session, never the
//    request body. This module never accepts a caller-supplied user_id.
//  - `details` is caller-controlled free-form JSON: callers MUST pass only a
//    hand-picked whitelist of fields and NEVER secrets (passwords, hashes,
//    tokens). This module does not add fields on its own.
//  - Two write modes: transactional (atomic with the caller's db.transaction,
//    for money/inventory/account ops) and best-effort (never throws, for
//    low-risk CRUD so an audit failure can't break the operation).
// ---------------------------------------------------------------------------

const MAX_DETAILS_CHARS = 2000;
const MAX_USER_AGENT_CHARS = 300;

export type AuditStatus = "success" | "denied" | "error";

export interface AuditActor {
  userId: number;
  name: string | null;
  email: string | null;
}

export interface AuditEntry {
  /** Server-verified actor. `null` only for anonymous events (e.g. failed login). */
  actor: AuditActor | null;
  /** '<entity>.<verb>', e.g. 'sale.cancel', 'product.update', 'auth.login_failed'. */
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  status?: AuditStatus;
  /** Whitelisted, non-secret fields only. Serialized + hard-capped at 2000 chars. */
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Extract client IP and user-agent from a request, server-side.
 * Mirrors the x-forwarded-for handling already used in app/api/contact/route.ts.
 */
export function auditContext(request: { headers: Headers }): {
  ip: string | null;
  userAgent: string | null;
} {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent")?.slice(0, MAX_USER_AGENT_CHARS) || null;
  return { ip, userAgent };
}

/** Convenience: build an AuditActor from a verified JWT session. */
export function actorFromSession(session: JWTPayload): AuditActor {
  return { userId: session.userId, name: session.name ?? null, email: session.email ?? null };
}

/** Serialize `details` to bounded JSON. Returns null on empty or non-serializable input. */
function serializeDetails(details?: Record<string, unknown>): string | null {
  if (!details) return null;
  try {
    return JSON.stringify(details).slice(0, MAX_DETAILS_CHARS);
  } catch {
    // Circular reference or otherwise non-serializable — drop details, never throw.
    return null;
  }
}

const INSERT_SQL = `
  INSERT INTO audit_logs
    (user_id, user_name, user_email, action, entity_type, entity_id, status, details, ip, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * Transactional write: joins the caller's db.transaction() so the audit row
 * commits atomically with the state change. Use for money/inventory/account ops.
 * Synchronous (better-sqlite3), so it composes inside db.transaction(() => {...}).
 * May throw — that is intentional: if the log can't be written, the whole
 * critical operation rolls back.
 *
 * MUST be called ONLY from inside an active db.transaction(). Calling it
 * standalone on a route whose state change has already committed would let a
 * failed audit INSERT surface as a 500 *after* the operation succeeded — the
 * client would think it failed and may retry (e.g. duplicating a sale). For
 * fire-and-forget logging outside a transaction, use writeAudit() instead.
 */
export function writeAuditTx(db: BetterSqlite3.Database, e: AuditEntry): void {
  db.prepare(INSERT_SQL).run(
    e.actor?.userId ?? null,
    e.actor?.name ?? null,
    e.actor?.email ?? null,
    e.action,
    e.entityType ?? null,
    e.entityId ?? null,
    e.status ?? "success",
    serializeDetails(e.details),
    e.ip ?? null,
    e.userAgent ?? null,
  );
}

/**
 * Best-effort write: NEVER throws. Use for low-risk CRUD after the operation
 * has already succeeded, so an audit failure can't break the response.
 */
export function writeAudit(e: AuditEntry): void {
  try {
    writeAuditTx(getDb(), e);
  } catch (err) {
    console.error("[audit] failed to record (operation not affected):", err);
  }
}

/**
 * Retention purge (AUD-7). Deletes entries older than `days`. Audit trails are
 * retained long-term for compliance, so callers should use a large default.
 */
export function purgeOldAuditLogs(db: BetterSqlite3.Database, days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 0;
  const result = db.prepare(`DELETE FROM audit_logs WHERE created_at < datetime('now', ?)`).run(`-${Math.floor(days)} days`);
  return result.changes;
}
