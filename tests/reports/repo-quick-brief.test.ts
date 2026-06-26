import { describe, expect, it } from "vitest";
import { buildRepoQuickBriefMarkdown } from "../../src/lib/reports/repo-quick-brief";
import { repoQuickBriefPath } from "../../src/lib/reports/paths";

const repo = {
  id: "repo_1",
  fullName: "owner/tool",
  owner: "owner",
  name: "tool",
  url: "https://github.com/owner/tool",
  description: "AI developer tool",
  shortSummaryPl: "Krotki opis PL.",
  primaryLanguage: "TypeScript",
  topicsJson: JSON.stringify(["ai", "devtools"]),
  starsCurrent: 1000,
  forksCurrent: 100,
  openIssues: 5,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  pushedAt: new Date("2026-06-01T00:00:00Z"),
  trendScore: 85,
  relevanceScore: 90,
  initialMomentumScore: 40,
  status: "NEW",
  snapshots: [
    {
      capturedAt: new Date("2026-06-16T00:00:00Z"),
      stars: 1000,
      forks: 100,
      watchers: 1000,
      openIssues: 5,
      pushedAt: new Date("2026-06-01T00:00:00Z"),
      growth24h: 12,
      growth7d: 120,
      growthPercent7d: 13.6
    }
  ]
};

describe("repo quick brief", () => {
  it("builds a deterministic repository brief before the full AI report", () => {
    const markdown = buildRepoQuickBriefMarkdown(repo as never, new Date("2026-06-21T12:00:00Z"));

    expect(markdown).toContain("# RepoRadar quick brief - owner/tool");
    expect(markdown).toContain("## Decyzja");
    expect(markdown).toContain("Trend score: 85/100");
    expect(markdown).toContain("Growth 7d: +120");
    expect(markdown).toContain("pelny raport");
  });

  it("uses a separate quick brief path", () => {
    expect(repoQuickBriefPath("owner", "tool")).toBe("repos/owner__tool__quick-brief.md");
  });
});
