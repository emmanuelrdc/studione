import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";

// ── Shared mock state (vi.hoisted runs before imports) ─────────────────────
const state = vi.hoisted(() => ({ db: null as any, token: "" as string | undefined }));

vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "token" && state.token ? { value: state.token } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// ── Imports after mocks ─────────────────────────────────────────────────────
import Database from "better-sqlite3";
import bcryptjs from "bcryptjs";
import { signToken } from "@/lib/auth";
import { createTestDatabase, seedDatabase } from "../helpers/db";

// Route handlers
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as logout } from "@/app/api/auth/logout/route";

// ── Setup ───────────────────────────────────────────────────────────────────
let adminId: number;

beforeAll(async () => {
  const db = createTestDatabase();
  const seed = seedDatabase(db);
  state.db = db;
  adminId = seed.adminId;
  state.token = await signToken({
    userId: adminId,
    email: "admin@test.com",
    role: "admin",
    name: "Admin Test",
  });
});

// ── POST /api/auth/login ────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  const makeReq = (body: object) =>
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 200 and sets httpOnly cookie on valid credentials", async () => {
    const res = await login(makeReq({ email: "admin@test.com", password: "admin123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("admin@test.com");
    expect(body.user.role).toBe("admin");
    // Cookie must be set
    expect(res.headers.get("set-cookie")).toMatch(/token=/);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  });

  it("never returns password hash in response", async () => {
    const res = await login(makeReq({ email: "admin@test.com", password: "admin123" }));
    const body = await res.json();
    expect(body.user.password).toBeUndefined();
    // Stringify just in case the hash is nested somewhere
    expect(JSON.stringify(body)).not.toMatch(/\$2[ab]\$/);
  });

  it("returns 401 for wrong password", async () => {
    const res = await login(makeReq({ email: "admin@test.com", password: "wrongpassword" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-existent user (same message as wrong password — no enumeration)", async () => {
    const res = await login(makeReq({ email: "ghost@test.com", password: "admin123" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    // The error message should NOT reveal whether the email exists
    expect(body.error).toBe("Credenciales inválidas");
  });

  it("returns 400 when email is missing", async () => {
    const res = await login(makeReq({ password: "admin123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await login(makeReq({ email: "admin@test.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty body", async () => {
    const res = await login(makeReq({}));
    expect(res.status).toBe(400);
  });
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
describe("GET /api/auth/me", () => {
  it("returns 200 with user info when token is valid", async () => {
    const res = await me(new NextRequest("http://localhost/api/auth/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Route returns { user: session }
    expect(body.user.email).toBe("admin@test.com");
    expect(body.user.password).toBeUndefined();
  });

  it("returns 401 when no token is present", async () => {
    const savedToken = state.token;
    state.token = undefined;
    const res = await me(new NextRequest("http://localhost/api/auth/me"));
    expect(res.status).toBe(401);
    state.token = savedToken;
  });
});

// ── POST /api/auth/logout ───────────────────────────────────────────────────
describe("POST /api/auth/logout", () => {
  it("returns 200 and clears the token cookie", async () => {
    const res = await logout(new NextRequest("http://localhost/api/auth/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    // Cookie should be cleared (max-age=0 or expires in the past)
    const setCookie = res.headers.get("set-cookie") ?? "";
    const hasExpired = setCookie.includes("Max-Age=0") ||
      setCookie.includes("max-age=0") ||
      setCookie.includes("Expires=") ||
      setCookie.includes("token=;");
    expect(hasExpired).toBe(true);
  });
});
