import { describe, expect, it } from "vitest";
import { prioritizeIncrementalScanItems } from "../../src/lib/github/incremental-scan";
import type { DiscoveredGitHubRepository, GitHubRepositoryItem } from "../../src/lib/github/types";

function discovered(id: number, fullName: string, stars: number, pushedAt: string): DiscoveredGitHubRepository {
  return {
    item: {
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
      pushed_at: pushedAt,
      stargazers_count: stars,
      forks_count: 1,
      watchers_count: stars,
      open_issues_count: 0,
      archived: false,
      fork: false,
      default_branch: "main"
    } satisfies GitHubRepositoryItem,
    matchedProfiles: ["fast_momentum"],
    minStarsMatched: 0
  };
}

describe("prioritizeIncrementalScanItems", () => {
  it("orders new repositories before changed and unchanged repositories", () => {
    const unchanged = discovered(1, "owner/unchanged", 100, "2026-06-10T00:00:00Z");
    const changed = discovered(2, "owner/changed", 120, "2026-06-11T00:00:00Z");
    const fresh = discovered(3, "owner/fresh", 50, "2026-06-12T00:00:00Z");

    const ordered = prioritizeIncrementalScanItems([unchanged, changed, fresh], [
      {
        githubId: 1,
        fullName: "owner/unchanged",
        pushedAt: new Date("2026-06-10T00:00:00Z"),
        starsCurrent: 100
      },
      {
        githubId: 2,
        fullName: "owner/changed",
        pushedAt: new Date("2026-06-10T00:00:00Z"),
        starsCurrent: 100
      }
    ]);

    expect(ordered.map((item) => item.item.full_name)).toEqual(["owner/fresh", "owner/changed", "owner/unchanged"]);
  });
});
