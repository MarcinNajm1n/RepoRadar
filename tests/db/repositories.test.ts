import { describe, expect, it } from "vitest";
import { buildRadarToday, mapEvidenceSource, mapRepository } from "../../src/lib/db/repositories";
import type { ActionItemListItem } from "../../src/types/action-item";
import type { IdeaListItem, NotificationSummary, SettingsSummary } from "../../src/types/repository";

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

  it("maps evidence quality fields safely", () => {
    const mapped = mapEvidenceSource({
      id: "source_1",
      sourceType: "hn",
      title: "Workflow pain",
      url: "https://news.ycombinator.com/item?id=1",
      publisher: "Hacker News",
      retrievedAt: now,
      publishedAt: null,
      snippet: "Developers complain about manual workflow.",
      sentiment: "mixed",
      relevanceScore: 90,
      canonicalUrl: "https://news.ycombinator.com/item?id=1",
      sourceKey: "hn:1",
      evidenceKind: "pain_point",
      whatItProves: "Developers have workflow pain.",
      sourceConfidence: 82,
      sourceRank: 110
    });

    expect(mapped).toMatchObject({
      canonicalUrl: "https://news.ycombinator.com/item?id=1",
      sourceKey: "hn:1",
      evidenceKind: "pain_point",
      whatItProves: "Developers have workflow pain.",
      sourceConfidence: 82,
      sourceRank: 110
    });
  });
});

function settingsSummary(overrides: Partial<SettingsSummary> = {}): SettingsSummary {
  return {
    githubTokenConfigured: true,
    openAiConfigured: true,
    discordWebhookConfigured: false,
    autoGenerateWeeklyIdeas: false,
    notificationsEnabled: true,
    windowsNotificationsEnabled: true,
    marketResearchEnabled: true,
    marketResearchMode: "light",
    autoOpportunityResearchEnabled: false,
    openAiDailyAnalysisLimit: 20,
    marketResearchDailyLimit: 5,
    externalResearchCacheTtlHours: 24,
    reportsDir: "reports",
    persistedSettingCount: 0,
    aiJobSummary: { queued: 0, running: 0, done24h: 0, failed24h: 0 },
    aiCostSummary: {
      analysesToday: 0,
      analysesThisWeek: 0,
      analysesAllTime: 0,
      estimatedNextActions: {
        summary: "1 call",
        report: "1 call",
        idea: "1 call",
        research: "0 calls"
      }
    },
    githubRateLimit: null,
    ...overrides
  };
}

function notificationSummary(overrides: Partial<NotificationSummary> = {}): NotificationSummary {
  return {
    sent24h: 0,
    failed24h: 0,
    skipped24h: 0,
    lastResults: [],
    ...overrides
  };
}

function ideaRecord(overrides: Partial<IdeaListItem> = {}): IdeaListItem {
  return {
    id: "idea_1",
    sourceRepoId: "repo_1",
    sourceRepoName: "owner/tool",
    title: "Workflow automation",
    problem: "Manual work",
    proposedSolution: "Automate it",
    targetUser: "Developers",
    mvpScope: "Small dashboard",
    monetizationPotential: "B2B subscription",
    difficulty: 2,
    usefulnessScore: 4,
    riskScore: 2,
    confidenceScore: 4,
    opportunityScore: 80,
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

function actionItemRecord(overrides: Partial<ActionItemListItem> = {}): ActionItemListItem {
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
    priority: 0,
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

describe("buildRadarToday", () => {
  it("builds limited repository sections without ignored repositories", () => {
    const radar = buildRadarToday(
      {
        repositories: [
          mapRepository(repositoryRecord({ id: "repo_a", fullName: "owner/a", trendScore: 90, starsCurrent: 2000 })),
          mapRepository(repositoryRecord({ id: "repo_b", fullName: "owner/b", trendScore: 80, initialMomentumScore: 95 })),
          mapRepository(repositoryRecord({ id: "repo_c", fullName: "owner/c", trendScore: 99, status: "IGNORED" }))
        ],
        ideas: [],
        actionItems: [],
        lastScan: null,
        settingsSummary: settingsSummary(),
        notificationSummary: notificationSummary()
      },
      2,
      now
    );

    expect(radar.topRepositories.map((repo) => repo.fullName)).toEqual(["owner/a", "owner/b"]);
    expect(radar.highInitialMomentum.map((repo) => repo.fullName)).toContain("owner/b");
    expect(radar.topRepositories).toHaveLength(2);
  });

  it("sorts business candidates and filters snoozed action items", () => {
    const radar = buildRadarToday(
      {
        repositories: [],
        ideas: [
          ideaRecord({ id: "idea_low", title: "Low", opportunityScore: 50 }),
          ideaRecord({ id: "idea_high", title: "High", opportunityScore: 90 })
        ],
        actionItems: [
          actionItemRecord({ id: "open", priority: 1 }),
          actionItemRecord({ id: "future", status: "SNOOZED", snoozedUntil: "2026-06-17T12:00:00.000Z", priority: 99 }),
          actionItemRecord({ id: "done", status: "DONE", priority: 100 })
        ],
        lastScan: null,
        settingsSummary: settingsSummary(),
        notificationSummary: notificationSummary()
      },
      5,
      now
    );

    expect(radar.businessCandidates.map((idea) => idea.id)).toEqual(["idea_high", "idea_low"]);
    expect(radar.actionItems.map((item) => item.id)).toEqual(["open"]);
  });

  it("adds operational alerts from scan, config, and notification state", () => {
    const radar = buildRadarToday(
      {
        repositories: [],
        ideas: [],
        actionItems: [],
        lastScan: {
          startedAt: now.toISOString(),
          finishedAt: now.toISOString(),
          status: "FAILED",
          reposFound: 0,
          reposUpdated: 0,
          errorMessage: "rate limit"
        },
        settingsSummary: settingsSummary({
          githubTokenConfigured: false,
          openAiConfigured: false,
          autoOpportunityResearchEnabled: true
        }),
        notificationSummary: notificationSummary({ failed24h: 2 })
      },
      5,
      now
    );

    expect(radar.alerts.map((alert) => alert.id)).toEqual([
      "last-scan-failed",
      "github-token-missing",
      "openai-missing",
      "auto-research-enabled",
      "notification-failures"
    ]);
  });
});
