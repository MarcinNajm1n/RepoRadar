import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function sanitizeExternalText(value: string | null | undefined, maxLength = 12000) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\\x(?![0-9a-fA-F]{2})/g, "/x")
    .replace(/\\u(?![0-9a-fA-F]{4})/g, "/u")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "�")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�")
    .replace(/\s+/g, " ")
    .trim();

  return truncateText(cleaned, maxLength);
}

export function sanitizeExternalStringArray(values: string[] | undefined, maxItems = 30) {
  return (values ?? [])
    .map((value) => sanitizeExternalText(value, 80))
    .filter((value): value is string => Boolean(value))
    .slice(0, maxItems);
}

export function sanitizeExternalUrl(value: string | null | undefined, maxLength = 700) {
  const cleaned = sanitizeExternalText(value, maxLength);
  if (!cleaned) {
    return null;
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function monthsBetween(from: Date, to = new Date()) {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  return Math.max(0, years * 12 + months);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "brak danych";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}

export function toIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getIsoWeek(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}
