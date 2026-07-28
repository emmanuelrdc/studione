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
import { GET, PUT } from "@/app/api/settings/route";

let ids: ReturnType<typeof seedDatabase>;

beforeAll(async () => {
  const db = createTestDatabase();
  ids = seedDatabase(db);
  state.db = db;
  state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  state.cashierToken = await signToken({ userId: ids.cashierId, email: "cashier@test.com", role: "cashier", name: "Cashier" });
});

const makeJson = (body: object) =>
  new NextRequest("http://localhost/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── GET /api/settings ───────────────────────────────────────────────────────
describe("GET /api/settings", () => {
  it("returns 401 without auth", async () => {
    state.token = undefined;
    const res = await GET();
    expect(res.status).toBe(401);
    state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  });

  it("returns current settings", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("theme");
    expect(body).toHaveProperty("allow_discounts");
    expect(body).toHaveProperty("allow_promotions");
    expect(body).toHaveProperty("birthday_discount_enabled");
    expect(body).toHaveProperty("birthday_discount_percent");
  });

  it("has no-store cache control header", async () => {
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

// ── PUT /api/settings ───────────────────────────────────────────────────────
describe("PUT /api/settings", () => {
  it("returns 403 for cashier role", async () => {
    state.token = state.cashierToken;
    const res = await PUT(makeJson({ theme: "light" }));
    expect(res.status).toBe(403);
    state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  });

  it("updates theme to light", async () => {
    const res = await PUT(makeJson({ theme: "light" }));
    expect(res.status).toBe(200);
    expect((await res.json()).theme).toBe("light");
  });

  it("updates theme back to dark", async () => {
    await PUT(makeJson({ theme: "dark" }));
    const res = await GET();
    expect((await res.json()).theme).toBe("dark");
  });

  it("returns 400 for invalid theme value", async () => {
    const res = await PUT(makeJson({ theme: "purple" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/theme/i);
  });

  it("enables discounts", async () => {
    const res = await PUT(makeJson({ allow_discounts: true }));
    expect(res.status).toBe(200);
    expect((await res.json()).allow_discounts).toBe(1);
  });

  it("disables discounts", async () => {
    const res = await PUT(makeJson({ allow_discounts: false }));
    expect(res.status).toBe(200);
    expect((await res.json()).allow_discounts).toBe(0);
  });

  it("accepts 0/1 as boolean values", async () => {
    let res = await PUT(makeJson({ allow_promotions: 1 }));
    expect(res.status).toBe(200);
    expect((await res.json()).allow_promotions).toBe(1);

    res = await PUT(makeJson({ allow_promotions: 0 }));
    expect(res.status).toBe(200);
    expect((await res.json()).allow_promotions).toBe(0);
  });

  it("returns 400 for invalid boolean value", async () => {
    const res = await PUT(makeJson({ allow_discounts: "yes" }));
    expect(res.status).toBe(400);
  });

  it("clamps birthday_discount_percent to 100", async () => {
    const res = await PUT(makeJson({ birthday_discount_percent: 150 }));
    expect(res.status).toBe(200);
    expect((await res.json()).birthday_discount_percent).toBe(100);
  });

  it("clamps birthday_discount_percent to 0 for negative", async () => {
    const res = await PUT(makeJson({ birthday_discount_percent: -10 }));
    expect(res.status).toBe(200);
    expect((await res.json()).birthday_discount_percent).toBe(0);
  });

  it("updates multiple fields at once", async () => {
    const res = await PUT(makeJson({
      theme: "light",
      allow_discounts: true,
      birthday_discount_enabled: true,
      birthday_discount_percent: 15,
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toBe("light");
    expect(body.allow_discounts).toBe(1);
    expect(body.birthday_discount_enabled).toBe(1);
    expect(body.birthday_discount_percent).toBe(15);
  });
});
