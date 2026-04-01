import { NextResponse } from "next/server";

export function parseId(id: string): number | null {
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export function validateId(id: string): NextResponse | number {
  const parsed = parseId(id);
  if (parsed === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  return parsed;
}

export function sanitizeString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength) || null;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isValidDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}
