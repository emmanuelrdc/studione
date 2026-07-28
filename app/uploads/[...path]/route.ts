import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

// Debe coincidir con UPLOADS_DIR usado en app/api/upload/route.ts.
// En dev/local (sin la env var), Next.js ya sirve public/uploads de forma
// estática, así que este handler normalmente ni se ejecuta para esos archivos.
// En producción (Railway), cuando UPLOADS_DIR apunta al Volume montado
// (ej. /data/uploads, fuera de public/), Next no puede servir esos archivos
// estáticamente y este handler es el que responde a GET /uploads/<archivo>.
const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Un solo segmento de archivo esperado (los uploads no usan subcarpetas).
  // Rechaza cualquier intento de traversal antes de tocar el filesystem.
  if (segments.length !== 1 || /[\\/]|\.\./.test(segments[0])) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const ext = path.extname(segments[0]).toLowerCase();
  const mime = EXT_TO_MIME[ext];
  if (!mime) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const resolvedRoot = path.resolve(UPLOADS_DIR);
  const resolved = path.resolve(resolvedRoot, segments[0]);
  if (resolved !== path.join(resolvedRoot, segments[0])) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const buffer = await readFile(resolved);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(fileStat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
