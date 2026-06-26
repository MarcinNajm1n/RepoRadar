import { getConfig } from "@/lib/config";
import { stableHash } from "@/lib/hash";
import { sanitizeExternalText, truncateText } from "@/lib/utils";
import type {
  DiscoveredGitHubRepository,
  GitHubReadmeResult,
  GitHubRepositoryItem,
  GitHubSearchQuerySpec,
  GitHubSearchResponse,
  SearchOptions
} from "./types";
import { mergeDiscoveredGitHubRepository } from "./dedupe";
import { captureGitHubRateLimit } from "./rate-limit";
import { sanitizeGitHubCount } from "./sanitize";

const GITHUB_API = "https://api.github.com";
const MAX_GITHUB_RETRY_DELAY_MS = 30_000;
const MAX_CONDITIONAL_CACHE_ENTRIES = 200;
const MAX_GITHUB_JSON_RESPONSE_BYTES = 5_000_000;
const MAX_GITHUB_RAW_RESPONSE_BYTES = 500_000;
const MAX_GITHUB_ERROR_RESPONSE_BYTES = 16_000;
const GITHUB_OWNER_LOGIN_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const GITHUB_REPOSITORY_NAME_PATTERN = /^[a-z\d._-]{1,100}$/i;

type RequestOptions = {
  accept?: string;
  retry?: number;
};

type CachedGitHubResponse = {
  body: string;
  etag: string | null;
  lastModified: string | null;
};

const conditionalResponseCache = new Map<string, CachedGitHubResponse>();
const runtimeCacheStats = {
  requests: 0,
  cacheHits: 0,
  notModifiedHits: 0,
  cacheWrites: 0
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }

    const retryAt = new Date(retryAfter).getTime();
    if (Number.isFinite(retryAt)) {
      return Math.max(1000, retryAt - Date.now());
    }
  }

  const reset = response.headers.get("x-ratelimit-reset");
  const remaining = response.headers.get("x-ratelimit-remaining");
  if (remaining === "0" && reset) {
    const resetMs = Number(reset) * 1000 - Date.now();
    return Math.max(1000, resetMs);
  }

  return Math.min(60000, 1000 * 2 ** attempt);
}

function buildCacheKey(url: string, accept: string, authMode: string) {
  return `${authMode}:${accept}:${url}`;
}

function readCachedResponse<T>(cached: CachedGitHubResponse, accept: string): T {
  if (accept === "application/vnd.github.raw") {
    return cached.body as T;
  }

  return JSON.parse(cached.body) as T;
}

function writeCachedResponse(cacheKey: string, response: Response, body: string) {
  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");

  if (!etag && !lastModified) {
    return;
  }

  if (conditionalResponseCache.size >= MAX_CONDITIONAL_CACHE_ENTRIES) {
    const oldestKey = conditionalResponseCache.keys().next().value;
    if (oldestKey) {
      conditionalResponseCache.delete(oldestKey);
    }
  }

  conditionalResponseCache.set(cacheKey, {
    body,
    etag,
    lastModified
  });
  runtimeCacheStats.cacheWrites += 1;
}

function responseBodyLimit(accept: string) {
  return accept === "application/vnd.github.raw" ? MAX_GITHUB_RAW_RESPONSE_BYTES : MAX_GITHUB_JSON_RESPONSE_BYTES;
}

function assertContentLengthWithinLimit(response: Response, maxBytes: number) {
  const rawContentLength = response.headers.get("content-length");
  if (!rawContentLength) {
    return;
  }

  const contentLength = Number(rawContentLength);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`GitHub response exceeds ${maxBytes} bytes`);
  }
}

