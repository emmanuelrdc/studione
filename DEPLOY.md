# Deploy en Railway

Studione usa SQLite (`better-sqlite3`) con un archivo local en disco, por eso se
despliega en Railway (proceso Node de larga duración) y no en Vercel (serverless,
sin disco persistente). Esta guía es específica de este proyecto — no cubre
conceptos generales de Railway.

## 1. Crear el proyecto

1. En Railway: **New Project → Deploy from GitHub repo** → selecciona este repo.
2. Railway detecta Next.js automáticamente vía Nixpacks (configurado en
   `railway.json`). Build: `pnpm build` (via `corepack`). Start: `corepack pnpm start`.

## 2. Agregar un Volume (obligatorio)

Sin esto, cada redeploy borra la base de datos y las imágenes subidas.

1. En el servicio → pestaña **Volumes** → **New Volume**.
2. Móntalo en `/data`.
3. Eso solo crea el disco persistente; los archivos concretos (`studione.db` y la
   carpeta `uploads/`) se crean solos en el primer arranque gracias a las
   variables `DB_PATH` y `UPLOADS_DIR` del paso siguiente.

## 3. Variables de entorno

En el servicio → pestaña **Variables**, configura:

| Variable | Valor | Notas |
|---|---|---|
| `JWT_SECRET` | (generar, ver abajo) | obligatoria |
| `INITIAL_ADMIN_PASSWORD` | contraseña real, no el placeholder de pruebas | obligatoria en producción — sin ella el arranque falla |
| `NODE_ENV` | `production` | |
| `NEXT_PUBLIC_SITE_URL` | `https://<tu-dominio-de-railway-o-propio>` | sin `/` final |
| `DB_PATH` | `/data/studione.db` | dentro del Volume montado en el paso 2 |
| `UPLOADS_DIR` | `/data/uploads` | dentro del mismo Volume |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL` | opcionales | solo si quieres que el formulario de contacto envíe emails; si se omiten, los mensajes igual se guardan en la base de datos |

Genera `JWT_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 4. Primer arranque

Al arrancar por primera vez, si no existe el usuario `admin@studione.com`, se crea
automáticamente con la contraseña de `INITIAL_ADMIN_PASSWORD`. Inicia sesión con
ese usuario y cambia la contraseña desde **/admin/usuarios** cuanto antes.

## 5. Redeploys posteriores

Cada push a la rama de producción dispara un nuevo build/deploy. Como
`DB_PATH` y `UPLOADS_DIR` viven en el Volume (no en el filesystem del
contenedor), la base de datos y las imágenes subidas sobreviven al redeploy sin
pasos adicionales.
