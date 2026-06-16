import { getConfig } from "@/lib/config";
import { stableHash } from "@/lib/hash";
import { sanitizeExternalText, truncateText } from "@/lib/utils";
import type { DiscoveredGitHubRepository, GitHubReadmeResult, GitHubSearchQuerySpec, GitHubSearchResponse, SearchOptions } from "./types";
import { mergeDiscoveredGitHubRepository } from "./dedupe";

const GITHUB_API = "https://api.github.com";

type RequestOptions = {
  accept?: string;
  retry?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    return Number(retryAfter) * 1000;
  }

  const reset = response.headers.get("x-ratelimit-reset");
  const remaining = response.headers.get("x-ratelimit-remaining");
  if (remaining === "0" && reset) {
    const resetMs = Number(reset) * 1000 - Date.now();
    return Math.max(1000, resetMs);
  }

  return Math.min(60000, 1000 * 2 ** attempt);
}

export class GitHubClient {
  private readonly token?: string;

  constructor(token = getConfig().githubToken) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
    const maxAttempts = options.retry ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(url, {
        headers: {
          Accept: options.accept ?? "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
        },
        cache: "no-store"
      });

      if (response.ok) {
        if (options.accept === "application/vnd.github.raw") {
          return (await response.text()) as T;
        }

        return (await response.json()) as T;
      }

      const rateLimited = response.status === 403 || response.status === 429;
      const body = await response.text().catch(() => "");
      lastError = new Error(`GitHub API ${response.status}: ${body.slice(0, 240)}`);

      if (rateLimited && attempt < maxAttempts - 1) {
        await sleep(getRetryDelay(response, attempt));
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
      for (const item of result.items) {
        if (item.stargazers_count >= spec.minStars) {
          mergeDiscoveredGitHubRepository(discovered, item, spec);
        }
      }
    }
  }

  return discovered;
}
