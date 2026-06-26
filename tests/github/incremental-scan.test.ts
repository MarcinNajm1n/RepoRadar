import { describe, expect, it } from "vitest";
import { prioritizeIncrementalScanItems } from "../../src/lib/github/incremental-scan";
import type { DiscoveredGitHubRepository, GitHubRepositoryItem } from "../../src/lib/github/types";

function discovered(id: number, fullName: unknown, stars: unknown, pushedAt: unknown): DiscoveredGitHubRepository {
  const safeFullName = typeof fullName === "string" ? fullName : "runtime/malformed";

  return {
    item: {
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
      pushed_at: pushedAt as string,
      stargazers_count: stars as number,
      forks_count: 1,
      watchers_count: stars as number,
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

  it("uses sanitized stars and pushed dates when prioritizing runtime payloads", () => {
    const safe = discovered(1, "owner/safe", 100, "2026-06-10T00:00:00Z");
    const malformed = discovered(2, "owner/malformed", "Infinity", "not-a-date");
    const unchanged = discovered(3, "owner/unchanged", 10, "2026-06-10T00:00:00Z");

    const ordered = prioritizeIncrementalScanItems([malformed, unchanged, safe], [
      {
        githubId: 3,
        fullName: "owner/unchanged",
        pushedAt: new Date("2026-06-10T00:00:00Z"),
        starsCurrent: 10
      }
    ]);

    expect(ordered.map((item) => item.item.full_name)).toEqual(["owner/safe", "owner/malformed", "owner/unchanged"]);
  });

  it("does not throw when a runtime payload has a non-string full_name", () => {
    const malformed = discovered(1, { full_name: "owner/tool" }, 100, "2026-06-10T00:00:00Z");
    const safe = discovered(2, "owner/safe", 80, "2026-06-10T00:00:00Z");

    expect(() => prioritizeIncrementalScanItems([malformed, safe], [])).not.toThrow();
    expect(prioritizeIncrementalScanItems([malformed, safe], [])[0].item.full_name).toEqual({ full_name: "owner/tool" });
  });
});
