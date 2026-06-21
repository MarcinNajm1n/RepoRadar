export type GitHubRateLimitSnapshot = {
  checkedAt: string;
  status: number;
  resource: string | null;
  limit: number | null;
  remaining: number | null;
  used: number | null;
  resetAt: string | null;
};

let lastRateLimitSnapshot: GitHubRateLimitSnapshot | null = null;

function parseHeaderNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseResetAt(value: string | null) {
  const seconds = parseHeaderNumber(value);
  if (seconds === null) {
    return null;
  }

  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function captureGitHubRateLimit(response: Response, checkedAt = new Date()) {
  const limit = parseHeaderNumber(response.headers.get("x-ratelimit-limit"));
  const remaining = parseHeaderNumber(response.headers.get("x-ratelimit-remaining"));
  const used = parseHeaderNumber(response.headers.get("x-ratelimit-used"));
  const resetAt = parseResetAt(response.headers.get("x-ratelimit-reset"));
  const resource = response.headers.get("x-ratelimit-resource");

  if (limit === null && remaining === null && used === null && resetAt === null && !resource) {
    return lastRateLimitSnapshot;
  }

  lastRateLimitSnapshot = {
    checkedAt: checkedAt.toISOString(),
    status: response.status,
    resource,
    limit,
    remaining,
    used,
    resetAt
  };

  return lastRateLimitSnapshot;
}

export function getLastGitHubRateLimitSnapshot() {
  return lastRateLimitSnapshot;
}

export function clearGitHubRateLimitSnapshot() {
  lastRateLimitSnapshot = null;
}
