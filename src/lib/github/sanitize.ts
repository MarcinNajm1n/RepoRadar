const GITHUB_FULL_NAME_PATTERN = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]{1,100})$/;
const GITHUB_ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;
const MAX_SQLITE_INT = 2_147_483_647;

export function sanitizeGitHubRepositoryUrl(fullName: unknown) {
  return buildGitHubRepositoryUrl(fullName) ?? "https://github.com/";
}

export function sanitizeGitHubCount(value: unknown, fallback = 0) {
  if (typeof value !== "number" && typeof value !== "string") {
    return fallback;
  }
  if (typeof value === "string" && !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(MAX_SQLITE_INT, Math.max(0, Math.floor(parsed)));
}

export function sanitizeGitHubDate(value: unknown, fallback: Date, maxDate?: Date) {
  return parseGitHubDate(value, maxDate) ?? fallback;
}

export function sanitizeOptionalGitHubDate(value: unknown, maxDate?: Date) {
  return parseGitHubDate(value, maxDate);
}

function buildGitHubRepositoryUrl(fullName: unknown) {
  if (typeof fullName !== "string") {
    return null;
  }

  const match = fullName.match(GITHUB_FULL_NAME_PATTERN);
  return match ? `https://github.com/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}` : null;
}

function parseGitHubDate(value: unknown, maxDate?: Date) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(GITHUB_ISO_DATE_PATTERN);
  if (!match) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  const [, year, month, day, hour, minute, second, millisecond = "0"] = match;
  const expectedMillisecond = Number(millisecond.padEnd(3, "0"));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day) ||
    parsed.getUTCHours() !== Number(hour) ||
    parsed.getUTCMinutes() !== Number(minute) ||
    parsed.getUTCSeconds() !== Number(second) ||
    parsed.getUTCMilliseconds() !== expectedMillisecond
  ) {
    return null;
  }
  if (maxDate && parsed.getTime() > maxDate.getTime()) {
    return null;
  }

  return parsed;
}
