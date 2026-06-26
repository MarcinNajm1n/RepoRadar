import { safeJsonParse, sanitizeExternalStringArray } from "@/lib/utils";

export function sanitizeStoredStringArray(values: unknown, maxItems = 30) {
  return sanitizeExternalStringArray(values, maxItems);
}

export function parseStoredStringArray(value: string | null | undefined, maxItems = 30) {
  return sanitizeStoredStringArray(safeJsonParse<unknown>(value, []), maxItems);
}
