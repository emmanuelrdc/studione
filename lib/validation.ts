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
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isValidTime(value: unknown): value is string {
  if (typeof value !== "string" || !TIME_RE.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function clampDiscount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function coerceBool(value: unknown): 0 | 1 | null {
  if (value === true || value === 1 || value === "1" || value === "true") return 1;
  if (value === false || value === 0 || value === "0" || value === "false") return 0;
  return null;
}

/**
 * Returns true if birth_date (YYYY-MM-DD) matches today's month/day in server local time.
 * Feb 29 birthdays match Feb 28 in non-leap years.
 */
export function isBirthdayToday(birthDate: string | null | undefined): boolean {
  if (!birthDate || !DATE_RE.test(birthDate)) return false;
  const parts = birthDate.split("-");
  const birthMonth = Number(parts[1]);
  const birthDay = Number(parts[2]);
  if (!Number.isInteger(birthMonth) || !Number.isInteger(birthDay)) return false;

  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  if (birthMonth === todayMonth && birthDay === todayDay) return true;

  // Feb 29 birthday → celebrate on Feb 28 in non-leap years
  if (birthMonth === 2 && birthDay === 29 && todayMonth === 2 && todayDay === 28) {
    const year = now.getFullYear();
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (!isLeap) return true;
  }
  return false;
}
