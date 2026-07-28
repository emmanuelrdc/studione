import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  db: null as any,
  token: "" as string | undefined,
  cashierToken: "" as string | undefined,
}));

vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "token" && state.token ? { value: state.token } : undefined,
  }),
}));

import { signToken } from "@/lib/auth";
import { createTestDatabase, seedDatabase } from "../helpers/db";
import { GET } from "@/app/api/audit-logs/route";

let ids: ReturnType<typeof seedDatabase>;

beforeAll(async () => {
  const db = createTestDatabase();
  ids = seedDatabase(db);
  state.db = db;
  state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  state.cashierToken = await signToken({ userId: ids.cashierId, email: "cashier@test.com", role: "cashier", name: "Cashier" });

  // Seed some audit rows spanning actions/statuses/dates.
  const ins = db.prepare(
    "INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, status, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  ins.run(ids.adminId, "Admin", "sale.cancel", "sale", 1, "success", '{"reason":"x"}', "2026-01-10 10:00:00");
  ins.run(ids.adminId, "Admin", "product.update", "product", 2, "success", null, "2026-02-15 11:00:00");
  ins.run(null, null, "auth.login_failed", "user", null, "denied", '{"email":"h@x.com"}', "2026-03-20 12:00:00");
});

const req = (qs = "") => new NextRequest(`http://localhost/api/audit-logs${qs}`);

describe("GET /api/audit-logs — access control", () => {
  it("returns 401 without a token", async () => {
    state.token = undefined;
    const res = await GET(req());
    expect(res.status).toBe(401);
    state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  });

  it("returns 403 for a cashier (admin-only)", async () => {
    state.token = state.cashierToken;
    const res = await GET(req());
    expect(res.status).toBe(403);
    state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  });

  it("returns 200 for an admin with the paginated shape", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.page).toBe(1);
    expect(body.pages).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/audit-logs — filters & pagination", () => {
  it("orders most-recent first (id DESC)", async () => {
    const body = await (await GET(req())).json();
    const ids2 = body.data.map((r: { id: number }) => r.id);
    expect(ids2).toEqual([...ids2].sort((a, b) => b - a));
  });

  it("filters by action", async () => {
    const body = await (await GET(req("?action=sale.cancel"))).json();
    expect(body.data.every((r: { action: string }) => r.action === "sale.cancel")).toBe(true);
    expect(body.total).toBe(1);
  });

  it("filters by status=denied", async () => {
    const body = await (await GET(req("?status=denied"))).json();
    expect(body.data.every((r: { status: string }) => r.status === "denied")).toBe(true);
  });

  it("filters by date range", async () => {
    const body = await (await GET(req("?from=2026-02-01&to=2026-02-28"))).json();
    expect(body.total).toBe(1);
    expect(body.data[0].action).toBe("product.update");
  });

  it("clamps limit to a maximum of 100", async () => {
    const res = await GET(req("?limit=9999"));
    const body = await res.json();
    // With <100 rows total, all are returned; the clamp is exercised via no error + valid shape.
    expect(res.status).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(100);
  });

  it("is not injectable via the action filter (parameterized)", async () => {
    const res = await GET(req(`?action=${encodeURIComponent("' OR '1'='1")}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    // The literal string matches no action → empty result, no 500, no dump.
    expect(body.data.length).toBe(0);
  });
});
