import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
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
import { GET, POST } from "@/app/api/sales/route";
import { GET as getOne, DELETE as cancelSale } from "@/app/api/sales/[id]/route";

let ids: ReturnType<typeof seedDatabase>;

beforeAll(async () => {
  const db = createTestDatabase();
  ids = seedDatabase(db);
  state.db = db;
  state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  state.cashierToken = await signToken({ userId: ids.cashierId, email: "cashier@test.com", role: "cashier", name: "Cashier" });
});

const makeJson = (url: string, method: string, body: object) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

function validSalePayload(productId: number, qty = 1, unitPrice = 150) {
  return {
    items: [{ name: "Shampoo Test", quantity: qty, unit_price: unitPrice, product_id: productId }],
    payment_method: "cash",
    amount_paid: unitPrice * qty,
  };
}

// ── GET /api/sales ──────────────────────────────────────────────────────────
describe("GET /api/sales", () => {
  it("returns 401 without token", async () => {
    state.token = undefined;
    const res = await GET(new NextRequest("http://localhost/api/sales"));
    expect(res.status).toBe(401);
    state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  });

  it("returns array of sales", async () => {
    const res = await GET(new NextRequest("http://localhost/api/sales"));
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

// ── POST /api/sales ─────────────────────────────────────────────────────────
describe("POST /api/sales — validation", () => {
  it("returns 400 when items array is empty", async () => {
    const res = await POST(makeJson("/api/sales", "POST", { items: [], payment_method: "cash" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/items/i);
  });

  it("returns 400 for invalid payment_method", async () => {
    const res = await POST(makeJson("/api/sales", "POST", {
      items: [{ name: "X", quantity: 1, unit_price: 100 }],
      payment_method: "crypto",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for item with quantity <= 0", async () => {
    const res = await POST(makeJson("/api/sales", "POST", {
      items: [{ name: "X", quantity: 0, unit_price: 100 }],
      payment_method: "cash",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for item with negative unit_price", async () => {
    const res = await POST(makeJson("/api/sales", "POST", {
      items: [{ name: "X", quantity: 1, unit_price: -50 }],
      payment_method: "cash",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when there is no open cash register", async () => {
    // Close all registers for this user
    state.db.prepare("UPDATE cash_registers SET status = 'closed' WHERE user_id = ?").run(ids.adminId);

    const res = await POST(makeJson("/api/sales", "POST", validSalePayload(ids.productId)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/caja/i);

    // Reopen
    state.db.prepare("UPDATE cash_registers SET status = 'open' WHERE user_id = ?").run(ids.adminId);
  });
});

describe("POST /api/sales — happy path", () => {
  beforeEach(() => {
    state.db.prepare("UPDATE products SET stock_sales = 10 WHERE id = ?").run(ids.productId);
    state.db.prepare("UPDATE cash_registers SET status = 'open' WHERE user_id = ?").run(ids.adminId);
  });

  it("creates sale and deducts product stock", async () => {
    const stockBefore = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;

    const res = await POST(makeJson("/api/sales", "POST", validSalePayload(ids.productId, 2)));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.sale_id).toBeDefined();
    expect(body.total).toBe(300); // 2 × 150

    const stockAfter = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;
    expect(stockAfter).toBe(stockBefore - 2);
  });

  it("calculates correct change_given for cash payment", async () => {
    const res = await POST(makeJson("/api/sales", "POST", {
      items: [{ name: "Shampoo Test", quantity: 1, unit_price: 150, product_id: ids.productId }],
      payment_method: "cash",
      amount_paid: 200,
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.change_given).toBe(50);
  });

  it("change_given is 0 for card payment regardless of amount_paid", async () => {
    const res = await POST(makeJson("/api/sales", "POST", {
      items: [{ name: "Shampoo Test", quantity: 1, unit_price: 150, product_id: ids.productId }],
      payment_method: "card",
      amount_paid: 500,
    }));
    expect(res.status).toBe(201);
    expect((await res.json()).change_given).toBe(0);
  });

  it("returns 400 when stock is insufficient", async () => {
    state.db.prepare("UPDATE products SET stock_sales = 1 WHERE id = ?").run(ids.productId);

    const res = await POST(makeJson("/api/sales", "POST", validSalePayload(ids.productId, 5)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/insuficiente/i);

    // Verify stock was NOT changed (transaction rolled back)
    const stock = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;
    expect(stock).toBe(1);
  });

  it("discount is ignored when allow_discounts=0 (server enforces)", async () => {
    state.db.prepare("UPDATE pos_settings SET allow_discounts = 0 WHERE id = 1").run();

    const res = await POST(makeJson("/api/sales", "POST", {
      items: [{ name: "Shampoo Test", quantity: 1, unit_price: 150, product_id: ids.productId, discount_percent: 50 }],
      payment_method: "cash",
      amount_paid: 75, // What client expects after 50% discount
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    // Total should be 150 (discount was ignored), not 75
    expect(body.total).toBe(150);
    expect(body.discount_total).toBe(0);
  });
});

// ── GET /api/sales/[id] ─────────────────────────────────────────────────────
describe("GET /api/sales/[id]", () => {
  let saleId: number;

  beforeEach(async () => {
    state.db.prepare("UPDATE products SET stock_sales = 10 WHERE id = ?").run(ids.productId);
    state.db.prepare("UPDATE cash_registers SET status = 'open' WHERE user_id = ?").run(ids.adminId);
    const res = await POST(makeJson("/api/sales", "POST", validSalePayload(ids.productId)));
    saleId = (await res.json()).sale_id;
  });

  it("returns sale with items", async () => {
    const res = await getOne(
      new NextRequest(`http://localhost/api/sales/${saleId}`),
      { params: Promise.resolve({ id: String(saleId) }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sale.id).toBe(saleId);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("returns 404 for non-existent sale", async () => {
    const res = await getOne(
      new NextRequest("http://localhost/api/sales/99999"),
      { params: Promise.resolve({ id: "99999" }) }
    );
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/sales/[id] (cancellation) ──────────────────────────────────
describe("DELETE /api/sales/[id] — cancellation", () => {
  let saleId: number;

  beforeEach(async () => {
    state.db.prepare("UPDATE products SET stock_sales = 10 WHERE id = ?").run(ids.productId);
    state.db.prepare("UPDATE cash_registers SET status = 'open' WHERE user_id = ?").run(ids.adminId);
    const res = await POST(makeJson("/api/sales", "POST", validSalePayload(ids.productId, 2)));
    saleId = (await res.json()).sale_id;
  });

  it("cancels an active sale and restores product stock", async () => {
    const stockBefore = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;

    const res = await cancelSale(
      makeJson(`/api/sales/${saleId}`, "DELETE", { reason: "Error del cliente" }),
      { params: Promise.resolve({ id: String(saleId) }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sale_id).toBe(saleId);
    expect(body.refund_id).toBeDefined();

    // Status must be cancelled
    const sale = state.db.prepare("SELECT status FROM sales WHERE id = ?").get(saleId) as { status: string };
    expect(sale.status).toBe("cancelled");

    // Stock restored
    const stockAfter = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;
    expect(stockAfter).toBe(stockBefore + 2);
  });

  it("creates a refund record with reason", async () => {
    await cancelSale(
      makeJson(`/api/sales/${saleId}`, "DELETE", { reason: "Motivo de prueba" }),
      { params: Promise.resolve({ id: String(saleId) }) }
    );
    const refund = state.db.prepare("SELECT * FROM sale_refunds WHERE sale_id = ?").get(saleId) as { reason: string; refunded_by: number };
    expect(refund.reason).toBe("Motivo de prueba");
    expect(refund.refunded_by).toBe(ids.adminId);
  });

  it("returns 409 when trying to cancel an already cancelled sale", async () => {
    // First cancellation
    await cancelSale(
      makeJson(`/api/sales/${saleId}`, "DELETE", {}),
      { params: Promise.resolve({ id: String(saleId) }) }
    );
    // Second attempt
    const res = await cancelSale(
      makeJson(`/api/sales/${saleId}`, "DELETE", {}),
      { params: Promise.resolve({ id: String(saleId) }) }
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/cancelada/i);
  });

  it("returns 403 for cashier role (only admin can cancel)", async () => {
    state.token = state.cashierToken;
    const res = await cancelSale(
      makeJson(`/api/sales/${saleId}`, "DELETE", {}),
      { params: Promise.resolve({ id: String(saleId) }) }
    );
    expect(res.status).toBe(403);
    state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  });

  it("returns 404 for non-existent sale", async () => {
    const res = await cancelSale(
      makeJson("/api/sales/99999", "DELETE", {}),
      { params: Promise.resolve({ id: "99999" }) }
    );
    expect(res.status).toBe(404);
  });

  it("cancelled sale does NOT appear in totals (stock restored is correct sum)", async () => {
    const stockAfterSale = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;
    await cancelSale(makeJson(`/api/sales/${saleId}`, "DELETE", {}), { params: Promise.resolve({ id: String(saleId) }) });
    const stockAfterCancel = (state.db.prepare("SELECT stock_sales FROM products WHERE id = ?").get(ids.productId) as { stock_sales: number }).stock_sales;
    expect(stockAfterCancel).toBeGreaterThan(stockAfterSale);
  });
});
