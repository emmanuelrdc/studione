# Plan de Implementación — Módulo de Logs de Auditoría (Studio One)

> Diseño de backend **seguro sin gaps** para el rastro de auditoría. Registra quién hizo qué,
> cuándo, desde dónde y sobre qué registro, para toda operación que cambia estado en el sistema.
>
> **Documento de origen:** [PLAN.md](PLAN.md) → *Configuración y Sistema → Logs de auditoría*
> **Stack:** Next.js 16 / React 19 / SQLite (better-sqlite3, sin ORM) / JWT HS256 (jose)
> **Convención de migración:** bloque `try { db.exec(\`CREATE TABLE IF NOT EXISTS ...\`) } catch {}` en `initializeDatabase()` de [lib/db.ts](lib/db.ts).

---

## Resumen

| Métrica | Valor |
|---------|-------|
| **Módulo** | Logs de auditoría (`audit_logs` + `/admin/auditoria`) |
| **Tickets** | 7 (6 core + 1 opcional) |
| **Story points** | 21 (19 core + 2 opcional) |
| **Complejidad** | Media |
| **Olas de ejecución** | 3 |
| **Dependencia clave** | Todo depende del helper `lib/audit.ts` (AUD-2), que depende del esquema (AUD-1) |
| **Superficie nueva de mutación HTTP** | **Ninguna** — la tabla es *append-only*; se escribe solo desde `lib/audit.ts`, jamás vía endpoint |

**Principio rector:** el rastro de auditoría es un control de **seguridad**, no una feature de conveniencia.
Su valor depende de tres propiedades que el diseño garantiza: **integridad** (no se puede falsificar ni
mutar), **no-repudio** (el actor sale del JWT verificado, nunca del cliente) y **cobertura completa**
(toda ruta que cambia estado queda instrumentada — ver la matriz de la sección 4).

---

## 1. Modelo de datos

Nueva tabla en `initializeDatabase()` de [lib/db.ts](lib/db.ts), agregada como bloque
`try { db.exec(...) } catch {}` junto a las demás (p. ej. después de `promotions`):

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- actor (null si anónimo, p. ej. login fallido)
  user_name   TEXT,      -- snapshot denormalizado: sobrevive a rename o borrado del usuario
  user_email  TEXT,      -- snapshot denormalizado
  action      TEXT NOT NULL,                                    -- 'sale.cancel', 'product.update', 'auth.login_failed'
  entity_type TEXT,                                             -- 'sale', 'product', 'user', ...
  entity_id   INTEGER,                                          -- id del registro afectado
  status      TEXT NOT NULL DEFAULT 'success'
              CHECK(status IN ('success', 'denied', 'error')),  -- 'denied' = intento rechazado (403 / login fallido)
  details     TEXT,      -- JSON acotado, SOLO campos en whitelist (nunca secretos) — ver sección 3
  ip          TEXT,
  user_agent  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Índices (agregar al bloque `db.exec` de índices existente, al final de `initializeDatabase()`):

```sql
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_logs(entity_type, entity_id);
```

**Decisiones de diseño y por qué:**

- **`user_id ON DELETE SET NULL` + snapshot (`user_name`/`user_email`):** el sistema hace *soft-delete*
  de usuarios (columna `active`), pero si algún día se borra una fila de `users`, el log debe seguir
  siendo legible y no debe romper la integridad referencial. Guardar el nombre/email al momento del
  evento hace el registro auto-suficiente y resistente a rename.
- **Sin columnas `updated_at` / sin `ON UPDATE`:** la tabla es conceptualmente *inmutable*. No se expone
  ningún endpoint de UPDATE/DELETE (ver sección 5). Un registro, una vez escrito, no cambia.
- **`status`:** permite registrar no solo lo que ocurrió, sino los **intentos rechazados** (403 de RBAC,
  logins fallidos). Esto es lo que convierte el log en una herramienta de *detección*, no solo de historial.

---

## 2. Helper central `lib/audit.ts` (AUD-2)

Único punto de escritura del rastro. Ninguna ruta arma el INSERT a mano.

