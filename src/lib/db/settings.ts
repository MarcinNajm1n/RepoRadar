import { prisma } from "./client";
import { safeJsonParse } from "@/lib/utils";

const SECRET_SETTING_KEY_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /webhook/i,
  /^database[_-]?url$/i,
  /client[_-]?secret/i
];

export function isSecretSettingKey(key: string) {
  return SECRET_SETTING_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export async function getSetting(key: string, fallback = "") {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  if (isSecretSettingKey(key)) {
    throw new Error("Secret-like settings must stay in .env and cannot be stored in SQLite.");
  }

  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

export async function getAllSettings() {
  const rows = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function parseBooleanSetting(value: string | null | undefined, fallback: boolean) {
  if (value === null || value === undefined || value.trim() === "") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function parseNumberSetting(value: string | null | undefined, fallback: number) {
  if (value === null || value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseStringSetting(value: string | null | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

export function parseJsonSetting<T>(value: string | null | undefined, fallback: T) {
  return safeJsonParse<T>(value, fallback);
}

export async function getBooleanSetting(key: string, fallback: boolean) {
  return parseBooleanSetting(await getSetting(key), fallback);
}

export async function getNumberSetting(key: string, fallback: number) {
  return parseNumberSetting(await getSetting(key), fallback);
}

export async function getStringSetting(key: string, fallback: string) {
  return parseStringSetting(await getSetting(key), fallback);
}

export async function getJsonSetting<T>(key: string, fallback: T) {
  return parseJsonSetting<T>(await getSetting(key), fallback);
}
