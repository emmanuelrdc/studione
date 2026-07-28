import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";

// JWT_SECRET is set in tests/setup.ts before this module is imported

describe("signToken / verifyToken", () => {
  const payload = { userId: 1, email: "a@b.com", role: "admin", name: "Test" };

  it("returns a non-empty JWT string", async () => {
    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // header.payload.signature
  });

  it("verifies a valid token and recovers the payload", async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(1);
    expect(result!.email).toBe("a@b.com");
    expect(result!.role).toBe("admin");
  });

  it("returns null for a tampered token", async () => {
    const token = await signToken(payload);
    const parts = token.split(".");
    parts[2] = "invalidsignature";
    const tampered = parts.join(".");
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a completely invalid string", async () => {
    expect(await verifyToken("not.a.jwt")).toBeNull();
  });

  it("returns null for empty string", async () => {
    expect(await verifyToken("")).toBeNull();
  });

  it("payload does NOT expose sensitive fields beyond the defined interface", async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token);
    // Only these fields should come back
    expect(result).toHaveProperty("userId");
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("role");
    expect(result).toHaveProperty("name");
    // Never a password
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it("token generated with different secret is rejected", async () => {
    // Manually construct a token with a different secret
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("completely-wrong-secret-32-chars!!");
    const foreignToken = await new SignJWT({ userId: 999, role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .setIssuedAt()
      .sign(wrongSecret);
    expect(await verifyToken(foreignToken)).toBeNull();
  });
});
