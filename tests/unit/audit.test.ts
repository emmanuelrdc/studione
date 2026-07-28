import { describe, it, expect, vi, beforeEach } from "vitest";
import type Database from "better-sqlite3";

// Shared handle the mocked getDb() points at, swappable per-test.
const state = vi.hoisted(() => ({ db: null as Database.Database | null }));
vi.mock("@/lib/db", () => ({ getDb: () => state.db }));

import { createTestDatabase } from "../helpers/db";
import {
  writeAuditTx,
  writeAudit,
  auditContext,
  actorFromSession,
  purgeOldAuditLogs,
  type AuditActor,
} from "@/lib/audit";

const actor: AuditActor = { userId: 7, name: "Admin Test", email: "admin@test.com" };

function countAudit(db: Database.Database, action?: string): number {
  const sql = action
    ? "SELECT COUNT(*) AS c FROM audit_logs WHERE action = ?"
    : "SELECT COUNT(*) AS c FROM audit_logs";
  const row = (action ? db.prepare(sql).get(action) : db.prepare(sql).get()) as { c: number };
  return row.c;
}

let db: Database.Database;
beforeEach(() => {
  db = createTestDatabase();
  state.db = db;
});

// ── writeAuditTx ─────────────────────────────────────────────────────────────
describe("writeAuditTx", () => {
  it("inserts a row with all fields mapped correctly", () => {
    writeAuditTx(db, {
      actor,
      action: "sale.cancel",
      entityType: "sale",
      entityId: 42,
      status: "success",
      details: { reason: "test" },
      ip: "1.2.3.4",
      userAgent: "vitest",
    });

    const row = db.prepare("SELECT * FROM audit_logs WHERE action = 'sale.cancel'").get() as Record<string, unknown>;
    expect(row.user_id).toBe(7);
    expect(row.user_name).toBe("Admin Test");
    expect(row.user_email).toBe("admin@test.com");
    expect(row.entity_type).toBe("sale");
    expect(row.entity_id).toBe(42);
    expect(row.status).toBe("success");
    expect(JSON.parse(row.details as string)).toEqual({ reason: "test" });
    expect(row.ip).toBe("1.2.3.4");
  });

  it("defaults status to 'success' and stores null actor as null user_id", () => {
    writeAuditTx(db, { actor: null, action: "auth.login_failed", status: "denied" });
    const row = db.prepare("SELECT * FROM audit_logs WHERE action = 'auth.login_failed'").get() as Record<string, unknown>;
    expect(row.user_id).toBeNull();
    expect(row.user_name).toBeNull();
    expect(row.status).toBe("denied");
  });

  it("caps details at 2000 chars", () => {
    writeAuditTx(db, { actor, action: "x.big", details: { blob: "a".repeat(5000) } });
    const row = db.prepare("SELECT details FROM audit_logs WHERE action = 'x.big'").get() as { details: string };
    expect(row.details.length).toBeLessThanOrEqual(2000);
  });

  it("stores null details for a non-serializable (circular) object without throwing", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => writeAuditTx(db, { actor, action: "x.circular", details: circular })).not.toThrow();
    const row = db.prepare("SELECT details FROM audit_logs WHERE action = 'x.circular'").get() as { details: unknown };
    expect(row.details).toBeNull();
  });

  it("is atomic inside a db.transaction (rolls back with the caller's operation)", () => {
    const op = db.transaction((shouldFail: boolean) => {
      db.prepare("INSERT INTO clients (name) VALUES (?)").run("Rollback Client");
      writeAuditTx(db, { actor, action: "client.create", entityType: "client" });
      if (shouldFail) throw new Error("boom");
    });

    expect(() => op(true)).toThrow("boom");
    // Both the business row and the audit row must be gone.
    expect(countAudit(db, "client.create")).toBe(0);
    const clients = (db.prepare("SELECT COUNT(*) AS c FROM clients WHERE name = 'Rollback Client'").get() as { c: number }).c;
    expect(clients).toBe(0);
  });

  it("does not inject fields the caller did not pass (whitelist is the caller's responsibility)", () => {
    // The helper is transparent: it stores exactly what the caller gives, and
    // nothing more. It never reaches for secrets on its own.
    writeAuditTx(db, { actor, action: "product.update", details: { before: { price: 290 }, after: { price: 310 } } });
    const row = db.prepare("SELECT details FROM audit_logs WHERE action = 'product.update'").get() as { details: string };
    const parsed = JSON.parse(row.details);
    expect(parsed).toEqual({ before: { price: 290 }, after: { price: 310 } });
    expect(parsed).not.toHaveProperty("password");
  });
});

// ── writeAudit (best-effort) ────────────────────────────────────────────────
describe("writeAudit", () => {
  it("writes via getDb() when healthy", () => {
    writeAudit({ actor, action: "brand.create", entityType: "brand", entityId: 1 });
    expect(countAudit(db, "brand.create")).toBe(1);
  });

  it("NEVER throws even if the underlying db write fails", () => {
    const throwingDb = { prepare: () => { throw new Error("db down"); } } as unknown as Database.Database;
    state.db = throwingDb;
    expect(() => writeAudit({ actor, action: "should.not.throw" })).not.toThrow();
    state.db = db; // restore
  });
});

// ── auditContext ─────────────────────────────────────────────────────────────
describe("auditContext", () => {
  it("takes the first IP from x-forwarded-for and truncates the user-agent", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178",
      "user-agent": "U".repeat(400),
    });
    const ctx = auditContext({ headers });
    expect(ctx.ip).toBe("203.0.113.5");
    expect(ctx.userAgent?.length).toBe(300);
  });

  it("returns null when headers are absent", () => {
    const ctx = auditContext({ headers: new Headers() });
    expect(ctx.ip).toBeNull();
    expect(ctx.userAgent).toBeNull();
  });
});

// ── actorFromSession ─────────────────────────────────────────────────────────
describe("actorFromSession", () => {
  it("maps a JWT session to an AuditActor", () => {
    const a = actorFromSession({ userId: 3, email: "u@x.com", role: "admin", name: "U" });
    expect(a).toEqual({ userId: 3, name: "U", email: "u@x.com" });
  });
});

// ── purgeOldAuditLogs ────────────────────────────────────────────────────────
describe("purgeOldAuditLogs", () => {
  it("deletes only entries older than the retention window", () => {
    db.prepare("INSERT INTO audit_logs (action, created_at) VALUES ('old', datetime('now','-400 days'))").run();
    db.prepare("INSERT INTO audit_logs (action, created_at) VALUES ('recent', datetime('now','-10 days'))").run();

    const deleted = purgeOldAuditLogs(db, 365);
    expect(deleted).toBe(1);
    expect(countAudit(db, "old")).toBe(0);
    expect(countAudit(db, "recent")).toBe(1);
  });

  it("returns 0 and deletes nothing for a non-positive window", () => {
    db.prepare("INSERT INTO audit_logs (action) VALUES ('keep')").run();
    expect(purgeOldAuditLogs(db, 0)).toBe(0);
    expect(countAudit(db, "keep")).toBe(1);
  });
});
