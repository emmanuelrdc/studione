import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  db: null as any,
  token: "" as string | undefined,
}));

vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "token" && state.token ? { value: state.token } : undefined),
  }),
}));

import { signToken } from "@/lib/auth";
import { createTestDatabase, seedDatabase } from "../helpers/db";
import { POST as createSale } from "@/app/api/sales/route";
import { DELETE as cancelSale } from "@/app/api/sales/[id]/route";
import { PUT as updateUser } from "@/app/api/users/[id]/route";
import { POST as login } from "@/app/api/auth/login/route";

let ids: ReturnType<typeof seedDatabase>;

beforeAll(async () => {
  const db = createTestDatabase();
  ids = seedDatabase(db);
  state.db = db;
  state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
});

beforeEach(() => {
  state.db.prepare("DELETE FROM audit_logs").run();
  state.db.prepare("UPDATE products SET stock_sales = 10 WHERE id = ?").run(ids.productId);
  state.db.prepare("UPDATE cash_registers SET status = 'open' WHERE user_id = ?").run(ids.adminId);
});

const json = (url: string, method: string, body: object) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9", "user-agent": "vitest-agent" },
    body: JSON.stringify(body),
  });

const auditRow = (action: string) =>
  state.db.prepare("SELECT * FROM audit_logs WHERE action = ? ORDER BY id DESC").get(action) as Record<string, unknown> | undefined;

describe("audit write-path integration", () => {
  it("sale.create is logged atomically with the sale, carrying actor + ip", async () => {
    const res = await createSale(
      json("/api/sales", "POST", {
        items: [{ name: "Shampoo Test", quantity: 1, unit_price: 150, product_id: ids.productId }],
        payment_method: "cash",
        amount_paid: 150,
      })
    );
    expect(res.status).toBe(201);
    const saleId = (await res.json()).sale_id;

    const row = auditRow("sale.create");
    expect(row).toBeDefined();
    expect(row!.user_id).toBe(ids.adminId);
    expect(row!.entity_id).toBe(saleId);
    expect(row!.ip).toBe("9.9.9.9");
    expect(row!.user_agent).toBe("vitest-agent");
  });

  it("sale.cancel is logged", async () => {
    const created = await createSale(
      json("/api/sales", "POST", {
        items: [{ name: "Shampoo Test", quantity: 1, unit_price: 150, product_id: ids.productId }],
        payment_method: "cash",
        amount_paid: 150,
      })
    );
    const saleId = (await created.json()).sale_id;

    const res = await cancelSale(json(`/api/sales/${saleId}`, "DELETE", { reason: "prueba" }), {
      params: Promise.resolve({ id: String(saleId) }),
    });
    expect(res.status).toBe(200);
    expect(auditRow("sale.cancel")).toBeDefined();
  });

  it("password reset logs 'user.reset_password' and NEVER stores the password", async () => {
    const res = await updateUser(json(`/api/users/${ids.cashierId}`, "PUT", { password: "brand-new-secret-123" }), {
      params: Promise.resolve({ id: String(ids.cashierId) }),
    });
    expect(res.status).toBe(200);

    const row = auditRow("user.reset_password");
    expect(row).toBeDefined();
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain("brand-new-secret-123");
  });

  it("failed login logs 'auth.login_failed' with null actor and denied status", async () => {
    const res = await login(json("/api/auth/login", "POST", { email: "admin@test.com", password: "wrong-password" }));
    expect(res.status).toBe(401);

    const row = auditRow("auth.login_failed");
    expect(row).toBeDefined();
    expect(row!.user_id).toBeNull();
    expect(row!.status).toBe("denied");
  });
});
