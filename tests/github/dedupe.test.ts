import { describe, expect, it } from "vitest";
import { dedupeGitHubRepositories, mergeDiscoveredGitHubRepository } from "../../src/lib/github/dedupe";
import type { DiscoveredGitHubRepository, GitHubRepositoryItem, GitHubSearchQuerySpec } from "../../src/lib/github/types";

function repo(id: number, fullName: unknown): GitHubRepositoryItem {
  const safeFullName = typeof fullName === "string" ? fullName : "runtime/malformed";

  return {
    id,
    full_name: fullName as string,
    name: safeFullName.split("/")[1],
    owner: { login: safeFullName.split("/")[0] },
    html_url: `https://github.com/${safeFullName}`,
    description: null,
    language: null,
    topics: [],
    license: null,
    created_at: "2026-06-01T00:00:00Z",
    pushed_at: "2026-06-10T00:00:00Z",
    stargazers_count: 1000,
    forks_count: 100,
    watchers_count: 1000,
    open_issues_count: 0,
    archived: false,
    fork: false,
    default_branch: "main"
  };
}

describe("dedupeGitHubRepositories", () => {
  it("deduplicates by github id and full name", () => {
    const result = dedupeGitHubRepositories([
      repo(1, "owner/tool"),
      repo(1, "owner/tool"),
      repo(2, "OWNER/tool"),
      repo(3, "owner/other")
    ]);

    expect(result.map((item) => item.full_name)).toEqual(["owner/tool", "owner/other"]);
  });

  it("merges discovery profiles for repeated search results", () => {
    const discovered: DiscoveredGitHubRepository[] = [];
    const firstSpec: GitHubSearchQuerySpec = {
      profile: "fresh_repos",
      query: "fresh",
      sort: "updated",
      order: "desc",
      minStars: 50
    };
    const secondSpec: GitHubSearchQuerySpec = {
      profile: "fast_momentum",
      query: "fast",
      sort: "stars",
      order: "desc",
      minStars: 100
    };

    mergeDiscoveredGitHubRepository(discovered, repo(1, "owner/tool"), firstSpec);
    mergeDiscoveredGitHubRepository(discovered, repo(1, "OWNER/tool"), secondSpec);

    expect(discovered).toHaveLength(1);
    expect(discovered[0].matchedProfiles).toEqual(["fresh_repos", "fast_momentum"]);
    expect(discovered[0].minStarsMatched).toBe(50);
  });

  it("does not throw when runtime payloads have non-string full_name values", () => {
    const malformed = repo(1, { full_name: "owner/tool" });
    const discovered: DiscoveredGitHubRepository[] = [];
    const spec: GitHubSearchQuerySpec = {
      profile: "fresh_repos",
      query: "fresh",
      sort: "updated",
      order: "desc",
      minStars: 50
    };

    expect(() => dedupeGitHubRepositories([malformed])).not.toThrow();
    expect(() => mergeDiscoveredGitHubRepository(discovered, malformed, spec)).not.toThrow();
    expect(discovered).toHaveLength(1);
  });
});