```typescript
import type BetterSqlite3 from "better-sqlite3";
import { getDb } from "./db";
import type { JWTPayload } from "./auth";

const MAX_DETAILS_CHARS = 2000;

export interface AuditActor {
  userId: number;
  name: string;
  email: string;
}

export interface AuditEntry {
  actor: AuditActor | null;              // SIEMPRE del JWT verificado; null solo para anónimo (login)
  action: string;                        // 'entity.verb', p. ej. 'sale.cancel'
  entityType?: string | null;
  entityId?: number | null;
  status?: "success" | "denied" | "error";
  details?: Record<string, unknown>;     // se serializa con whitelist + recorte, nunca secretos
  ip?: string | null;
  userAgent?: string | null;
}

// Extrae IP + user-agent del request en el servidor (mismo patrón que app/api/contact/route.ts)
export function auditContext(request: { headers: Headers }): { ip: string | null; userAgent: string | null } {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) || null;
  return { ip, userAgent };
}

// Convierte JWTPayload -> AuditActor (helper de conveniencia)
export function actorFromSession(session: JWTPayload): AuditActor {
  return { userId: session.userId, name: session.name, email: session.email };
}

function serializeDetails(details?: Record<string, unknown>): string | null {
  if (!details) return null;
  try {
    return JSON.stringify(details).slice(0, MAX_DETAILS_CHARS);
  } catch {
    return null;
  }
}

const INSERT_SQL =
  `INSERT INTO audit_logs (user_id, user_name, user_email, action, entity_type, entity_id, status, details, ip, user_agent)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// --- Variante transaccional: se une a un db.transaction() del caller (ATÓMICA con la operación) ---
export function writeAuditTx(db: BetterSqlite3.Database, e: AuditEntry): void {
  db.prepare(INSERT_SQL).run(
    e.actor?.userId ?? null,
    e.actor?.name ?? null,
    e.actor?.email ?? null,
    e.action,
    e.entityType ?? null,
    e.entityId ?? null,
    e.status ?? "success",
    serializeDetails(e.details),
    e.ip ?? null,
    e.userAgent ?? null,
  );
}

