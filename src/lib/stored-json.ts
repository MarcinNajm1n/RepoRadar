import { clamp, safeJsonParse, sanitizeExternalStringArray, sanitizeExternalText } from "@/lib/utils";

type StoredNumberRecordOptions = {
  maxEntries?: number;
  min?: number;
  max?: number;
};

export function sanitizeStoredStringArray(values: unknown, maxItems = 30) {
  return sanitizeExternalStringArray(values, maxItems);
}

export function parseStoredStringArray(value: string | null | undefined, maxItems = 30) {
  return sanitizeStoredStringArray(safeJsonParse<unknown>(value, []), maxItems);
}

export function stringifyStoredStringArray(values: unknown, maxItems = 30) {
  return JSON.stringify(sanitizeStoredStringArray(values, maxItems));
}

export function sanitizeStoredNumberRecord(values: unknown, options: StoredNumberRecordOptions = {}): Record<string, number> {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return {};
  }

  const maxEntries = options.maxEntries ?? 50;
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;

  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => {
        const cleanKey = sanitizeExternalText(key, 120);
        if (!cleanKey || typeof value !== "number" || !Number.isFinite(value)) {
          return null;
        }

        return [cleanKey, clamp(value, min, max)] as const;
      })
      .filter((entry): entry is readonly [string, number] => entry !== null)
      .slice(0, maxEntries)
  );
}

export function parseStoredNumberRecord(value: string | null | undefined, options: StoredNumberRecordOptions = {}): Record<string, number> {
  return sanitizeStoredNumberRecord(safeJsonParse<unknown>(value, {}), options);
}

export function stringifyStoredNumberRecord(values: unknown, options: StoredNumberRecordOptions = {}) {
  return JSON.stringify(sanitizeStoredNumberRecord(values, options));
}
