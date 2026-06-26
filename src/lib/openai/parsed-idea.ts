import { clamp, sanitizeExternalStringArray, sanitizeExternalText } from "@/lib/utils";

function coerceFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function sanitizeIntegerInRange(value: unknown, fallback: number, min: number, max: number) {
  const numeric = coerceFiniteNumber(value) ?? coerceFiniteNumber(fallback) ?? min;
  return Math.round(clamp(numeric, min, max));
}

function sanitizeOptionalIntegerInRange(value: unknown, fallback: number | null, min: number, max: number) {
  const numeric = coerceFiniteNumber(value) ?? coerceFiniteNumber(fallback);
  return numeric === null ? null : Math.round(clamp(numeric, min, max));
}

export function sanitizeAiRating(value: unknown, fallback = 3) {
  return sanitizeIntegerInRange(value, fallback, 1, 5);
}

export function sanitizeOptionalAiRating(value: unknown, fallback: number | null = null) {
  return sanitizeOptionalIntegerInRange(value, fallback, 1, 5);
}

export function sanitizeOptionalAiScore(value: unknown, fallback: number | null = null) {
  return sanitizeOptionalIntegerInRange(value, fallback, 0, 100);
}

export function sanitizeAiText(value: unknown, fallback: string, maxLength = 1200) {
  return sanitizeExternalText(value, maxLength) ?? sanitizeExternalText(fallback, maxLength) ?? "";
}

export function sanitizeOptionalAiText(value: unknown, fallback: string | null = null, maxLength = 1200) {
  return sanitizeExternalText(value, maxLength) ?? sanitizeExternalText(fallback, maxLength);
}

export function sanitizeAiStringArray(value: unknown, fallback: unknown, maxItems = 30) {
  const sanitized = sanitizeExternalStringArray(value, maxItems);
  return sanitized.length > 0 ? sanitized : sanitizeExternalStringArray(fallback, maxItems);
}
