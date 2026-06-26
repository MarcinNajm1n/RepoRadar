import { afterEach, describe, expect, it, vi } from "vitest";
import { clearGitHubRuntimeCacheStats, getGitHubRuntimeCacheStats, GitHubClient, searchGitHubRepositories } from "../../src/lib/github/client";
import { clearGitHubRateLimitSnapshot, getLastGitHubRateLimitSnapshot } from "../../src/lib/github/rate-limit";
import type { GitHubRepositoryItem, SearchOptions } from "../../src/lib/github/types";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  clearGitHubRuntimeCacheStats();
  clearGitHubRateLimitSnapshot();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GitHubClient", () => {
  it("uses stars desc by default for repository search", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({ total_count: 0, incomplete_results: false, items: [] }), { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await new GitHubClient(undefined).searchRepositories({ query: "ai agent" });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("sort")).toBe("stars");
    expect(url.searchParams.get("order")).toBe("desc");
  });

  it("passes explicit updated sort and desc order", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({ total_count: 0, incomplete_results: false, items: [] }), { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await new GitHubClient(undefined).searchRepositories({ query: "mcp", sort: "updated", order: "desc" });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("sort")).toBe("updated");
    expect(url.searchParams.get("order")).toBe("desc");
  });

  it("normalizes search request options before fetching", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({ total_count: 0, incomplete_results: false, items: [] }), { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await new GitHubClient(undefined).searchRepositories({
      query: "  ai\u0000 agent  ",
      sort: "unexpected",
      order: "asc",
      perPage: 999.7,
      page: -3
    } as unknown as SearchOptions);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe("ai agent");
    expect(url.searchParams.get("sort")).toBe("stars");
    expect(url.searchParams.get("order")).toBe("desc");
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(url.searchParams.get("page")).toBe("1");
  });

  it("rejects invalid search queries before fetching", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const client = new GitHubClient(undefined);

    await expect(client.searchRepositories({ query: "   " })).rejects.toThrow("Invalid GitHub search query");
    await expect(client.searchRepositories({ query: "a".repeat(513) })).rejects.toThrow("Invalid GitHub search query");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("captures the latest GitHub rate limit headers", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ total_count: 0, incomplete_results: false, items: [] }), {
        status: 200,
        headers: {
          "x-ratelimit-limit": "5000",
          "x-ratelimit-remaining": "4998",
          "x-ratelimit-used": "2",
          "x-ratelimit-reset": "1782043200",
          "x-ratelimit-resource": "search"
        }
      })
    ) as unknown as typeof fetch;

    await new GitHubClient(undefined).searchRepositories({ query: "ai agent" });

    expect(getLastGitHubRateLimitSnapshot()).toMatchObject({
      status: 200,
      resource: "search",
      limit: 5000,
      remaining: 4998,
      used: 2,
      resetAt: "2026-06-21T12:00:00.000Z"
    });
  });

  it("reuses cached GitHub responses after a 304", async () => {
    const strongRepo = repo(1, "owner/strong", 120);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ total_count: 1, incomplete_results: false, items: [strongRepo] }), {
          status: 200,
          headers: { etag: '"search-v1"' }
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new GitHubClient(undefined);
    const first = await client.searchRepositories({ query: "cached query" });
    const second = await client.searchRepositories({ query: "cached query" });

    expect(first.items[0].full_name).toBe("owner/strong");
    expect(second.items[0].full_name).toBe("owner/strong");
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toMatchObject({
      "If-None-Match": '"search-v1"'
    });
    expect(getGitHubRuntimeCacheStats()).toMatchObject({
      requests: 2,
      cacheHits: 1,
      notModifiedHits: 1,
      cacheWrites: 1,
      cacheEntries: 1
    });
  });

  it("rejects oversized raw README responses before caching them", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("short", {
          status: 200,
          headers: {
            "content-length": "500001",
            etag: '"readme-v1"'
          }
        })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(new GitHubClient(undefined).getReadme("owner", "repo")).rejects.toThrow("GitHub response exceeds 500000 bytes");
    expect(getGitHubRuntimeCacheStats()).toMatchObject({
      requests: 1,
      cacheWrites: 0,
      cacheEntries: 0
    });
  });

  it("rejects invalid README repository identifiers before fetching", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const client = new GitHubClient(undefined);

    await expect(client.getReadme("owner/path", "repo")).rejects.toThrow("Invalid GitHub repository identifier");
    await expect(client.getReadme("owner", "../repo")).rejects.toThrow("Invalid GitHub repository identifier");
    await expect(client.getReadme("owner", "repo?ref=main")).rejects.toThrow("Invalid GitHub repository identifier");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("honors date-form Retry-After headers without producing NaN delays", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T12:00:00Z"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "Tue, 16 Jun 2026 12:00:02 GMT" }
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ total_count: 0, incomplete_results: false, items: [] }), { status: 200 }));
    const timeoutSpy = vi.spyOn(global, "setTimeout");
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = new GitHubClient(undefined).searchRepositories({ query: "rate limited" });
    await vi.advanceTimersByTimeAsync(2000);
    await request;

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it("keeps only results that meet the matched profile minStars", async () => {
    const strongRepo = repo(1, "owner/strong", 120);
    const weakRepo = repo(2, "owner/weak", 80);
    const malformedRepo = { ...repo(3, "owner/malformed", 0), stargazers_count: "Infinity" as unknown as number };
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total_count: 3,
          incomplete_results: false,
          items: [strongRepo, weakRepo, malformedRepo]
        }),
        { status: 200 }
      )
    ) as unknown as typeof fetch;

    const result = await searchGitHubRepositories(
      [{ profile: "fast_momentum", query: "ai", sort: "stars", order: "desc", minStars: 100 }],
      1
    );

    expect(result).toHaveLength(1);
    expect(result[0].item.full_name).toBe("owner/strong");
    expect(result[0].matchedProfiles).toEqual(["fast_momentum"]);
  });

  it("ignores malformed GitHub search items and non-array item payloads", async () => {
    const strongRepo = repo(1, "owner/strong", 120);
    const badOwnerRepo = { ...repo(2, "owner/bad-owner", 130), owner: null };
    const badIdRepo = { ...repo(3, "owner/bad-id", 140), id: "3" };
    const badNameRepo = { ...repo(4, "owner/bad-name", 150), name: "" };
    const badPathRepo = { ...repo(5, "owner/bad-path", 160), name: "bad/path" };
    const mismatchedFullNameRepo = { ...repo(6, "owner/mismatch", 170), full_name: "other/mismatch" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total_count: 7,
            incomplete_results: false,
            items: [strongRepo, badOwnerRepo, badIdRepo, badNameRepo, badPathRepo, mismatchedFullNameRepo, null]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total_count: 1,
            incomplete_results: false,
            items: { full_name: "owner/not-an-array" }
          }),
          { status: 200 }
        )
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await searchGitHubRepositories(
      [{ profile: "fast_momentum", query: "ai", sort: "stars", order: "desc", minStars: 100 }],
      2
    );

    expect(result).toHaveLength(1);
    expect(result[0].item.full_name).toBe("owner/strong");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

function repo(id: number, fullName: string, stars: number): GitHubRepositoryItem {
  return {
    id,
    full_name: fullName,
    name: fullName.split("/")[1],
    owner: { login: fullName.split("/")[0] },
    html_url: `https://github.com/${fullName}`,
    description: null,
    language: null,
    topics: [],
    license: null,
    created_at: "2026-06-01T00:00:00Z",
    pushed_at: "2026-06-10T00:00:00Z",
    stargazers_count: stars,
    forks_count: 10,
    watchers_count: stars,
    open_issues_count: 0,
    archived: false,
    fork: false,
    default_branch: "main"
  };
}
