import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repositoryFindMany: vi.fn(),
  repositoryCount: vi.fn()
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    repository: {
      findMany: mocks.repositoryFindMany,
      count: mocks.repositoryCount
    }
  }
}));

import { getRepositoryPage } from "../../src/lib/db/repositories";

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
    readmeExcerpt: null,
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
    growth24h: null,
    growth7d: null,
    growthPercent7d: null,
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
    snapshots: [],
    ...overrides
  };
}

describe("getRepositoryPage", () => {
  beforeEach(() => {
    mocks.repositoryFindMany.mockReset();
    mocks.repositoryCount.mockReset();
    mocks.repositoryFindMany.mockResolvedValue([]);
    mocks.repositoryCount.mockResolvedValue(0);
  });

  it("uses Prisma ordering and pagination for growth7d_desc", async () => {
    await getRepositoryPage({ sortKey: "growth7d_desc", page: 3, pageSize: 25 });

    expect(mocks.repositoryFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.repositoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ growth7d: "desc" }, { trendScore: "desc" }],
        skip: 50,
        take: 25
      })
    );
    expect(mocks.repositoryCount).toHaveBeenCalledTimes(1);
  });

  it("normalizes malformed pagination and filters before querying Prisma", async () => {
    await getRepositoryPage({
      query: `  ai\u0000${"x".repeat(240)}  `,
      tab: { value: "library" },
      status: { value: "HOT" },
      language: "\u0000TypeScript",
      profile: "\u0000fresh_repos",
      minTrend: Number.NaN,
      sortKey: "unknown",
      page: Number.NaN,
      pageSize: Number.POSITIVE_INFINITY
    } as unknown as Parameters<typeof getRepositoryPage>[0]);

    const call = mocks.repositoryFindMany.mock.calls[0]?.[0];
    const where = call?.where as { AND?: Array<Record<string, unknown>> };
    const queryFilter = where.AND?.find((filter) => "OR" in filter) as { OR?: Array<Record<string, { contains: string }>> } | undefined;

    expect(call).toMatchObject({
      orderBy: [{ trendScore: "desc" }, { initialMomentumScore: "desc" }, { starsCurrent: "desc" }],
      skip: 0,
      take: 100
    });
    expect(where.AND).toContainEqual({ isDeletedFromView: false });
    expect(where.AND).toContainEqual({ primaryLanguage: "TypeScript" });
    expect(where.AND).toContainEqual({ discoveryProfilesJson: { contains: "fresh_repos" } });
    expect(queryFilter?.OR?.[0]?.fullName.contains).toHaveLength(160);
    expect(queryFilter?.OR?.[0]?.fullName.contains).not.toContain("\u0000");
    expect(where.AND).not.toContainEqual({ status: "HOT" });
  });

  it("returns mapped repositories in the Prisma result order", async () => {
    mocks.repositoryFindMany.mockResolvedValueOnce([
      repositoryRecord({ id: "repo_low", githubId: 10, fullName: "server/low", trendScore: 10 }),
      repositoryRecord({ id: "repo_high", githubId: 11, fullName: "server/high", trendScore: 99 })
    ]);
    mocks.repositoryCount.mockResolvedValueOnce(2);

    const page = await getRepositoryPage({ sortKey: "trend_desc", page: 1, pageSize: 2 });

    expect(page.items.map((repo) => repo.fullName)).toEqual(["server/low", "server/high"]);
    expect(page).toMatchObject({
      total: 2,
      page: 1,
      pageSize: 2,
      hasMore: false
    });
  });
});
