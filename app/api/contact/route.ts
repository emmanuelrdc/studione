import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sanitizeString, isNonEmptyString } from "@/lib/validation";

// Simple in-memory rate limit: max 3 submissions per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Demasiados mensajes. Intenta de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    // Honeypot: bots fill this hidden field, humans don't
    if (body.website) {
      // Silently accept but don't store
      return NextResponse.json({ success: true });
    }

    const name = sanitizeString(body.name, 200);
    const phone = sanitizeString(body.phone, 20);
    const email = sanitizeString(body.email, 200);
    const message = sanitizeString(body.message ?? body.reason, 2000);

    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    if (!isNonEmptyString(message)) {
      return NextResponse.json({ error: "El mensaje es requerido" }, { status: 400 });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (email && !emailRe.test(email)) {
      return NextResponse.json({ error: "El correo electrónico no es válido" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      "INSERT INTO contact_messages (name, phone, email, message, ip) VALUES (?, ?, ?, ?, ?)"
    ).run(name, phone, email, message, ip);

    // Optional: send email if SMTP is configured
    // This is a no-op if env vars are missing — the message is always saved to DB
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.CONTACT_EMAIL) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: `"Studio One" <${process.env.SMTP_USER}>`,
          to: process.env.CONTACT_EMAIL,
          subject: `Nuevo mensaje de ${name}`,
          text: `Nombre: ${name}\nTeléfono: ${phone || "—"}\nEmail: ${email || "—"}\n\n${message}`,
          html: `<p><strong>Nombre:</strong> ${name}</p><p><strong>Teléfono:</strong> ${phone || "—"}</p><p><strong>Email:</strong> ${email || "—"}</p><hr/><p>${message.replace(/\n/g, "<br/>")}</p>`,
        });
      } catch (emailErr) {
        console.error("[contact] Email send failed (message saved to DB):", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
