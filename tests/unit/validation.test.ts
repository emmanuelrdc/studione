import { describe, it, expect } from "vitest";
import {
  parseId,
  sanitizeString,
  isPositiveNumber,
  isNonNegativeNumber,
  isNonEmptyString,
  isValidDate,
  isValidTime,
  clampDiscount,
  roundMoney,
  coerceBool,
  isBirthdayToday,
} from "@/lib/validation";

describe("parseId", () => {
  it("returns valid integer for positive int string", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("999")).toBe(999);
  });
  it("returns null for zero", () => expect(parseId("0")).toBeNull());
  it("returns null for negative", () => expect(parseId("-1")).toBeNull());
  it("returns null for float string", () => expect(parseId("1.5")).toBeNull());
  it("returns null for non-numeric string", () => expect(parseId("abc")).toBeNull());
  it("returns null for empty string", () => expect(parseId("")).toBeNull());
  it("returns null for SQL injection attempt", () => expect(parseId("1; DROP TABLE users--")).toBeNull());
});

describe("sanitizeString", () => {
  it("trims whitespace", () => expect(sanitizeString("  hello  ", 100)).toBe("hello"));
  it("truncates to maxLength", () => expect(sanitizeString("abcde", 3)).toBe("abc"));
  it("returns null for empty after trim", () => expect(sanitizeString("   ", 100)).toBeNull());
  it("returns null for null input", () => expect(sanitizeString(null, 100)).toBeNull());
  it("returns null for undefined input", () => expect(sanitizeString(undefined, 100)).toBeNull());
  it("returns null for non-string (number)", () => expect(sanitizeString(42, 100)).toBeNull());
  it("strips XSS: returns string as-is (no HTML stripping expected — just length)", () => {
    const xss = '<script>alert("xss")</script>';
    expect(sanitizeString(xss, 500)).toBe(xss); // sanitizeString is NOT an HTML sanitizer
  });
  it("handles very long string at max 500", () => {
    const long = "a".repeat(600);
    expect(sanitizeString(long, 500)?.length).toBe(500);
  });
});

describe("isPositiveNumber", () => {
  it("returns true for positive number", () => expect(isPositiveNumber(1)).toBe(true));
  it("returns true for 0.001", () => expect(isPositiveNumber(0.001)).toBe(true));
  it("returns false for zero", () => expect(isPositiveNumber(0)).toBe(false));
  it("returns false for negative", () => expect(isPositiveNumber(-1)).toBe(false));
  it("returns false for Infinity", () => expect(isPositiveNumber(Infinity)).toBe(false));
  it("returns false for NaN", () => expect(isPositiveNumber(NaN)).toBe(false));
  it("returns false for string '1'", () => expect(isPositiveNumber("1" as unknown as number)).toBe(false));
  it("returns false for null", () => expect(isPositiveNumber(null as unknown as number)).toBe(false));
});

describe("isNonNegativeNumber", () => {
  it("returns true for zero", () => expect(isNonNegativeNumber(0)).toBe(true));
  it("returns true for positive", () => expect(isNonNegativeNumber(5)).toBe(true));
  it("returns false for negative", () => expect(isNonNegativeNumber(-0.1)).toBe(false));
  it("returns false for Infinity", () => expect(isNonNegativeNumber(Infinity)).toBe(false));
  it("returns false for NaN", () => expect(isNonNegativeNumber(NaN)).toBe(false));
});

describe("isNonEmptyString", () => {
  it("returns true for non-empty string", () => expect(isNonEmptyString("hello")).toBe(true));
  it("returns false for empty string", () => expect(isNonEmptyString("")).toBe(false));
  it("returns false for whitespace only", () => expect(isNonEmptyString("  ")).toBe(false));
  it("returns false for number", () => expect(isNonEmptyString(0 as unknown as string)).toBe(false));
  it("returns false for null", () => expect(isNonEmptyString(null as unknown as string)).toBe(false));
});

describe("isValidDate", () => {
  it("accepts valid date", () => expect(isValidDate("2025-06-15")).toBe(true));
  it("accepts leap day", () => expect(isValidDate("2024-02-29")).toBe(true));
  it("rejects Feb 29 on non-leap year", () => expect(isValidDate("2023-02-29")).toBe(false));
  it("rejects month 13", () => expect(isValidDate("2025-13-01")).toBe(false));
  it("rejects day 32", () => expect(isValidDate("2025-01-32")).toBe(false));
  it("rejects wrong format (DD/MM/YYYY)", () => expect(isValidDate("15/06/2025")).toBe(false));
  it("rejects partial date", () => expect(isValidDate("2025-06")).toBe(false));
  it("rejects non-string", () => expect(isValidDate(20250615 as unknown as string)).toBe(false));
  it("rejects empty string", () => expect(isValidDate("")).toBe(false));
  it("rejects SQL injection", () => expect(isValidDate("2025-01-01'; DROP TABLE appointments--")).toBe(false));
  it("rejects Feb 30", () => expect(isValidDate("2025-02-30")).toBe(false));
  it("rejects April 31", () => expect(isValidDate("2025-04-31")).toBe(false));
});