async function readResponseTextWithLimit(response: Response, maxBytes: number) {
  assertContentLengthWithinLimit(response, maxBytes);

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error(`GitHub response exceeds ${maxBytes} bytes`);
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`GitHub response exceeds ${maxBytes} bytes`);
      }

      text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function formatRateLimitReset(response: Response) {
  const reset = response.headers.get("x-ratelimit-reset");
  if (!reset) {
    return null;
  }

  const resetDate = new Date(Number(reset) * 1000);
  return Number.isNaN(resetDate.getTime()) ? null : resetDate.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGitHubOwnerLogin(value: unknown): value is string {
  return typeof value === "string" && GITHUB_OWNER_LOGIN_PATTERN.test(value);
}

function isGitHubRepositoryName(value: unknown): value is string {
  return typeof value === "string" && GITHUB_REPOSITORY_NAME_PATTERN.test(value) && value !== "." && value !== "..";
}

function isMatchingRepositoryFullName(value: unknown, owner: string, name: string) {
  return value === `${owner}/${name}`;
}

function assertValidGitHubRepositoryIdentifier(owner: string, repo: string) {
  if (!isGitHubOwnerLogin(owner) || !isGitHubRepositoryName(repo)) {
    throw new Error("Invalid GitHub repository identifier");
  }
}

function isUsableGitHubSearchItem(value: unknown): value is GitHubRepositoryItem {
  if (!isRecord(value) || !isRecord(value.owner)) {
    return false;
  }

  const ownerLogin = value.owner.login;
  const repositoryName = value.name;

  if (!isGitHubOwnerLogin(ownerLogin) || !isGitHubRepositoryName(repositoryName)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    isMatchingRepositoryFullName(value.full_name, ownerLogin, repositoryName) &&
    typeof value.archived === "boolean" &&
    typeof value.fork === "boolean"
  );
}

function getUsableGitHubSearchItems(response: GitHubSearchResponse) {
  const items = (response as { items?: unknown }).items;
  return Array.isArray(items) ? items.filter(isUsableGitHubSearchItem) : [];
}

export class GitHubClient {
  private readonly token?: string;

  constructor(token = getConfig().githubToken) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
    const accept = options.accept ?? "application/vnd.github+json";
    const cacheKey = buildCacheKey(url, accept, this.token ? "auth" : "anon");
    const cached = conditionalResponseCache.get(cacheKey);
    const maxAttempts = options.retry ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(url, {
        headers: {
          Accept: accept,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(cached?.etag ? { "If-None-Match": cached.etag } : {}),
          ...(cached?.lastModified ? { "If-Modified-Since": cached.lastModified } : {}),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
        },
        cache: "no-store"
      });
      runtimeCacheStats.requests += 1;
      captureGitHubRateLimit(response);

      if (response.status === 304 && cached) {
        runtimeCacheStats.cacheHits += 1;
        runtimeCacheStats.notModifiedHits += 1;
        return readCachedResponse<T>(cached, accept);
      }

      if (response.ok) {
        const body = await readResponseTextWithLimit(response, responseBodyLimit(accept));
        writeCachedResponse(cacheKey, response, body);

        if (accept === "application/vnd.github.raw") {
          return body as T;
        }

        return JSON.parse(body) as T;
      }

      const rateLimited = response.status === 403 || response.status === 429;
      const body = await readResponseTextWithLimit(response, MAX_GITHUB_ERROR_RESPONSE_BYTES).catch(() => "");
      lastError = new Error(`GitHub API ${response.status}: ${body.slice(0, 240)}`);

      if (rateLimited && attempt < maxAttempts - 1) {
        const delay = getRetryDelay(response, attempt);
        if (delay > MAX_GITHUB_RETRY_DELAY_MS) {
          const resetAt = formatRateLimitReset(response);
          throw new Error(resetAt ? `GitHub API rate limit exhausted until ${resetAt}.` : "GitHub API rate limit exhausted.");
        }

        await sleep(delay);
        continue;
      }

      break;
    }

    throw lastError ?? new Error("GitHub API request failed");
  }

  async searchRepositories(options: SearchOptions): Promise<GitHubSearchResponse> {
    const params = new URLSearchParams({
      q: options.query,
      sort: options.sort ?? "stars",
      order: options.order ?? "desc",
      per_page: String(options.perPage ?? 100),
      page: String(options.page ?? 1)
    });

    return this.request<GitHubSearchResponse>(`/search/repositories?${params.toString()}`);
  }

  async getReadme(owner: string, repo: string): Promise<GitHubReadmeResult | null> {
    assertValidGitHubRepositoryIdentifier(owner, repo);

    try {
      const text = await this.request<string>(`/repos/${owner}/${repo}/readme`, {
        accept: "application/vnd.github.raw",
        retry: 2
      });
      return {
        text,
        hash: stableHash(text),
        excerpt: sanitizeExternalText(truncateText(text, 2400), 2400) ?? ""
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }

      throw error;
    }
  }
}

export function getGitHubRuntimeCacheStats() {
  return {
    ...runtimeCacheStats,
    cacheEntries: conditionalResponseCache.size,
    maxEntries: MAX_CONDITIONAL_CACHE_ENTRIES
  };
}

export function clearGitHubRuntimeCacheStats() {
  runtimeCacheStats.requests = 0;
  runtimeCacheStats.cacheHits = 0;
  runtimeCacheStats.notModifiedHits = 0;
  runtimeCacheStats.cacheWrites = 0;
  conditionalResponseCache.clear();
}

export async function searchGitHubRepositories(queries: GitHubSearchQuerySpec[], maxPages = 1) {
  const client = new GitHubClient();
  const discovered: DiscoveredGitHubRepository[] = [];

  for (const spec of queries) {
    for (let page = 1; page <= maxPages; page += 1) {
      const result = await client.searchRepositories({
        query: spec.query,
        sort: spec.sort,
        order: spec.order,
        page,
        perPage: 100
      });
      for (const item of getUsableGitHubSearchItems(result)) {
        if (sanitizeGitHubCount(item.stargazers_count) >= spec.minStars) {
          mergeDiscoveredGitHubRepository(discovered, item, spec);
        }
      }
    }
  }

  return discovered;
}
