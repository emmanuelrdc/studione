import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { sanitizeString, isNonEmptyString } from "@/lib/validation";
import bcryptjs from "bcryptjs";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth as JWTPayload, ["admin"]);
  if (roleCheck) return roleCheck;

  const db = getDb();
  const users = db.prepare(
    "SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at DESC"
  ).all();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const { email, name, role, password } = body;

    if (!isNonEmptyString(email) || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    if (!["admin", "cashier"].includes(role)) {
      return NextResponse.json({ error: "Rol debe ser 'admin' o 'cashier'" }, { status: 400 });
    }
    if (!isNonEmptyString(password) || password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const safeEmail = email.trim().toLowerCase();
    const safeName = sanitizeString(name, 200)!;

    const newUserId = db.transaction(() => {
      const result = db.prepare(
        "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)"
      ).run(safeEmail, hashedPassword, safeName, role);
      const uid = Number(result.lastInsertRowid);
      writeAuditTx(db, {
        actor: actorFromSession(session),
        action: "user.create",
        entityType: "user",
        entityId: uid,
        details: { email: safeEmail, role }, // never the password/hash
        ...auditContext(request),
      });
      return uid;
    })();

    const user = db.prepare("SELECT id, email, name, role, active, created_at FROM users WHERE id = ?").get(newUserId);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
