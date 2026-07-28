import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ db: null as any, token: "" as string | undefined }));

vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "token" && state.token ? { value: state.token } : undefined,
  }),
}));

import { signToken } from "@/lib/auth";
import { createTestDatabase, seedDatabase } from "../helpers/db";
import { GET, POST } from "@/app/api/appointments/route";

let ids: ReturnType<typeof seedDatabase>;

beforeAll(async () => {
  const db = createTestDatabase();
  ids = seedDatabase(db);
  state.db = db;
  state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
});

const makeReq = (url: string) => new NextRequest(`http://localhost${url}`);
const makeJson = (body: object) =>
  new NextRequest("http://localhost/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ── GET /api/appointments ────────────────────────────────────────────────────
describe("GET /api/appointments", () => {
  it("returns 401 without token", async () => {
    state.token = undefined;
    const res = await GET(makeReq("/api/appointments"));
    expect(res.status).toBe(401);
    state.token = await signToken({ userId: ids.adminId, email: "admin@test.com", role: "admin", name: "Admin" });
  });

  it("returns appointments array", async () => {
    // Seed an appointment
    state.db.prepare(
      "INSERT INTO appointments (client_name, date, time) VALUES (?, ?, ?)"
    ).run("Test Client", "2025-07-01", "10:00");

    const res = await GET(makeReq("/api/appointments?date=2025-07-01"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ── POST /api/appointments ───────────────────────────────────────────────────
describe("POST /api/appointments", () => {
  it("creates appointment with valid data", async () => {
    const res = await POST(makeJson({
      client_name: "María García",
      date: "2025-12-15",
      time: "14:30",
      end_time: "15:00",
      notes: "Primera visita",
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.client_name).toBe("María García");
  });

  it("returns 400 when client_name is empty", async () => {
    const res = await POST(makeJson({ client_name: "", date: "2025-12-15", time: "10:00" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/nombre/i);
  });

  it("returns 400 for invalid date format (DD/MM/YYYY)", async () => {
    const res = await POST(makeJson({ client_name: "Ana", date: "15/12/2025", time: "10:00" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/fecha/i);
  });

  it("returns 400 for semantically invalid date (Feb 30)", async () => {
    const res = await POST(makeJson({ client_name: "Ana", date: "2025-02-30", time: "10:00" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid time (25:00)", async () => {
    const res = await POST(makeJson({ client_name: "Ana", date: "2025-12-15", time: "25:00" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/hora/i);
  });

  it("returns 400 for invalid time format (9:30 instead of 09:30)", async () => {
    const res = await POST(makeJson({ client_name: "Ana", date: "2025-12-15", time: "9:30" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid end_time", async () => {
    const res = await POST(makeJson({ client_name: "Ana", date: "2025-12-15", time: "10:00", end_time: "bad" }));
    expect(res.status).toBe(400);
  });

  it("accepts valid end_time", async () => {
    const res = await POST(makeJson({ client_name: "Luis", date: "2025-12-15", time: "10:00", end_time: "11:00" }));
    expect(res.status).toBe(201);
  });

  it("sanitizes notes to max 1000 chars", async () => {
    const longNotes = "a".repeat(1500);
    const res = await POST(makeJson({ client_name: "Test", date: "2025-12-20", time: "09:00", notes: longNotes }));
    expect(res.status).toBe(201);
    const row = state.db.prepare("SELECT notes FROM appointments WHERE client_name = 'Test' ORDER BY id DESC LIMIT 1").get() as { notes: string };
    expect(row.notes.length).toBeLessThanOrEqual(1000);
  });
});
