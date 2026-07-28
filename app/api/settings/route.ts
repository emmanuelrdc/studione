import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, type JWTPayload } from "@/lib/auth";
import { writeAuditTx, actorFromSession, auditContext } from "@/lib/audit";
import { clampDiscount, coerceBool } from "@/lib/validation";
import { DEFAULT_POS_SETTINGS, type PosSettings } from "@/lib/types";

function loadSettings(): PosSettings {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pos_settings WHERE id = 1").get() as PosSettings | undefined;
  if (!row) {
    // Defensive: should be seeded at init, but never return null
    db.prepare(
      "INSERT OR IGNORE INTO pos_settings (id, theme, allow_discounts, allow_promotions, show_clients_panel, birthday_discount_enabled, birthday_discount_percent) VALUES (1, 'dark', 0, 0, 1, 0, 0)"
    ).run();
    return { ...DEFAULT_POS_SETTINGS };
  }
  return row;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = loadSettings();
    return NextResponse.json(settings, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  const roleCheck = requireRole(session, ["admin"]);
  if (roleCheck) return roleCheck;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body debe ser un objeto" }, { status: 400 });
  }

  // Build PATCH-merge update set with strict per-field validation
  const updates: Record<string, string | number> = {};

  if ("theme" in body) {
    if (body.theme !== "dark" && body.theme !== "light") {
      return NextResponse.json({ error: "theme debe ser 'dark' o 'light'" }, { status: 400 });
    }
    updates.theme = body.theme;
  }

  const boolFields = [
    "allow_discounts",
    "allow_promotions",
    "show_clients_panel",
    "birthday_discount_enabled",
  ] as const;
  for (const f of boolFields) {
    if (f in body) {
      const v = coerceBool(body[f]);
      if (v === null) {
        return NextResponse.json({ error: `${f} debe ser booleano` }, { status: 400 });
      }
      updates[f] = v;
    }
  }

  if ("birthday_discount_percent" in body) {
    const raw = body.birthday_discount_percent;
    if (raw !== null && raw !== undefined && typeof raw !== "number" && typeof raw !== "string") {
      return NextResponse.json({ error: "birthday_discount_percent debe ser número" }, { status: 400 });
    }
    updates.birthday_discount_percent = clampDiscount(raw);
  }

  try {
    const db = getDb();

    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map(k => `${k} = ?`).join(", ");
      const params = Object.values(updates);
      db.transaction(() => {
        db.prepare(
          `UPDATE pos_settings SET ${setClause}, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`
        ).run(...params, session.userId);
        writeAuditTx(db, {
          actor: actorFromSession(session),
          action: "settings.update",
          entityType: "settings",
          entityId: 1,
          details: { ...updates },
          ...auditContext(request),
        });
      })();
    }

    const settings = loadSettings();
    return NextResponse.json(settings, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
