import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAudit, actorFromSession, auditContext } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// En Railway, UPLOADS_DIR debe apuntar dentro del Volume montado (ej. /data/uploads)
// para que las imágenes subidas persistan entre redeploys. En local/dev, sin la env var
// definida, se usa public/uploads (comportamiento actual, servido por Next.js).
// La URL pública (/uploads/xxx.jpg) no cambia: cuando UPLOADS_DIR queda fuera de
// public/, esa URL la sirve app/uploads/[...path]/route.ts leyendo del disco.
const UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Usa JPG, PNG, WebP o AVIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el límite de 5MB" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Map MIME type to safe extension (don't trust user-supplied extension)
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };
    const ext = MIME_TO_EXT[file.type] || "jpg";
    const safeName = crypto.randomBytes(16).toString("hex") + "." + ext;
    const filePath = path.join(UPLOAD_DIR, safeName);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const url = `/uploads/${safeName}`;

    writeAudit({
      actor: actorFromSession(session),
      action: "upload.create",
      entityType: "upload",
      details: { url, mime: file.type, size: file.size },
      ...auditContext(request),
    });

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
  }
}
