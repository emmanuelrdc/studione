import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { writeAudit, auditContext } from "@/lib/audit";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
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
      writeAudit({ actor: null, action: "auth.login_failed", status: "denied", details: { email: attemptedEmail }, ...auditContext(request) });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const validPassword = bcryptjs.compareSync(password, user.password);
    if (!validPassword) {
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
