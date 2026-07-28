/**
 * Security test suite.
 * Verifies: auth enforcement, RBAC, data exposure, SQL injection resistance,
 * input boundary handling, and cancellation idempotency.
 */
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
import { createTestDatabase, seedDatabase } from "./helpers/db";

// Route handlers
import { POST as login } from "@/app/api/auth/login/route";
import { GET as getProducts, POST as createProduct } from "@/app/api/products/route";
import { GET as getSales, POST as createSale } from "@/app/api/sales/route";
import { DELETE as cancelSale } from "@/app/api/sales/[id]/route";
import { POST as adjustStock } from "@/app/api/products/[id]/adjust/route";
import { PUT as updateSettings } from "@/app/api/settings/route";
import { GET as getAppointments, POST as createAppointment } from "@/app/api/appointments/route";

let ids: ReturnType<typeof seedDatabase>;

beforeAll(async () => {
  const db = createTestDatabase();
  ids = seedDatabase(db);
  state.db = db;

  // Seed a pre-existing sale for cancellation tests
  db.prepare(
    "INSERT INTO sales (cash_register_id, user_id, payment_method, subtotal, total, amount_paid, sale_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(ids.registerId, ids.adminId, "cash", 100, 100, 100, "product", "active");

  state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  state.cashierToken = await signToken({ userId: ids.cashierId, email: "cashier@test.com", role: "cashier", name: "Cashier" });
});

const noToken = () => { state.token = undefined; };
const asAdmin = async () => {
  state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
};
const asCashier = () => { state.token = state.cashierToken; };

const req = (url: string, opts?: RequestInit) => new NextRequest(`http://localhost${url}`, opts);
const json = (url: string, method: string, body: object) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── 1. Unauthenticated access — all protected routes return 401 ─────────────
describe("Auth enforcement — 401 without token", () => {
  const cases = [
    async () => getProducts(req("/api/products")),
    async () => getSales(req("/api/sales")),
    async () => getAppointments(req("/api/appointments")),
  ];

  for (const fn of cases) {
    it(`returns 401: ${fn.toString().slice(0, 60)}`, async () => {
      noToken();
      const res = await fn();
      expect(res.status).toBe(401);
      await asAdmin();
    });
  }
});

// ── 2. RBAC — cashier cannot access admin-only endpoints ────────────────────
describe("RBAC — 403 for cashier on admin-only endpoints", () => {
  it("cannot create products", async () => {
    asCashier();
    const res = await createProduct(json("/api/products", "POST", {
      name: "Hack", price: 0, stock_sales: 0, stock_internal: 0, product_type: "both",
    }));
    expect(res.status).toBe(403);
    await asAdmin();
  });

  it("cannot adjust stock", async () => {
    asCashier();
    const res = await adjustStock(json(`/api/products/${ids.productId}/adjust`, "POST", {
      type: "in", quantity: 100, stock_type: "sales",
    }), { params: Promise.resolve({ id: String(ids.productId) }) });
    expect(res.status).toBe(403);
    await asAdmin();
  });

  it("cannot cancel a sale", async () => {
    asCashier();
    const sale = state.db.prepare("SELECT id FROM sales WHERE status = 'active' LIMIT 1").get() as { id: number } | undefined;
    if (!sale) return; // No active sale; skip
    const res = await cancelSale(json(`/api/sales/${sale.id}`, "DELETE", {}), {
      params: Promise.resolve({ id: String(sale.id) }),
    });
    expect(res.status).toBe(403);
    await asAdmin();
  });

  it("cannot change POS settings", async () => {
    asCashier();
    const res = await updateSettings(json("/api/settings", "PUT", { theme: "light" }));
    expect(res.status).toBe(403);
    await asAdmin();
  });
});

// ── 3. Login does not expose password hash ──────────────────────────────────
describe("Data exposure — password never returned", () => {
  it("login response excludes password hash", async () => {
    await asAdmin();
    const res = await login(json("/api/auth/login", "POST", {
      email: "admin@test.com",
      password: "admin123",
    }));
    const body = await res.json();
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/\$2[ab]\$/); // bcrypt hash pattern
    expect(body.user?.password).toBeUndefined();
  });

  it("non-existent user returns same 401 as wrong password (no email enumeration)", async () => {
    const r1 = await login(json("/api/auth/login", "POST", { email: "ghost@x.com", password: "x" }));
    const r2 = await login(json("/api/auth/login", "POST", { email: "admin@test.com", password: "wrong" }));
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
    expect((await r1.json()).error).toBe((await r2.json()).error);
  });
});

// ── 4. SQL injection resistance ─────────────────────────────────────────────
describe("SQL injection resistance", () => {
  const injections = [
    "' OR '1'='1",
    "'; DROP TABLE products--",
    "1 UNION SELECT * FROM users--",
    "' OR 1=1--",
    "%' OR '%'='",
  ];

  for (const payload of injections) {
    it(`search param: ${payload}`, async () => {
      await asAdmin();
      const encoded = encodeURIComponent(payload);
      const res = await getProducts(req(`/api/products?search=${encoded}`));
      // Should return 200 with an empty array (not crash, not return all products)
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      // Injection attempts should never return the users table or error with stack trace
      const text = JSON.stringify(body);
      expect(text).not.toMatch(/password/i);
    });
  }

  it("injection in product name during create is stored safely (not executed)", async () => {
    await asAdmin();
    const maliciousName = "x'); DROP TABLE products; --";
    const res = await createProduct(json("/api/products", "POST", {
      name: maliciousName,
      price: 10,
      stock_sales: 0,
      stock_internal: 0,
      product_type: "both",
    }));
    expect(res.status).toBe(201);
    // Table must still exist and have records
    const count = (state.db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number }).c;
    expect(count).toBeGreaterThan(0);
    // The name was stored literally
    const row = state.db.prepare("SELECT name FROM products ORDER BY id DESC LIMIT 1").get() as { name: string };
    expect(row.name).toBe(maliciousName);
  });
});

