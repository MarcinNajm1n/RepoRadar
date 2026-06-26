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

export function sanitizeExternalText(value: unknown, maxLength = 12000) {
  if (typeof value !== "string") {
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

export function sanitizeExternalStringArray(values: unknown, maxItems = 30) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeExternalText(value, 80))
    .filter((value): value is string => Boolean(value))
    .slice(0, maxItems);
}

export function sanitizeExternalUrl(value: unknown, maxLength = 700) {
  const cleaned = sanitizeExternalText(value, maxLength);
  if (!cleaned) {
    return null;
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    if (isBlockedHost(parsed.hostname)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function isBlockedHost(hostname: string) {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/g, "");
  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) {
    return true;
  }

  if (isBlockedIpv6Host(normalized)) {
    return true;
  }

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) {
    return false;
  }

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  return isBlockedIpv4Octets(first, second);
}

function isBlockedIpv4Octets(first: number, second: number) {
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 192 && second === 0) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isBlockedIpv6Host(hostname: string) {
  if (!hostname.includes(":")) {
    return false;
  }

  const withoutZone = hostname.split("%")[0];
  if (withoutZone === "::" || withoutZone === "::1") {
    return true;
  }

  const firstHextetRaw = withoutZone.split(":").find(Boolean) ?? "";
  const firstHextet = Number.parseInt(firstHextetRaw, 16);
  if (Number.isFinite(firstHextet)) {
    if ((firstHextet & 0xfe00) === 0xfc00) {
      return true;
    }
    if ((firstHextet & 0xffc0) === 0xfe80) {
      return true;
    }
  }

  const dottedIpv4 = withoutZone.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (dottedIpv4 && withoutZone.includes("ffff")) {
    const octets = dottedIpv4.slice(1).map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) {
      return true;
    }
    return isBlockedIpv4Octets(octets[0], octets[1]);
  }

  const mappedHex = withoutZone.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      return true;
    }
    const first = (high >> 8) & 255;
    const second = high & 255;
    return isBlockedIpv4Octets(first, second);
  }

  return false;
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
