import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient, searchGitHubRepositories } from "../../src/lib/github/client";
import type { GitHubRepositoryItem } from "../../src/lib/github/types";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
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

  it("keeps only results that meet the matched profile minStars", async () => {
    const strongRepo = repo(1, "owner/strong", 120);
    const weakRepo = repo(2, "owner/weak", 80);
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total_count: 2,
          incomplete_results: false,
          items: [strongRepo, weakRepo]
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
