import { describe, expect, it } from "vitest";
import { mapRepository } from "../../src/lib/db/repositories";

const now = new Date("2026-06-16T12:00:00Z");

function repositoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "repo_1",
    githubId: 1,
    fullName: "owner/tool",
    owner: "owner",
    name: "tool",
    url: "https://github.com/owner/tool",
    description: "AI tool",
    readmeHash: null,
    readmeExcerpt: "install usage",
    primaryLanguage: "TypeScript",
    topicsJson: JSON.stringify(["ai"]),
    license: null,
    createdAt: now,
    pushedAt: now,
    firstSeenAt: now,
    lastSeenAt: now,
    starsCurrent: 1200,
    forksCurrent: 80,
    watchersCurrent: 1200,
    openIssues: 3,
    ageMonths: 1,
    isOldRepo: false,
    isArchived: false,
    isFork: false,
    isDeletedFromView: false,
    status: "NEW",
    shortSummaryPl: null,
    lastAnalyzedAt: null,
    trendScore: 72,
    relevanceScore: 90,
    initialMomentumScore: 77,
    scoreBreakdownJson: JSON.stringify({
      absoluteGrowthPoints: 10,
      percentageGrowthPoints: 0,
      agePoints: 8,
      totalStarsPoints: 3,
      forksPoints: 2,
      pushFreshnessPoints: 8,
      topicRelevancePoints: 7,
      readmeQualityPoints: 4,
      keywordRelevancePoints: 3,
      initialMomentumPoints: 77,
      usedInitialMomentumFallback: true
    }),
    discoveryProfilesJson: JSON.stringify(["fresh_repos"]),
    source: "github",
    createdDbAt: now,
    updatedDbAt: now,
    snapshots: [{ growth24h: null, growth7d: null, growthPercent7d: null }],
    ...overrides
  };
}

describe("mapRepository", () => {
  it("maps discovery explainability fields", () => {
    const mapped = mapRepository(repositoryRecord());

    expect(mapped.initialMomentumScore).toBe(77);
    expect(mapped.discoveryProfiles).toEqual(["fresh_repos"]);
    expect(mapped.scoreBreakdown.usedInitialMomentumFallback).toBe(true);
  });

  it("falls back safely for broken JSON", () => {
    const mapped = mapRepository(
      repositoryRecord({
        topicsJson: "{bad",
        scoreBreakdownJson: "{bad",
        discoveryProfilesJson: "{bad"
      })
    );

    expect(mapped.topics).toEqual([]);
    expect(mapped.discoveryProfiles).toEqual([]);
    expect(mapped.scoreBreakdown.absoluteGrowthPoints).toBe(0);
    expect(mapped.scoreBreakdown.usedInitialMomentumFallback).toBe(false);
  });
});