// --- Variante best-effort: NUNCA lanza; se usa fuera de transacción (ops no críticas) ---
export function writeAudit(e: AuditEntry): void {
  try {
    writeAuditTx(getDb(), e);
  } catch (err) {
    console.error("[audit] fallo al registrar (operación no afectada):", err);
  }
}
```

### Integridad vs. disponibilidad — la decisión clave

| Tipo de operación | Cómo se registra | Garantía |
|-------------------|------------------|----------|
| **Crítica** (dinero / inventario / cuentas): `sale.create`, `sale.cancel`, `product.stock_adjust`, `cash_register.open/close`, `cash_exit.create`, `user.*`, `settings.update`, `promotion.*` | `writeAuditTx(db, ...)` **dentro** del `db.transaction()` existente de la ruta | **Atómica**: no hay cambio sin log ni log sin cambio. Si el INSERT del log falla, la operación entera hace rollback (a prueba de manipulación). |
| **Estándar** (catálogo / CRUD de bajo riesgo): brands, categories, clients, services, appointments, gallery, upload | `writeAudit(...)` (best-effort) tras la respuesta exitosa | El fallo del log **no** rompe la operación (disponibilidad > integridad estricta para datos no financieros). |

better-sqlite3 es **síncrono**, así que `writeAuditTx` encaja dentro de un `db.transaction(() => { ... })`
sin `await`. Para `sale.cancel` (que ya usa `db.transaction`, ver [app/api/sales/[id]/route.ts:60](app/api/sales/%5Bid%5D/route.ts#L60)),
la línea del audit va dentro de ese mismo bloque.

---

## 3. Reglas de contenido de `details` (cierre de gap de fuga de datos)

`details` es el campo de mayor riesgo: es texto libre que podría filtrar secretos. Reglas **obligatorias**:

- ✅ **Whitelist explícita de campos.** Nunca `JSON.stringify(row)` de una fila completa. Se listan a mano
  los campos relevantes.
- ❌ **Prohibido registrar:** `password`, hash de contraseña, JWT/token, `INITIAL_ADMIN_PASSWORD`,
  `JWT_SECRET`, credenciales SMTP, o cualquier PII innecesaria.
- ✅ **Cambios = `{ before, after }`** solo con los campos relevantes. Ejemplo `product.update`:
  `{ before: { price: 290, stock_sales: 12 }, after: { price: 310, stock_sales: 12 } }`.
- ✅ **`user.reset_password`** registra `{ target_user_id: 5 }` — **jamás** la contraseña nueva ni su hash.
- ✅ Recorte duro a 2000 chars (ya en `serializeDetails`).

> El `details` se renderiza en React (auto-escapa) y, si se exporta a CSV en el futuro, debe escaparse
> para evitar *log/CSV injection* (celdas que empiezan con `=`, `+`, `-`, `@`).

---

## 4. Matriz de instrumentación — cobertura sin gaps

Cada ruta que **cambia estado** debe emitir exactamente un evento por operación exitosa (y opcionalmente
uno `status:'denied'` cuando `requireRole` rechaza). Rutas *solo-GET* no se instrumentan. Inventario
derivado de los 32 route handlers en `app/api/**`:

| Ruta | Métodos mutantes | `action` | Registro | Ola |
|------|------------------|----------|----------|-----|
| `api/auth/login` | POST | `auth.login` / `auth.login_failed` (`denied`) | best-effort, `actor=null` en fallo | AUD-3 |
| `api/auth/logout` | POST | `auth.logout` | best-effort | AUD-3 |
| `api/sales` | POST | `sale.create` | **Tx** | AUD-3 |
| `api/sales/[id]` | DELETE | `sale.cancel` | **Tx** (bloque existente) | AUD-3 |
| `api/products/[id]/adjust` | POST | `product.stock_adjust` | **Tx** | AUD-3 |
| `api/users` | POST | `user.create` | **Tx** | AUD-3 |
| `api/users/[id]` | PUT / DELETE / reset-password | `user.update` / `user.delete` / `user.reset_password` | **Tx** | AUD-3 |
| `api/cash-register` | POST / PATCH/PUT | `cash_register.open` / `cash_register.close` | **Tx** | AUD-3 |
| `api/cash-exits` | POST | `cash_exit.create` | **Tx** | AUD-3 |
| `api/settings` | PUT/PATCH | `settings.update` | **Tx** | AUD-3 |
| `api/promotions` | POST | `promotion.create` | **Tx** | AUD-3 |
| `api/promotions/[id]` | PUT / DELETE | `promotion.update` / `promotion.delete` | **Tx** | AUD-3 |
| `api/products` | POST | `product.create` | best-effort | AUD-4 |
| `api/products/[id]` | PUT / DELETE | `product.update` / `product.delete` | best-effort (`before/after` en precio) | AUD-4 |
| `api/services` + `[id]` | POST / PUT / DELETE | `service.*` | best-effort | AUD-4 |
| `api/clients` + `[id]` | POST / PUT / DELETE | `client.*` | best-effort | AUD-4 |
| `api/brands` + `[id]` | POST / PUT / DELETE | `brand.*` | best-effort | AUD-4 |
| `api/categories` | POST / PUT / DELETE | `category.*` | best-effort | AUD-4 |
| `api/appointments` + `[id]` | POST / PUT / DELETE | `appointment.*` | best-effort | AUD-4 |
| `api/internal-consumption` | POST | `internal_consumption.create` | best-effort | AUD-4 |
| `api/gallery` + `[id]` | POST / PUT / DELETE | `gallery.*` | best-effort | AUD-4 |
| `api/upload` | POST | `upload.create` | best-effort | AUD-4 |
| `api/contact` | POST | — (público; ya persiste con IP en `contact_messages`) | **no auditar** | — |
| `api/notifications` | PATCH (marcar leído) | — (ruido, no relevante para seguridad) | **no auditar** | — |

> **Regla anti-gap para el implementador:** al terminar AUD-3/AUD-4, correr `grep -rL "writeAudit" app/api`
> filtrado a los handlers no-GET de esta tabla; cualquier ruta mutante sin referencia a `writeAudit`/`writeAuditTx`
> es un gap. La lista de "no auditar" es la única excepción permitida.

---

## 5. API de lectura `GET /api/audit-logs` (AUD-5)

Solo lectura, solo admin. **No se exportan `POST`/`PUT`/`DELETE`** — esa ausencia es intencional y es lo
que hace la tabla *append-only* desde el mundo HTTP.

```typescript
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const session = auth as JWTPayload;

  const roleCheck = requireRole(session, ["admin"]);   // 403 si no es admin
  if (roleCheck) return roleCheck;

  const sp = request.nextUrl.searchParams;

  // Paginación con clamp duro (anti-DoS / anti-volcado masivo)
  const page  = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 50));
  const offset = (page - 1) * limit;

  // Filtros: se construye el WHERE SOLO con columnas de una allowlist + valores parametrizados
  const where: string[] = [];
  const args: unknown[] = [];

  const action = sanitizeString(sp.get("action"), 60);
  if (action) { where.push("action = ?"); args.push(action); }

  const entityType = sanitizeString(sp.get("entity_type"), 40);
  if (entityType) { where.push("entity_type = ?"); args.push(entityType); }

  const userId = sp.get("user_id");
  if (userId && parseId(userId)) { where.push("user_id = ?"); args.push(parseId(userId)); }

  const status = sp.get("status");
  if (status && ["success","denied","error"].includes(status)) { where.push("status = ?"); args.push(status); }

  const from = sp.get("from");
  if (isValidDate(from)) { where.push("created_at >= ?"); args.push(from + " 00:00:00"); }
  const to = sp.get("to");
  if (isValidDate(to)) { where.push("created_at <= ?"); args.push(to + " 23:59:59"); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDb();

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM audit_logs ${whereSql}`).get(...args) as { c: number }).c;
  const data = db.prepare(
    `SELECT * FROM audit_logs ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...args, limit, offset);

  return NextResponse.json({ data, total, page, pages: Math.ceil(total / limit) });
}
```

**Cierres de gap en la lectura:**
- Nombres de columna **hardcodeados** (allowlist), nunca interpolados desde el request → sin SQL injection
  aunque el filtro sea dinámico.
- `from`/`to` validados con `isValidDate` (ya rechaza `2024-13-32`, ver [lib/validation.ts:38](lib/validation.ts#L38)).
- `limit` con tope 100 → no se puede pedir un volcado ilimitado.
- Ordena por `id DESC` (más reciente primero) usando el índice de PK.

---

## 6. UI `/admin/auditoria` (AUD-6)

- Página client-side `app/admin/auditoria/page.tsx` siguiendo el patrón de las demás páginas admin.
- Tabla: Fecha · Usuario (`user_name`) · Acción · Entidad (`entity_type #id`) · Estado (badge:
  verde `success`, rojo `denied`, amarillo `error`) · IP · detalles expandibles (`details` formateado).
- Filtros arriba: rango de fechas, acción (select con las `action` conocidas), usuario, estado.
- Paginación (prev/next) leyendo `{ page, pages, total }` de la API.
- **Gating de rol en la UI:** agregar el ítem de nav "Auditoría" en [app/admin/layout.tsx](app/admin/layout.tsx)
  **solo si `user.role === "admin"`** (hoy el `navItems` no filtra por rol; para este ítem sí debe filtrarse).
  La protección real vive en la API y en un guard de la página que redirige a `/admin` si el `/api/auth/me`
  no es admin — la ocultación del nav es solo cosmética.

---

## 7. Tickets (auto-contenidos)

### AUD-1 — Esquema `audit_logs` + índices · 2 pts · *sin dependencias*
- **Archivos:** [lib/db.ts](lib/db.ts)
- **Pasos:** agregar el bloque `CREATE TABLE IF NOT EXISTS audit_logs (...)` (sección 1) como
  `try { db.exec(...) } catch {}` junto a las demás migraciones; agregar los 4 índices al `db.exec`
  final de índices.
- **Criterios de aceptación:** `pnpm build` limpio; al levantar la app la tabla existe
  (`SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'`); columnas y CHECK correctos.

### AUD-2 — Helper `lib/audit.ts` + tests · 3 pts · *dep: AUD-1*
- **Archivos:** `lib/audit.ts` (nuevo), `tests/audit.test.ts` (nuevo)
- **Pasos:** implementar `writeAuditTx`, `writeAudit`, `auditContext`, `actorFromSession`, `serializeDetails`
  (sección 2).
- **Tests (vitest):**
  - `writeAuditTx` inserta una fila con los campos correctos.
  - `serializeDetails` recorta a 2000 chars y devuelve `null` ante entrada circular.
  - `writeAudit` **no lanza** si el INSERT falla (mock que arroja) — la app nunca se cae por el log.
  - `auditContext` extrae la primera IP de `x-forwarded-for` y recorta el user-agent.
  - **Test de seguridad:** un `details` que incluya una clave `password` **no** debe escribirse salvo que
    el llamador la haya puesto explícitamente → el test documenta que la responsabilidad de whitelist es
    del *caller* y verifica que el helper no agrega campos por su cuenta.
- **Criterios:** `pnpm test` verde.

### AUD-3 — Instrumentar mutaciones críticas (transaccional) · 5 pts · *dep: AUD-2*
- **Archivos:** rutas marcadas "AUD-3 / Tx" en la matriz (sección 4).
- **Pasos:** en cada handler, tras validar auth/rol y **dentro** del `db.transaction()` de la operación,
  llamar `writeAuditTx(db, { actor: actorFromSession(session), action, entityType, entityId, ...auditContext(request), details })`.
  Donde la ruta aún no use `db.transaction`, envolver la mutación + el audit en una.
  En `login` fallido y en rechazos de `requireRole`, emitir `status:'denied'`.
- **Criterios:** cancelar una venta escribe `sale.cancel` **atómicamente** (si se fuerza un error en el
  INSERT del log, la venta **no** queda cancelada); un `reset_password` registra `{target_user_id}` y
  **nunca** la contraseña; login fallido deja `auth.login_failed` con `user_id NULL`.

### AUD-4 — Instrumentar CRUD estándar (best-effort) · 3 pts · *dep: AUD-2 · paralelo a AUD-3*
- **Archivos:** rutas marcadas "AUD-4" en la matriz.
- **Pasos:** tras la respuesta exitosa, `writeAudit({...})`. En updates de producto incluir
  `{ before:{price}, after:{price} }`.
- **Criterios:** `grep -rL "writeAudit" app/api` sobre los handlers no-GET no arroja ninguna ruta fuera de
  la lista "no auditar"; forzar fallo del log **no** rompe la creación de un cliente.

### AUD-5 — API de lectura `GET /api/audit-logs` · 3 pts · *dep: AUD-1 · paralelo a AUD-3/4*
- **Archivos:** `app/api/audit-logs/route.ts` (nuevo, **solo** exporta `GET`), `tests/audit-logs-api.test.ts`
- **Pasos:** implementar el handler de la sección 5.
- **Tests:** 401 sin sesión; 403 con rol `cashier`; 200 admin; paginación (`limit` clamp a 100);
  filtro por `action`/`status`/rango de fechas; inyección en `action` (`' OR '1'='1`) devuelve 0 filas
  (parametrizado), no error 500.
- **Criterios:** `pnpm test` verde; sin `POST/PUT/DELETE` exportados.

### AUD-6 — Página `/admin/auditoria` + nav gateado · 3 pts · *dep: AUD-5*
- **Archivos:** `app/admin/auditoria/page.tsx` (nuevo), [app/admin/layout.tsx](app/admin/layout.tsx)
- **Pasos:** tabla + filtros + paginación (sección 6); agregar ítem de nav "Auditoría" condicionado a
  `user?.role === "admin"`; guard de página que redirige si no es admin.
- **Criterios:** admin ve el rastro y filtra; un `cashier` que navegue directo a `/admin/auditoria` es
  redirigido y la API le responde 403.

### AUD-7 (opcional) — Retención / purga configurable · 2 pts · *dep: AUD-1*
- **Archivos:** `lib/audit.ts` (función `purgeOldAuditLogs(days)`), punto de invocación (p. ej. en el
  arranque o un endpoint admin).
- **Pasos:** `DELETE FROM audit_logs WHERE created_at < datetime('now', ?)` con `-N days`. Default:
  **conservar** (retención larga, 365 días) — a diferencia de las notificaciones, el rastro de auditoría
  se retiene por cumplimiento.
- **Criterios:** purga solo registros más viejos que el umbral; default no borra nada agresivamente.

---

## 8. Orden de ejecución y olas

```
Ola 1 (fundación)     AUD-1 ──▶ AUD-2
                                 │
Ola 2 (instrumentar   ┌──────────┼───────────┐
       + lectura)     ▼          ▼           ▼
                    AUD-3      AUD-4       AUD-5   (paralelizables)
                                              │
Ola 3 (UI)                                    ▼
                                            AUD-6
Opcional (cualquier momento tras AUD-1):    AUD-7
```

| # | Ticket | Pts | Riesgo | Depende de |
|---|--------|-----|--------|-----------|
| 1 | AUD-1 Esquema | 2 | Bajo | — |
| 2 | AUD-2 Helper + tests | 3 | Bajo | AUD-1 |
| 3 | AUD-3 Mutaciones críticas | 5 | **Medio** (tocar rutas de dinero/inventario) | AUD-2 |
| 4 | AUD-4 CRUD estándar | 3 | Bajo | AUD-2 |
| 5 | AUD-5 API de lectura | 3 | Bajo | AUD-1 |
| 6 | AUD-6 UI + nav | 3 | Bajo | AUD-5 |
| 7 | AUD-7 Retención (opcional) | 2 | Bajo | AUD-1 |

---

## 9. Checklist de seguridad — "sin gaps"

Cada ítem es una amenaza concreta y cómo el diseño la cierra:

- [ ] **Suplantación de actor (repudio):** el actor sale **siempre** de `session` (JWT verificado por
      `requireAuth`), jamás del body. `writeAuditTx` no acepta `user_id` desde el request.
- [ ] **Manipulación / borrado del log:** sin endpoints de UPDATE/DELETE; escritura solo vía `lib/audit`;
      ops críticas registradas **dentro de la transacción** (atómicas, a prueba de rollback selectivo).
- [ ] **Fuga de datos sensibles en `details`:** whitelist obligatoria; prohibido password/hash/token/secretos;
      recorte a 2000 chars (sección 3).
- [ ] **Broken access control en el visor:** `GET /api/audit-logs` exige `requireAuth` + `requireRole(['admin'])`;
      página con guard + nav gateado.
- [ ] **SQL injection en filtros:** columnas por allowlist hardcodeada + valores parametrizados; fechas
      validadas con `isValidDate`; `status`/`action` acotados.
- [ ] **DoS / volcado masivo:** `limit` con tope 100, paginación obligatoria, consultas indexadas.
- [ ] **Gaps de cobertura:** matriz exhaustiva (sección 4) + verificación `grep -rL "writeAudit"` al cerrar
      AUD-3/AUD-4.
- [ ] **Disponibilidad vs integridad:** best-effort (`writeAudit`, try/catch, nunca lanza) para CRUD;
      transaccional (`writeAuditTx`) para dinero/inventario/cuentas.
- [ ] **Detección de abuso:** se registran intentos rechazados (`status:'denied'`) y logins fallidos
      (`auth.login_failed`, `user_id NULL`).
- [ ] **Log/CSV injection:** `details` se renderiza escapado por React; cualquier export CSV futuro debe
      neutralizar celdas que inicien con `= + - @`.

---

## 10. Verificación al terminar (antes de dar por cerrado)

1. `pnpm build` limpio (sin warnings nuevos).
2. `pnpm test` verde, incluyendo los nuevos `tests/audit*.test.ts`.
3. `pnpm audit --prod` sin regresiones.
4. **Prueba en vivo** contra el dev server:
   - Cancelar una venta → aparece `sale.cancel` en `/admin/auditoria` con el usuario correcto y la IP.
   - Login fallido → aparece `auth.login_failed` con `user_id NULL` y `status='denied'`.
   - `reset_password` → el registro **no** contiene la contraseña.
   - `GET /api/audit-logs` como `cashier` → **403**; sin sesión → **401**.
   - Inyección `?action=' OR '1'='1` → responde `{ data: [] }`, no 500.
5. `grep -rL "writeAudit" app/api` sobre handlers no-GET → sin gaps fuera de la lista permitida.
```