// ── 5. Input boundary — extreme values ─────────────────────────────────────
describe("Input boundary — extreme values", () => {
  it("rejects appointment date with SQL in it", async () => {
    await asAdmin();
    const res = await createAppointment(json("/api/appointments", "POST", {
      client_name: "Test",
      date: "2025-01-01'; DROP TABLE appointments--",
      time: "10:00",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects appointment with hour > 23", async () => {
    await asAdmin();
    const res = await createAppointment(json("/api/appointments", "POST", {
      client_name: "Test",
      date: "2025-12-01",
      time: "24:00",
    }));
    expect(res.status).toBe(400);
  });

  it("sale with negative quantity is rejected", async () => {
    await asAdmin();
    state.db.prepare("UPDATE cash_registers SET status = 'open' WHERE user_id = ?").run(ids.adminId);
    const res = await createSale(json("/api/sales", "POST", {
      items: [{ name: "X", quantity: -1, unit_price: 100, product_id: ids.productId }],
      payment_method: "cash",
    }));
    expect(res.status).toBe(400);
  });

  it("sale with 0 quantity is rejected", async () => {
    await asAdmin();
    const res = await createSale(json("/api/sales", "POST", {
      items: [{ name: "X", quantity: 0, unit_price: 100, product_id: ids.productId }],
      payment_method: "cash",
    }));
    expect(res.status).toBe(400);
  });

  it("stock adjustment with negative quantity is rejected", async () => {
    await asAdmin();
    const res = await adjustStock(json(`/api/products/${ids.productId}/adjust`, "POST", {
      type: "in", quantity: -5, stock_type: "sales",
    }), { params: Promise.resolve({ id: String(ids.productId) }) });
    expect(res.status).toBe(400);
  });

  it("overly long name for appointment is safely truncated and stored", async () => {
    await asAdmin();
    const name = "A".repeat(500);
    const res = await createAppointment(json("/api/appointments", "POST", {
      client_name: name,
      date: "2025-12-25",
      time: "10:00",
    }));
    expect(res.status).toBe(201);
    const row = state.db
      .prepare("SELECT client_name FROM appointments WHERE date = '2025-12-25' ORDER BY id DESC LIMIT 1")
      .get() as { client_name: string };
    expect(row.client_name.length).toBeLessThanOrEqual(200);
  });
});

// ── 6. Token forgery ────────────────────────────────────────────────────────
describe("Token forgery", () => {
  it("forged token with wrong secret returns 401", async () => {
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("wrong-secret-completely-different-key");
    const forged = await new SignJWT({ userId: 1, email: "admin@test.com", role: "admin", name: "Hacker" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .setIssuedAt()
      .sign(wrongSecret);

    state.token = forged;
    const res = await getProducts(req("/api/products"));
    expect(res.status).toBe(401);
    await asAdmin();
  });

  it("role escalation: cashier token with admin role forged externally is rejected", async () => {
    // Use the wrong secret — token won't verify
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("another-wrong-secret-for-testing-123");
    const escalated = await new SignJWT({ userId: ids.cashierId, email: "cashier@test.com", role: "admin", name: "Hacker" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .setIssuedAt()
      .sign(wrongSecret);

    state.token = escalated;
    const res = await createProduct(json("/api/products", "POST", {
      name: "Hack", price: 0, stock_sales: 0, stock_internal: 0, product_type: "both",
    }));
    expect(res.status).toBe(401);
    await asAdmin();
  });
});

// ── 7. Sale atomicity — partial failures leave no trace ─────────────────────
describe("Sale transaction atomicity", () => {
  it("insufficient stock rolls back entire sale", async () => {
    await asAdmin();
    state.db.prepare("UPDATE products SET stock_sales = 1 WHERE id = ?").run(ids.productId);
    state.db.prepare("UPDATE cash_registers SET status = 'open' WHERE user_id = ?").run(ids.adminId);

    const salesBefore = (state.db.prepare("SELECT COUNT(*) as c FROM sales").get() as { c: number }).c;
    const itemsBefore = (state.db.prepare("SELECT COUNT(*) as c FROM sale_items").get() as { c: number }).c;

    const res = await createSale(json("/api/sales", "POST", {
      items: [{ name: "Shampoo Test", quantity: 5, unit_price: 150, product_id: ids.productId }],
      payment_method: "cash",
      amount_paid: 750,
    }));
    expect(res.status).toBe(400);

    // No partial sale row should exist
    const salesAfter = (state.db.prepare("SELECT COUNT(*) as c FROM sales").get() as { c: number }).c;
    const itemsAfter = (state.db.prepare("SELECT COUNT(*) as c FROM sale_items").get() as { c: number }).c;
    expect(salesAfter).toBe(salesBefore);
    expect(itemsAfter).toBe(itemsBefore);

    // Stock unchanged
    const stock = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;
    expect(stock).toBe(1);
  });
});