describe("isValidTime", () => {
  it("accepts valid time", () => expect(isValidTime("09:30")).toBe(true));
  it("accepts midnight", () => expect(isValidTime("00:00")).toBe(true));
  it("accepts end-of-day", () => expect(isValidTime("23:59")).toBe(true));
  it("rejects hour 24", () => expect(isValidTime("24:00")).toBe(false));
  it("rejects minute 60", () => expect(isValidTime("12:60")).toBe(false));
  it("rejects negative hour", () => expect(isValidTime("-1:00")).toBe(false));
  it("rejects wrong format (H:MM)", () => expect(isValidTime("9:30")).toBe(false));
  it("rejects non-string", () => expect(isValidTime(930 as unknown as string)).toBe(false));
  it("rejects empty string", () => expect(isValidTime("")).toBe(false));
});

describe("clampDiscount", () => {
  it("returns 0 for 0", () => expect(clampDiscount(0)).toBe(0));
  it("returns 50 for 50", () => expect(clampDiscount(50)).toBe(50));
  it("returns 100 for 100", () => expect(clampDiscount(100)).toBe(100));
  it("clamps 150 to 100", () => expect(clampDiscount(150)).toBe(100));
  it("clamps -10 to 0", () => expect(clampDiscount(-10)).toBe(0));
  it("returns 0 for NaN", () => expect(clampDiscount(NaN)).toBe(0));
  it("returns 0 for Infinity", () => expect(clampDiscount(Infinity)).toBe(0));
  it("converts string number '50'", () => expect(clampDiscount("50")).toBe(50));
});

describe("roundMoney", () => {
  it("rounds to 2 decimals", () => expect(roundMoney(1.256)).toBe(1.26));
  it("leaves exact values unchanged", () => expect(roundMoney(100)).toBe(100));
  it("handles zero", () => expect(roundMoney(0)).toBe(0));
  it("returns 0 for Infinity", () => expect(roundMoney(Infinity)).toBe(0));
  it("returns 0 for NaN", () => expect(roundMoney(NaN)).toBe(0));
  it("handles floating point correctly 9.99", () => expect(roundMoney(9.99)).toBe(9.99));
  it("handles 19.995 correctly", () => expect(roundMoney(19.995)).toBe(20));
});

describe("coerceBool", () => {
  it("coerces true to 1", () => expect(coerceBool(true)).toBe(1));
  it("coerces 1 to 1", () => expect(coerceBool(1)).toBe(1));
  it("coerces '1' to 1", () => expect(coerceBool("1")).toBe(1));
  it("coerces 'true' to 1", () => expect(coerceBool("true")).toBe(1));
  it("coerces false to 0", () => expect(coerceBool(false)).toBe(0));
  it("coerces 0 to 0", () => expect(coerceBool(0)).toBe(0));
  it("coerces '0' to 0", () => expect(coerceBool("0")).toBe(0));
  it("coerces 'false' to 0", () => expect(coerceBool("false")).toBe(0));
  it("returns null for null", () => expect(coerceBool(null)).toBeNull());
  it("returns null for undefined", () => expect(coerceBool(undefined)).toBeNull());
  it("returns null for arbitrary string", () => expect(coerceBool("yes")).toBeNull());
  it("returns null for number 2", () => expect(coerceBool(2)).toBeNull());
});

describe("isBirthdayToday", () => {
  const today = new Date();
  const todayMonth = String(today.getMonth() + 1).padStart(2, "0");
  const todayDay = String(today.getDate()).padStart(2, "0");
  const todayBirthdate = `1990-${todayMonth}-${todayDay}`;

  it("returns true when birth month/day match today", () => {
    expect(isBirthdayToday(todayBirthdate)).toBe(true);
  });
  it("returns false for a different date", () => {
    const diff = today.getDate() === 1 ? "02" : "01";
    expect(isBirthdayToday(`1990-${todayMonth}-${diff}`)).toBe(false);
  });
  it("returns false for null", () => expect(isBirthdayToday(null)).toBe(false));
  it("returns false for undefined", () => expect(isBirthdayToday(undefined)).toBe(false));
  it("returns false for invalid format", () => expect(isBirthdayToday("not-a-date")).toBe(false));
  it("returns false for empty string", () => expect(isBirthdayToday("")).toBe(false));
});
