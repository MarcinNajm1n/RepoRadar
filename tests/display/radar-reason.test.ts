import { describe, expect, it } from "vitest";
import { buildRepositoryRadarReasons } from "../../src/lib/display/radar-reason";
import type { RepositoryListItem } from "../../src/types/repository";

function repo(overrides: Partial<RepositoryListItem> = {}): RepositoryListItem {
  return {
    id: "repo_1",
    fullName: "owner/tool",
    owner: "owner",
    name: "tool",
    url: "https://github.com/owner/tool",
    description: "AI tool",
    readmeExcerpt: "README",
    primaryLanguage: "TypeScript",
    topics: ["ai"],
    license: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    pushedAt: "2026-06-01T00:00:00.000Z",
    firstSeenAt: "2026-06-16T00:00:00.000Z",
    lastSeenAt: "2026-06-16T00:00:00.000Z",
    starsCurrent: 1000,
    forksCurrent: 100,
    watchersCurrent: 1000,
    openIssues: 4,
    ageMonths: 5,
    isOldRepo: false,
    isArchived: false,
    isFork: false,
    isDeletedFromView: false,
    status: "NEW",
    shortSummaryPl: null,
    lastAnalyzedAt: null,
    trendScore: 85,
    relevanceScore: 90,
    initialMomentumScore: 0,
    scoreBreakdown: {
      absoluteGrowthPoints: 10,
      percentageGrowthPoints: 5,
      agePoints: 8,
      totalStarsPoints: 4,
      forksPoints: 2,
      pushFreshnessPoints: 8,
      topicRelevancePoints: 7,
      readmeQualityPoints: 4,
      keywordRelevancePoints: 3,
      initialMomentumPoints: 0,
      usedInitialMomentumFallback: false
    },
    discoveryProfiles: ["fresh_repos"],
    source: "github",
    growth24h: 5,
    growth7d: 120,
    growthPercent7d: 14,
    ...overrides
  };
}

describe("buildRepositoryRadarReasons", () => {
  it("explains high score, growth and relevance", () => {
    const reasons = buildRepositoryRadarReasons(repo());

    expect(reasons.map((reason) => reason.id)).toEqual(expect.arrayContaining(["high-trend", "growth-7d", "relevance"]));
  });

  it("warns when initial momentum replaces confirmed 7d history", () => {
    const reasons = buildRepositoryRadarReasons(
      repo({
        trendScore: 65,
        initialMomentumScore: 70,
        growth7d: null,
        scoreBreakdown: { ...repo().scoreBreakdown, usedInitialMomentumFallback: true }
      })
    );

    expect(reasons.find((reason) => reason.id === "initial-momentum")?.tone).toBe("warning");
  });
});
