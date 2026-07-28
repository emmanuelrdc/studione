import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { writeAudit, auditContext } from "@/lib/audit";
import bcryptjs from "bcryptjs";

// Simple in-memory rate limit: max 5 failed login attempts per IP per 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const entry = rateLimitMap.get(ip);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= RATE_LIMIT;
}

// Only called on failed attempts — successful logins never count toward the limit
function registerFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count++;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    const attemptedEmail = typeof email === "string" ? email.slice(0, 200) : null;

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as {
      id: number; email: string; password: string; name: string; role: string;
    } | undefined;

    if (!user) {
      registerFailedAttempt(ip);
      writeAudit({ actor: null, action: "auth.login_failed", status: "denied", details: { email: attemptedEmail }, ...auditContext(request) });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const validPassword = bcryptjs.compareSync(password, user.password);
    if (!validPassword) {
      registerFailedAttempt(ip);
      writeAudit({ actor: null, action: "auth.login_failed", status: "denied", entityType: "user", entityId: user.id, details: { email: attemptedEmail }, ...auditContext(request) });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    writeAudit({
      actor: { userId: user.id, name: user.name, email: user.email },
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      ...auditContext(request),
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
