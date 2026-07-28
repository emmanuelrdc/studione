import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { validateId, sanitizeString, isNonEmptyString } from "@/lib/validation";
import bcryptjs from "bcryptjs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  try {
    const body = await request.json();
    const { name, email, role, password, active } = body;

    const db = getDb();
    const existing = db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(id) as { id: number; email: string; role: string } | undefined;
    if (!existing) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Prevent admin from deactivating themselves
    if (active === 0 && id === session.userId) {
      return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 });
    }

    // Prevent deactivating the last active admin
    if (active === 0 && existing.role === "admin") {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = 1 AND id != ?").get(id) as { count: number };
      if (adminCount.count === 0) {
        return NextResponse.json({ error: "No se puede desactivar el último administrador activo" }, { status: 400 });
      }
    }

    // Prevent downgrading the last active admin to cashier
    if (role === "cashier" && existing.role === "admin") {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = 1 AND id != ?").get(id) as { count: number };
      if (adminCount.count === 0) {
        return NextResponse.json({ error: "No se puede cambiar el rol del último administrador activo" }, { status: 400 });
      }
    }

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (name !== undefined) {
      if (!isNonEmptyString(name)) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
      fields.push("name = ?"); values.push(sanitizeString(name, 200)!);
    }
    if (email !== undefined) {
      if (!isNonEmptyString(email) || !email.includes("@")) {
        return NextResponse.json({ error: "Email inválido" }, { status: 400 });
      }
      const conflict = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email.trim().toLowerCase(), id);
      if (conflict) return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
      fields.push("email = ?"); values.push(email.trim().toLowerCase());
    }
    if (role !== undefined) {
      if (!["admin", "cashier"].includes(role)) {
        return NextResponse.json({ error: "Rol debe ser 'admin' o 'cashier'" }, { status: 400 });
      }
      fields.push("role = ?"); values.push(role);
    }
    if (active !== undefined) {
      fields.push("active = ?"); values.push(active ? 1 : 0);
    }
    if (password !== undefined) {
      if (!isNonEmptyString(password) || password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }
      fields.push("password = ?"); values.push(bcryptjs.hashSync(password, 10));
    }

    if (fields.length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    values.push(id);
    // Column names only — records THAT the password changed, never its value.
    const changedColumns = fields.map((f) => f.split(" ")[0]);
    const passwordChanged = changedColumns.includes("password");

    db.transaction(() => {
      db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
      writeAuditTx(db, {
        actor: actorFromSession(session),
        action: passwordChanged ? "user.reset_password" : "user.update",
        entityType: "user",
        entityId: id,
        details: { changed: changedColumns, role: role ?? undefined, active: active ?? undefined },
        ...auditContext(request),
      });
    })();

    const updated = db.prepare("SELECT id, email, name, role, active, created_at FROM users WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;
  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (id instanceof NextResponse) return id;

  if (id === session.userId) {
    return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id) as { id: number; role: string } | undefined;
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Prevent deactivating the last active admin
  if (user.role === "admin") {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = 1 AND id != ?").get(id) as { count: number };
    if (adminCount.count === 0) {
      return NextResponse.json({ error: "No se puede desactivar el último administrador activo" }, { status: 400 });
    }
  }

  db.transaction(() => {
    db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(id);
    writeAuditTx(db, {
      actor: actorFromSession(session),
      action: "user.delete",
      entityType: "user",
      entityId: id,
      details: { role: user.role },
      ...auditContext(request),
    });
  })();

  return NextResponse.json({ success: true });
}
