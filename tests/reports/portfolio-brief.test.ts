import { describe, expect, it } from "vitest";
import { buildPortfolioBriefMarkdown } from "../../src/lib/reports/portfolio-brief";

const generatedAt = new Date("2026-06-21T12:00:00.000Z");

describe("portfolio brief markdown", () => {
  it("summarizes counts, top repositories and PDF guidance", () => {
    const markdown = buildPortfolioBriefMarkdown({
      generatedAt,
      counts: {
        repositories: 12,
        newRepositories: 3,
        savedRepositories: 4,
        activeTasks: 2,
        ideas: 5,
        weeklyReports: 1
      },
      topRepositories: [
        {
          id: "repo_1",
          fullName: "owner/tool",
          url: "https://github.com/owner/tool",
          trendScore: 91,
          relevanceScore: 80,
          initialMomentumScore: 70,
          starsCurrent: 1234,
          status: "HOT",
          primaryLanguage: "TypeScript",
          shortSummaryPl: "Mocny sygnal.",
          description: null,
          snapshots: [{ growth24h: 12, growth7d: 120, growthPercent7d: 10 }]
        }
      ],
      latestRepositories: [],
      ideas: [],
      lastScan: {
        status: "SUCCESS",
        reposFound: 50,
        reposUpdated: 20,
        startedAt: generatedAt
      },
      latestWeeklyReport: {
        title: "Weekly report 2026-25",
        summary: "1 rising",
        createdAt: generatedAt
      }
    });

    expect(markdown).toContain("# RepoRadar Brief - 2026-06-21");
    expect(markdown).toContain("- Repozytoria: 12");
    expect(markdown).toContain("[owner/tool](https://github.com/owner/tool)");
    expect(markdown).toContain("zapisac jako PDF");
  });

  it("escapes repository markdown links from stored data", () => {
    const markdown = buildPortfolioBriefMarkdown({
      generatedAt,
      counts: {
        repositories: 1,
        newRepositories: 0,
        savedRepositories: 0,
        activeTasks: 0,
        ideas: 0,
        weeklyReports: 0
      },
      topRepositories: [
        {
          id: "repo_1",
          fullName: "owner/repo]name",
          url: "javascript:alert(1)",
          trendScore: 91,
          relevanceScore: 80,
          initialMomentumScore: 70,
          starsCurrent: 1234,
          status: "HOT",
          primaryLanguage: "TypeScript",
          shortSummaryPl: null,
          description: "Mocny sygnal.",
          snapshots: []
        }
      ],
      latestRepositories: [],
      ideas: [],
      lastScan: null,
      latestWeeklyReport: null
    });

    expect(markdown).toContain("[owner/repo\\]name](https://github.com/)");
    expect(markdown).not.toContain("javascript:alert");
  });
});
