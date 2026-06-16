import { describe, expect, it } from "vitest";
import { buildDailyBriefingMarkdown } from "../../src/lib/reports/briefing";
import type { ActionItemListItem } from "../../src/types/action-item";
import type { DashboardData, IdeaListItem, RepositoryListItem } from "../../src/types/repository";

const now = new Date("2026-06-16T12:00:00Z");

function repo(overrides: Partial<RepositoryListItem> = {}): RepositoryListItem {
  return {
    id: "repo_1",
    fullName: "owner/tool",
    owner: "owner",
    name: "tool",
    url: "https://github.com/owner/tool",
    description: null,
    readmeExcerpt: null,
    primaryLanguage: "TypeScript",
    topics: ["ai"],
    license: null,
    createdAt: now.toISOString(),
    pushedAt: now.toISOString(),
    firstSeenAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    starsCurrent: 1200,
    forksCurrent: 80,
    watchersCurrent: 1200,
    openIssues: 3,
    ageMonths: 2,
    isOldRepo: false,
    isArchived: false,
    isFork: false,
    isDeletedFromView: false,
    status: "NEW",
    shortSummaryPl: null,
    lastAnalyzedAt: null,
    trendScore: 80,
    relevanceScore: 90,
    initialMomentumScore: 70,
    scoreBreakdown: {
      absoluteGrowthPoints: 0,
      percentageGrowthPoints: 0,
      agePoints: 0,
      totalStarsPoints: 0,
      forksPoints: 0,
      pushFreshnessPoints: 0,
      topicRelevancePoints: 0,
      readmeQualityPoints: 0,
      keywordRelevancePoints: 0,
      initialMomentumPoints: 0,
      usedInitialMomentumFallback: false
    },
    discoveryProfiles: [],
    source: "github",
    growth24h: null,
    growth7d: null,
    growthPercent7d: null,
    ...overrides
  };
}

function idea(overrides: Partial<IdeaListItem> = {}): IdeaListItem {
  return {
    id: "idea_1",
    sourceRepoId: "repo_1",
    sourceRepoName: "owner/tool",
    title: "Automate workflow",
    problem: "Manual workflow",
    proposedSolution: "Automation",
    targetUser: "Developers",
    mvpScope: "Dashboard",
    monetizationPotential: "Subscription",
    difficulty: 2,
    usefulnessScore: 5,
    riskScore: 2,
    confidenceScore: 4,
    opportunityScore: 88,
    opportunityBreakdown: {},
    applicationSummary: null,
    businessRationale: null,
    researchMode: "light",
    marketSummary: null,
    suggestedStack: "Next.js",
    firstSteps: [],
    evidenceIds: [],
    evidenceSources: [],
    status: "CANDIDATE",
    lastResearchAt: null,
    createdAt: now.toISOString(),
    ...overrides
  };
}

function actionItem(overrides: Partial<ActionItemListItem> = {}): ActionItemListItem {
  return {
    id: "action_1",
    type: "READ_README",
    status: "OPEN",
    title: "Read README",
    description: null,
    repoId: "repo_1",
    repoFullName: "owner/tool",
    repoUrl: "https://github.com/owner/tool",
    ideaId: null,
    ideaTitle: null,
    reportId: null,
    reportTitle: null,
    priority: 1,
    dueAt: null,
    snoozedUntil: null,
    completedAt: null,
    dismissedAt: null,
    dedupeKey: null,
    metadata: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides
  };
}

describe("buildDailyBriefingMarkdown", () => {
  it("builds a deterministic local briefing without AI markers", () => {
    const topRepo = repo();
    const weakRepo = repo({ id: "repo_2", fullName: "owner/old", trendScore: 20, isOldRepo: true });
    const candidate = idea();
    const task = actionItem();
    const data = {
      repositories: [topRepo, weakRepo],
      radarToday: {
        topRepositories: [topRepo],
        businessCandidates: [candidate],
        actionItems: [task],
        alerts: [{ id: "openai-missing", level: "info", title: "OpenAI missing", message: "No key" }]
      }
    } as DashboardData;

    const markdown = buildDailyBriefingMarkdown(data, now);

    expect(markdown).toContain("# RepoRadar daily briefing - 2026-06-16");
    expect(markdown).toContain("owner/tool");
    expect(markdown).toContain("Automate workflow");
    expect(markdown).toContain("Read README");
    expect(markdown).toContain("owner/old");
    expect(markdown).toContain("Briefing jest deterministyczny i nie uzywa OpenAI.");
  });
});
