# Plan de Revisión — Studione (Studio One)

Sistema de gestión integral para salón de belleza: POS + agenda de citas + landing page pública conectada al admin.

**Stack:** Next.js 16 / React 19 / TypeScript / SQLite (better-sqlite3, sin ORM) / JWT HS256 (jose + bcryptjs) / Tailwind v4 / pnpm 11.4

---

## Índice

- [Parte 1 — Lo que falta para terminar el sistema](#parte-1--lo-que-falta-para-terminar-el-sistema)
- [Parte 2 — Verificación del flujo completo](#parte-2--verificación-del-flujo-completo)
- [Parte 3 — Pruebas de seguridad](#parte-3--pruebas-de-seguridad)

---

## Parte 1 — Lo que falta para terminar el sistema

Organizado por módulo del sistema. Lo que ya está marcado con ✅ fue aplicado en sesiones anteriores.

---

### POS (Punto de Venta)

**Estado actual:** Funcional en flujo feliz. Error handling ausente — fallas de API silenciosas.

- [ ] **Error handling en `handleCompleteSale()`** — mostrar banner rojo con el error específico de la API (e.g. "Stock insuficiente", "No hay caja abierta")
- [ ] **Error handling en `handleOpenRegister()`** — rama `else` que muestra `data.error` en banner
- [ ] **Reemplazar `window.prompt()` en cierre de caja** — modal propio con input `closing_amount`, botón Confirmar/Cancelar; solo actualiza estado si `res.ok === true`
- [ ] **Límite de cantidad por ítem** — `MAX_CART_QTY = 99` en la función `updateQuantity`
- [ ] **Integrar promociones en cobro** — (pendiente hasta que exista el módulo de Promotions)

**Patrón para el banner de error:**
```typescript
const [error, setError] = useState<string | null>(null);
// En JSX, arriba del área principal del POS:
// {error && <div className="banner-error">{error}</div>}
```

**Estado adicional para modal de cierre:**
```typescript
const [showCloseRegister, setShowCloseRegister] = useState(false);
const [closingAmount, setClosingAmount] = useState("");
```

**Archivo:** `app/admin/pos/page.tsx`

---

### Ventas y Devoluciones

**Estado actual:** Endpoint `DELETE /api/sales/[id]` implementado ✅. Migración de esquema aplicada ✅. Reportes filtran ventas canceladas ✅.

- [ ] **UI en Reportes — badge de estado** — columna `Estado` en tabla de ventas; `status === 'cancelled'` muestra badge rojo "Cancelada"
- [ ] **UI en Reportes — botón Cancelar (solo admin)** — en cada fila con `status === 'active'`, confirm dialog → llama `DELETE /api/sales/:id`

**Archivo:** `app/admin/reports/page.tsx`

---

### Inventario / Productos

**Estado actual:** CRUD de productos completo. Sin corrección manual de stock.

- [ ] **Corrección manual de stock** — UI en la página de productos (botón "Ajustar stock") con modal: cantidad, tipo (entrada/salida), motivo
- [ ] **API route** `POST /api/products/[id]/stock-adjustment` — valida qty > 0, registra en tabla `stock_adjustments`
- [ ] **Tabla `stock_adjustments`** en `lib/db.ts`:
  ```sql
  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    type       TEXT NOT NULL CHECK(type IN ('in', 'out')),
    quantity   INTEGER NOT NULL CHECK(quantity > 0),
    reason     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  ```
- [ ] **Sin endpoint GET producto individual** — agregar `GET /api/products/[id]` para pre-popular formularios de edición

**Archivos:** `lib/db.ts`, `app/api/products/[id]/route.ts`, `app/admin/products/page.tsx`

---

### Autenticación y Usuarios

**Estado actual:** Login/logout/me funcionales. Solo existe el usuario seed. Contraseña hardcodeada en `lib/db.ts`.

- [ ] **Contraseña admin desde env var** — leer `process.env.INITIAL_ADMIN_PASSWORD` en el seed, con fallback y `console.warn`:
  ```typescript
  const initialPass = process.env.INITIAL_ADMIN_PASSWORD;
  if (!initialPass) console.warn("[STUDIONE] Set INITIAL_ADMIN_PASSWORD before first run");
  const hashedPassword = bcryptjs.hashSync(initialPass || "studione-change-me", 10);
  ```
  Agregar `INITIAL_ADMIN_PASSWORD=` a `.env.example`
- [ ] **Gestión de usuarios** — página `/admin/usuarios` con CRUD: crear, editar, desactivar
- [ ] **Roles:** `admin` / `empleado` con restricciones en middleware (cajeros no acceden a configuración, reportes completos, ni cancelación de ventas)
- [ ] **Cambio de contraseña** — propio usuario puede cambiar la suya; admin puede resetear la de otros
- [ ] **API routes:** `GET/POST /api/users`, `PUT/DELETE /api/users/[id]`, `POST /api/users/[id]/reset-password`

**Archivos:** `lib/db.ts`, `app/api/users/`, `app/admin/usuarios/page.tsx`, `middleware.ts`

---

### Citas y Calendario

**Estado actual:** Calendario mensual + timeline diario funcionales. Sin recordatorios automáticos.

- [ ] **Recordatorios automáticos** — enviar notificación al cliente 24h antes de la cita (WhatsApp vía Twilio/Meta API o Email)
- [ ] **Job de recordatorios** — cron o endpoint `/api/reminders/send` llamado externamente
- [ ] **Configuración** — opción en `/admin/configuracion` para activar/desactivar recordatorios y elegir canal
- [ ] **Vincular cita a venta** — al completar una cita, poder cobrar desde POS referenciando la cita (`appointment_id` en `sales`)

**Archivos:** `app/api/appointments/`, `app/admin/configuracion/page.tsx`

---

### Landing Page

**Estado actual:** `components/services-cta.tsx` es estático; no consume `/api/menu`. Formulario de contacto usa `alert()`. Galería con imágenes placeholder.

- [ ] **Servicios dinámicos** — `services-cta.tsx` y página `/servicios` deben hacer `fetch('/api/menu')` con `{ next: { revalidate: 60 } }` para reflejar cambios del admin sin deploy
- [ ] **Verificar `app/servicios/`** — revisar si el directorio ya consume la API o usa datos estáticos
- [ ] **Formulario de contacto — backend real** — crear `app/api/contact/route.ts`:
  - Validar campos (nombre, email, mensaje)
  - Enviar email con Nodemailer/Resend/SendGrid
  - Rate limiting básico por IP (o honeypot field)
  - Variables de entorno: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL`
- [ ] **Galería conectada al admin** — tabla `gallery_images` en DB + CRUD desde `/admin/configuracion` + `GET /api/gallery` público
- [ ] **Reutilizar `/api/upload`** para subir imágenes a la galería

**Archivos:** `components/services-cta.tsx`, `app/servicios/`, `components/contact.tsx`, `app/api/contact/route.ts`, `lib/db.ts`

---

### Reportes

**Estado actual:** 3 tabs funcionales. Sin exportación. Sin filtro por usuario.

- [ ] **Exportar CSV** — botón en cada tab; `GET /api/sales/reports/export?format=csv&from=...&to=...`
- [ ] **Exportar PDF** — resumen del período; librería sugerida: `jsPDF` + `autoTable` (client-side)
- [ ] **Filtro de ventas canceladas ya aplicado en API** ✅ — verificar que la UI refleja correctamente

**Archivo:** `app/admin/reports/page.tsx`, `app/api/sales/reports/route.ts`

---

### Configuración y Sistema

**Estado actual:** Tema, descuentos, descuento de cumpleaños, Promotions implementados.

- [x] **Módulo de Promotions** — modelo: descuento % o monto fijo, vigencia, aplicable a producto/servicio. CRUD en `/admin/promociones`. Integrado en POS al cobrar (servidor autoritativo en `app/api/sales/route.ts`, preview en `app/admin/pos/page.tsx`).
- [ ] **Horario de atención** — configurable y que afecte disponibilidad en el calendario
- [ ] **Logs de auditoría** — tabla `audit_logs` (usuario, acción, tabla, id, timestamp, IP) + página `/admin/auditoria` con filtros
  ```sql
  CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    action     TEXT NOT NULL,
    table_name TEXT,
    record_id  INTEGER,
    ip         TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  ```
- [ ] **Limpieza de notificaciones** — notificaciones de stock se acumulan sin límite; agregar limpieza automática (ej. purgar las de más de 30 días)

**Archivos:** `lib/db.ts`, `app/admin/configuracion/page.tsx`, `app/admin/auditoria/page.tsx`

---

### Paginación (Transversal)

Aplica a múltiples módulos. Patrón: `?page=1&limit=20` en las APIs afectadas.

- [ ] `GET /api/products` — actualmente sin límite
- [ ] `GET /api/clients` — actualmente sin límite
- [ ] `GET /api/sales` — actualmente tope 500
- [ ] `GET /api/internal-consumption` — actualmente tope 100
- [ ] Lista lateral de citas en Calendario

---

## Parte 2 — Verificación del flujo completo

Recorrer cada flujo de punta a punta una vez que todos los módulos estén implementados. Confirmar que todo encadena correctamente entre frontend, API y base de datos.

---

### Autenticación

- [ ] Login con credenciales correctas → redirige a `/admin`
- [ ] Login con credenciales incorrectas → mensaje de error visible, no error 500
- [ ] Acceder a `/admin/*` sin sesión → redirige a `/admin/login`
- [ ] JWT expirado → redirige a login, sin error 500
- [ ] Logout → cookie eliminada → `/admin` bloqueado inmediatamente
- [ ] Usuario con rol `empleado` no accede a rutas restringidas (configuración, reportes completos, cancelar ventas)
- [ ] Cambio de contraseña → sesiones previas invalidadas

---

### POS — Venta completa

- [ ] Buscar producto por nombre y agregarlo al carrito
- [ ] Modificar cantidad, eliminar ítem
- [ ] Abrir caja registradora → confirmación visible
- [ ] Seleccionar cliente (opcional)
- [ ] Seleccionar método de pago: efectivo / tarjeta / transferencia
- [ ] Completar venta → stock se descuenta automáticamente en DB
- [ ] Intentar vender con stock = 0 → banner rojo "Stock insuficiente para producto X"
- [ ] Intentar vender sin caja abierta → banner rojo "No hay caja abierta"
- [ ] Cerrar caja → modal propio (no `window.prompt()`), confirmar con monto de cierre
- [ ] Venta aparece en Reportes inmediatamente

---

### Inventario

- [ ] Crear producto con imagen, precio costo, precio venta, stock inicial
- [ ] Imagen sube y se muestra en el listado
- [ ] Venta POS descuenta `stock_sales`; consumo interno descuenta `stock_internal`
- [ ] Corrección manual: entrada de stock → cantidad sube; salida → baja (no puede quedar negativo)
- [ ] Notificación de stock bajo aparece cuando el stock cruza el umbral (`<= 2`)
- [ ] Notificación desaparece cuando el stock es repuesto
- [ ] Anular una venta → stock del producto se restaura

---

### Ventas y Devoluciones

- [ ] Anular venta como admin → `status` cambia a `cancelled`, stock restaurado
- [ ] Intentar anular la misma venta dos veces → error "La venta ya fue cancelada"
- [ ] Intentar anular como empleado → 403
- [ ] Reportes no incluyen la venta cancelada en totales
- [ ] Listado de ventas muestra la venta con badge "Cancelada"
- [ ] Registro en `sale_refunds` con motivo y usuario

---

### Citas y Calendario

- [ ] Crear cita: cliente, servicio, fecha, hora
- [ ] Cita visible en calendario mensual y timeline diario
- [ ] Editar cita (cambiar hora o servicio)
- [ ] Cambiar estado: pendiente → confirmada → completada / cancelada
- [ ] Cita cancelada no bloquea el slot en el calendario
- [ ] Recordatorio enviado 24h antes (verificar en canal configurado)
- [ ] Cita completada aparece vinculada a venta en Reportes

---

### Landing Page

- [ ] Hero muestra imagen y texto actuales
- [ ] Sección Servicios carga desde `/api/menu` (servicios activos del admin)
- [ ] Desactivar un servicio en admin → desaparece de la landing sin deploy
- [ ] Galería muestra imágenes subidas desde `/admin/configuracion`
- [ ] Formulario de contacto envía email y muestra confirmación de éxito al usuario
- [ ] Formulario con campos vacíos → errores de validación visibles
- [ ] Navbar responsive en mobile; todos los links funcionan

---

### Reportes

- [ ] Tab Ventas: filtrar por fecha → totales correctos (excluyen canceladas)
- [ ] Tab Productos más vendidos: ranking correcto
- [ ] Tab Servicios: ingresos por servicio
- [ ] Caja registradora: ingresos del día cuadran con ventas del POS
- [ ] Exportar CSV descarga el archivo con los datos del filtro activo
- [ ] Exportar PDF genera el resumen correctamente

---

### Configuración

- [ ] Cambios en nombre del salón, logo, teléfono → se reflejan en landing sin recargar el servidor
- [ ] Cambio de contraseña funciona y la nueva contraseña es la requerida para el próximo login
- [ ] Horario de atención configurado → afecta slots disponibles en calendario

---

## Parte 3 — Pruebas de seguridad

Revisar cada vector de ataque antes de poner el sistema en producción.

---

### Autenticación y Sesión

- [ ] Cookie `token` tiene flags `httpOnly` y `secure` (verificar en producción con HTTPS)
- [ ] Cookie tiene `SameSite=Strict` o `SameSite=Lax` para prevenir CSRF
- [ ] JWT firmado con secreto fuerte (mínimo 32 caracteres aleatorios) — verificar `JWT_SECRET` en `.env`
- [ ] Payload del JWT no contiene información sensible (contraseña, email completo si no es necesario)
- [ ] Token expirado rechazado en todas las rutas protegidas (`/admin/*`, `/api/*`)
- [ ] Intentos de login repetidos con credenciales incorrectas → rate limiting o bloqueo temporal
- [ ] Logout invalida el token (o la cookie es eliminada correctamente)

---

### Middleware y Control de Acceso

- [ ] `middleware.ts` intercepta **todas** las rutas `/admin/*` — ninguna ruta queda desprotegida
- [ ] Las rutas de API privadas devuelven 401 sin token válido, 403 sin el rol requerido
- [ ] Rutas públicas (`/api/menu`, `/api/services`, `/api/gallery`) son accesibles sin autenticación
- [ ] No existe forma de bypassear el middleware con headers especiales
- [ ] RBAC: empleado no puede acceder a endpoints de admin (cancelar ventas, gestión de usuarios, configuración)

---

### Validación de Inputs

- [ ] Todos los campos de formularios validados en el servidor (no solo en el cliente)
- [ ] `lib/validation.ts`: `isValidDate` rechaza `"2024-13-32"`; `isValidTime` rechaza `"25:99"` ✅
- [ ] Campos numéricos (precio, stock, cantidad) rechazan strings y valores negativos
- [ ] Longitud máxima en campos de texto (nombre, descripción, motivo de cancelación ≤ 500 chars)
- [ ] Emails validados antes de enviar (formulario de contacto, CRUD de clientes)
- [ ] `reason` en cancelación de ventas sanitizado con `sanitizeString(reason, 500)`

---

### Subida de Archivos

- [ ] `/api/upload` acepta solo tipos MIME de imagen: `image/jpeg`, `image/png`, `image/webp`
- [ ] Tamaño máximo de archivo configurado y rechazado si se supera
- [ ] Nombre de archivo sanitizado antes de guardar — sin path traversal (`../../etc/passwd`)
- [ ] Archivos subidos a `public/uploads/` — Next.js los sirve como estáticos, no ejecutables
- [ ] No se puede acceder a archivos fuera de la carpeta de uploads

---

### SQL Injection

- [ ] Todas las queries usan `db.prepare()` con parámetros posicionales (`?`) — sin concatenación de strings
- [ ] Verificar especialmente: búsquedas por nombre de producto/cliente, filtros de fecha en reportes
- [ ] Probar inputs maliciosos en todos los campos de búsqueda:
  - `' OR '1'='1`
  - `; DROP TABLE products --`
  - `1 UNION SELECT * FROM users`

---

### XSS (Cross-Site Scripting)

- [ ] React escapa el output en JSX automáticamente — verificar que no se use `dangerouslySetInnerHTML`
- [ ] Si algún campo se renderiza como HTML (descripciones, notas) → sanitizar con DOMPurify
- [ ] Headers de seguridad configurados en `next.config.ts`:
  - `Content-Security-Policy` — restringir fuentes de scripts, imágenes, fonts
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` — previene clickjacking
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security` (HSTS) — solo con HTTPS

---

### Exposición de Datos Sensibles

- [ ] La API **nunca** devuelve hashes de contraseña en ninguna respuesta
- [ ] Errores devueltos al cliente son genéricos (no stack traces, no rutas internas)
- [ ] `.env.local` está en `.gitignore` y no está en el repositorio
- [ ] `studione.db` está fuera de la carpeta `public/` — no accesible via HTTP
- [ ] `INITIAL_ADMIN_PASSWORD` y `JWT_SECRET` no están hardcodeados en el código ✅ (pendiente aplicar en db.ts)
- [ ] Variables de entorno de producción no se filtran en respuestas de API

---

### Rate Limiting y Abuso

- [ ] Endpoint de login: máximo N intentos por IP en X minutos
- [ ] Formulario de contacto: rate limit por IP (o honeypot field anti-spam)
- [ ] `/api/upload`: límite de tamaño y frecuencia de subidas
- [ ] Considerar middleware de rate limiting global para producción (Cloudflare o `next-rate-limit`)

---

### CORS y Acceso Externo

- [ ] Las API routes no envían `Access-Control-Allow-Origin: *`
- [ ] Rutas de admin no accesibles desde dominios externos
- [ ] Si alguna API pública requiere CORS en el futuro, definir explícitamente los orígenes permitidos

---

## Referencia rápida

| Elemento | Valor |
|----------|-------|
| DB | `studione.db` en raíz del proyecto |
| Usuario seed | `admin@studione.com` / `123456789` |
| Middleware | `middleware.ts` en raíz |
| Validaciones | `lib/validation.ts` |
| Auth helpers | `lib/db.ts` + `lib/auth.ts` (JWT HS256) |
| Upload | `app/api/upload/route.ts` → `public/uploads/` |
| API pública de servicios | `app/api/menu/route.ts` |
| Cancelación de ventas | `DELETE /api/sales/[id]` — solo admin |
| Tabla de cancelaciones | `sale_refunds` (id, sale_id, refunded_by, reason, created_at) |

---

## Estado de implementación

| Módulo | Estado |
|--------|--------|
| Auth (login/logout/me/JWT) | ✅ Completo |
| Middleware de rutas | ✅ `proxy.ts` (convención Next.js 16; `middleware.ts` está deprecado) |
| POS — flujo base | ✅ Completo |
| POS — error handling | ✅ Completo |
| POS — modal cierre de caja | ✅ Completo |
| Productos (CRUD + imagen) | ✅ Completo |
| Servicios | ✅ Completo |
| Clientes | ✅ Completo |
| Marcas | ✅ Completo |
| Citas / Calendario | ✅ Completo |
| Consumo interno | ✅ Completo |
| Configuración | ✅ Completo |
| Notificaciones de stock | ✅ Completo | 
| Caja registradora | ✅ Completo |
| Anulación de ventas (API) | ✅ Completo |
| Ventas canceladas en Reportes (API) | ✅ Completo |
| Badge cancelada en UI de Reportes | ✅ Completo |
| Botón Cancelar en UI de Reportes (admin) | ✅ Completo |
| Validación semántica de fechas | ✅ Aplicado |
| Contraseña admin desde env var | ✅ Completo |
| Corrección manual de stock (API + UI) | ✅ Completo |
| Gestión de usuarios (CRUD + roles) | ✅ Completo |
| Formulario de contacto (backend + rate limit + honeypot) | ✅ Completo |
| Landing — servicios dinámicos | ✅ Completo |
| Galería conectada al admin | ✅ Completo |
| Promotions | ✅ Completo |
| Paginación en listados | ⏳ Backlog |
| Exportar reportes CSV/PDF | ⏳ Backlog |
| Recordatorios de citas | ⏳ Backlog |
| Logs de auditoría | ✅ Completo — tabla `audit_logs` append-only, helper `lib/audit.ts` (transaccional en dinero/inventario/cuentas, best-effort en CRUD), 27/29 rutas mutantes instrumentadas (solo `contact` y `notifications` excluidas), `GET /api/audit-logs` admin-only con filtros+paginación, `/admin/auditoria` con nav gateado a admin. Ver [PLAN-audit-logs.md](PLAN-audit-logs.md) |
| Fix: `nodemailer` faltante rompía `pnpm build` | ✅ Instalado (`nodemailer` + `@types/nodemailer`) |
| Fix: precio de venta manipulable por el cliente | ✅ Corregido — `POST /api/sales` ahora resuelve `unit_price` desde `products`/`services` en servidor, ignora el valor del cliente |
| Fix: Next.js con 25 vulnerabilidades conocidas (varias de bypass de middleware/proxy) | ✅ Actualizado a `next@16.2.10` + `eslint-config-next@16.2.10` (`pnpm audit` limpio) |
| Fix: `postcss` vulnerable (transitivo vía `next`) | ✅ Override en `pnpm-workspace.yaml` a `>=8.5.10` |
| Fix: bug de tipos en `components/hero.tsx` rompía el build de producción | ✅ Corregido (tipado `Variants` + `as const` en `ease`) |
| Fix: `tests/**` incluido en el typecheck de `next build` | ✅ Excluido en `tsconfig.json` (vitest no depende de esto) |
| Fix: `PUT /api/promotions/[id]` podía dejar `target_id` obsoleto al cambiar `target_type` sin mandarlo | ✅ Corregido (ahora exige `target_id` en el mismo request) |

---

## Parte 4 — Roadmap futuro (post-MVP)

> Implementar únicamente después de que todos los módulos de las Partes 1–3 estén completos y verificados.

---

### Sprint 2 — Diferenciadores principales

#### Reservas online self-booking

Los clientes reservan desde la landing sin llamar al salón: eligen servicio → estilista → fecha/hora disponible → reciben confirmación automática.

- [ ] Página pública `/reservar` con stepper: servicio → estilista → fecha → confirmación
- [ ] `GET /api/availability?staff_id=X&date=Y` — devuelve slots libres según horario configurado y citas existentes
- [ ] `POST /api/bookings` — crea cita desde el lado público (sin auth), envía confirmación por email o WhatsApp
- [ ] Panel admin para aprobar/rechazar reservas online (o modo auto-confirmación configurable)
- [ ] Campo `source` en tabla `appointments`: `'admin'` vs `'online'`

#### Agenda por estilista + comisiones

Cada empleado tiene su propia columna en el timeline. Al cierre del período el sistema calcula cuánto debe cobrar cada estilista.

- [ ] Campo `staff_id` en tabla `appointments` y en `sales`
- [ ] Vista de timeline con columnas por estilista (modo multi-staff en el calendario)
- [ ] Tabla `commissions`: `staff_id`, `sale_id` / `appointment_id`, `type` (% servicio / % producto), `amount`, `period`
- [ ] Página `/admin/comisiones` — filtro por empleado y período, exportar resumen de liquidación

---

### Sprint 3 — CRM y fidelización

#### Ficha completa del cliente

Historia clínica del cliente: visitas, tratamientos, alergias, notas del estilista, fotos.

- [ ] Tabla `client_notes`: `client_id`, `staff_id`, `content`, `created_at`
- [ ] Tabla `client_visits`: vista agregada desde `appointments` + `sales`
- [ ] Tabla `client_photos`: `client_id`, `appointment_id`, `type` (`before`/`after`), `url`
- [ ] Página `/admin/clientes/[id]` — ficha con tabs: Historial de visitas / Productos comprados / Notas / Fotos
- [ ] Subida de fotos antes/después desde el módulo de citas al completar una

#### Programa de fidelización (puntos)

Cada compra acumula puntos canjeables como descuento en el POS.

- [ ] Campo `points_balance` en tabla `clients`
- [ ] Tabla `points_transactions`: `client_id`, `sale_id`, `type` (`earn`/`redeem`), `points`, `created_at`
- [ ] Configuración en `/admin/configuracion`: ratio puntos por peso gastado, valor de canje
- [ ] Integración en POS: mostrar saldo de puntos del cliente seleccionado, opción de canjear como descuento

---

### Sprint 4 — Operación financiera completa

#### Módulo de gastos / proveedores

Para calcular rentabilidad real: ingresos − costo de productos − gastos operativos.

- [ ] Tabla `suppliers`: `name`, `contact`, `phone`, `email`
- [ ] Tabla `purchase_orders`: `supplier_id`, `product_id`, `quantity`, `unit_cost`, `total`, `date`
- [ ] Tabla `expenses`: `category` (renta / servicios / insumos / otros), `amount`, `description`, `date`, `paid_by`
- [ ] Página `/admin/gastos` — registro de compras y gastos, filtro por período
- [ ] Tab adicional en Reportes: "Utilidad neta" = ventas − costo de productos vendidos − gastos del período

#### Control de caja avanzado

Cuadre real con egresos, retiros y diferencias al cierre.

- [ ] Tabla `register_transactions`: `register_id`, `type` (`income`/`expense`/`withdrawal`), `amount`, `description`
- [ ] UI en POS para registrar retiros de efectivo o pagos de gastos desde la caja
- [ ] Reporte de caja: apertura + ingresos − egresos = cierre esperado vs. cierre real (diferencia)

#### Marketing automation

Mensajes automáticos a clientes por WhatsApp o email.

- [ ] Tabla `marketing_campaigns`: `name`, `trigger` (`birthday`/`reactivation`/`manual`), `channel`, `message_template`, `active`
- [ ] Job: revisar diariamente cumpleaños del día y enviar mensaje con descuento configurable
- [ ] Job: clientes sin visita en N días → enviar mensaje de reactivación
- [ ] Página `/admin/marketing` — gestión de campañas, historial de envíos, métricas básicas (enviados / abiertos)
- [ ] Integración: Twilio (WhatsApp/SMS) o Resend (email)

---

### Sprint 5 — Productos y ventas avanzadas

#### Gift Cards / Tarjetas de regalo

Vender desde el POS y canjear como método de pago.

- [ ] Tabla `gift_cards`: `code` (único), `initial_amount`, `remaining_amount`, `issued_by`, `issued_at`, `expires_at`
- [ ] Integración en POS: nuevo método de pago "Gift Card" — escanear/ingresar código, valida saldo
- [ ] Generación de código único al vender (alfanumérico de 12 caracteres)
- [ ] Página `/admin/gift-cards` — listado, saldo actual, historial de uso

#### Paquetes de servicios

Bundle de servicios a precio especial, vendible en el POS.

- [ ] Tabla `packages`: `name`, `description`, `price`, `valid_days`, `active`
- [ ] Tabla `package_services`: `package_id`, `service_id`, `quantity`
- [ ] Tabla `client_packages`: `client_id`, `package_id`, `purchased_at`, `expires_at`, `services_remaining` (JSON)
- [ ] Integración en POS: al seleccionar cliente, mostrar paquetes activos; descontar servicios usados

---

### Sprint 6 — Experiencia y analytics

#### Dashboard analytics avanzado

Métricas en tiempo real y comparativas históricas.

- [ ] Widgets en vivo: ventas del día, citas pendientes hoy, caja acumulada, ticket promedio del mes
- [ ] Gráfica: ventas por semana (últimas 8 semanas comparadas)
- [ ] Tasa de retención: % de clientes que regresan en menos de 90 días
- [ ] Hora pico: distribución de citas por hora del día (heatmap semanal)
- [ ] Top 3 estilistas por ingresos generados en el período

#### PWA instalable

La app se instala en el celular del dueño y estilistas como si fuera una app nativa.

- [ ] `public/manifest.json` con nombre, íconos, colores del salón
- [ ] Service worker básico con caché offline para rutas admin críticas
- [ ] Meta tags en `app/layout.tsx` para iOS (apple-touch-icon, apple-mobile-web-app-capable)
- [ ] Banner de instalación en el admin (detectar `beforeinstallprompt`)

---

### Backlog abierto (prioridad baja)

| Módulo | Descripción |
| ------ | ----------- |
| Presupuestos / Cotizaciones | Crear cotización para eventos (bodas, quinceañeras) → convertir en citas al aprobar |
| Sistema de turnos | Para salones sin cita previa: QR de llegada, estimado de espera, llamado por estilista |
| Reseñas / NPS | Encuesta automática al completar cita, puntaje por estilista, feed de reseñas en landing |
| Integración Instagram | Mostrar últimas publicaciones del salón en la landing via Instagram Basic Display API |
| Modo multi-sucursal | Soporte para más de una ubicación del mismo salón bajo un mismo admin |

---

### Resumen roadmap futuro

| Sprint | Módulos | Valor principal |
| ------ | ------- | --------------- |
| Sprint 2 | Reservas online + Agenda/comisiones por estilista | Elimina llamadas manuales, calcula pagos automáticos |
| Sprint 3 | Ficha CRM + Fidelización de puntos | Retención de clientes, servicio personalizado |
| Sprint 4 | Gastos/proveedores + Caja avanzada + Marketing | Rentabilidad real, comunicación automática |
| Sprint 5 | Gift Cards + Paquetes de servicios | Nuevas fuentes de ingreso |
| Sprint 6 | Analytics avanzado + PWA | Visibilidad del negocio, acceso móvil |
| Backlog | Cotizaciones, turnos, reseñas, multi-sucursal | Expansión a futuro |
