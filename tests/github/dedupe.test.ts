import { describe, expect, it } from "vitest";
import { dedupeGitHubRepositories } from "../../src/lib/github/dedupe";
import type { GitHubRepositoryItem } from "../../src/lib/github/types";

function repo(id: number, fullName: string): GitHubRepositoryItem {
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
});
