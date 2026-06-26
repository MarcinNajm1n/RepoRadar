import { describe, expect, it } from "vitest";
import { buildRadarToday, mapEvidenceSource, mapIdea, mapReport, mapRepository, rankRadarNextActionCandidates } from "../../src/lib/db/repositories";
import type { ActionItemListItem } from "../../src/types/action-item";
import type { DashboardNotificationStatus, DashboardSettingsStatus, IdeaListItem } from "../../src/types/repository";

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
    snapshots: [{ growth24h: null, growth7d: null, growthPercent7d: null }],
    ...overrides
  };
}

function rawIdeaRecord(overrides: Record<string, unknown> = {}): Parameters<typeof mapIdea>[0] {
  return {
    id: "idea_1",
    sourceRepoId: "repo_1",
    title: "Workflow automation",
    problem: "Manual work",
    proposedSolution: "Automate it",
    targetUser: "Developers",
    mvpScope: "Small dashboard",
    monetizationPotential: "B2B subscription",
    difficulty: 2,
    usefulnessScore: 4,
    riskScore: 2,
    suggestedStack: "Next.js",
    firstStepsJson: JSON.stringify(["Validate market", "Build demo"]),
    marketSummary: null,
    evidenceIdsJson: JSON.stringify(["source_1"]),
    confidenceScore: 4,
    opportunityScore: 80,
    opportunityBreakdownJson: "{}",
    applicationSummary: null,
    businessRationale: null,
    researchMode: "light",
    status: "CANDIDATE",
    lastResearchAt: null,
    createdAt: now,
    repository: { fullName: "owner/tool" },
    marketResearchSources: [],
    ...overrides
  } as Parameters<typeof mapIdea>[0];
}

function rawReportRecord(overrides: Record<string, unknown> = {}): Parameters<typeof mapReport>[0] {
  return {
    id: "report_1",
    type: "weekly",
    repoId: null,
    title: "Weekly report",
    markdownPath: "reports/weekly.md",
    contentMarkdown: "# Weekly",
    summary: null,
    repoCount: 2,
    topRepoIdsJson: JSON.stringify(["repo_1", "repo_2"]),
    inputHash: null,
    createdAt: now,
    ...overrides
  } as Parameters<typeof mapReport>[0];
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

  it("sanitizes stored topic and discovery profile arrays before display", () => {
    const mapped = mapRepository(
      repositoryRecord({
        topicsJson: JSON.stringify([" ai-agents ", 42, { label: "bad" }, "mcp\u0000tools"]),
        discoveryProfilesJson: JSON.stringify(["fresh_repos", null, ["bad"], "fast_momentum\u0001profile"])
      })
    );

    expect(mapped.topics).toEqual(["ai-agents", "mcptools"]);
    expect(mapped.discoveryProfiles).toEqual(["fresh_repos", "fast_momentum profile"]);
  });

  it("normalizes malformed score breakdown values before display", () => {
    const mapped = mapRepository(
      repositoryRecord({
        scoreBreakdownJson: JSON.stringify({
          absoluteGrowthPoints: "10",
          percentageGrowthPoints: -5,
          agePoints: 125,
          totalStarsPoints: 4,
          usedInitialMomentumFallback: "true"
        })
      })
    );

    expect(mapped.scoreBreakdown.absoluteGrowthPoints).toBe(0);
    expect(mapped.scoreBreakdown.percentageGrowthPoints).toBe(0);
    expect(mapped.scoreBreakdown.agePoints).toBe(100);
    expect(mapped.scoreBreakdown.totalStarsPoints).toBe(4);
    expect(mapped.scoreBreakdown.usedInitialMomentumFallback).toBe(false);
  });

  it("prefers denormalized growth fields and falls back to the latest snapshot", () => {
    const denormalized = mapRepository(
      repositoryRecord({
        growth24h: 3,
        growth7d: 30,
        growthPercent7d: 12.5,
        snapshots: [{ growth24h: 1, growth7d: 10, growthPercent7d: 4.5 }]
      })
    );
    const fallback = mapRepository(
      repositoryRecord({
        growth24h: null,
        growth7d: null,
        growthPercent7d: null,
        snapshots: [{ growth24h: 2, growth7d: 20, growthPercent7d: 8.5 }]
      })
    );

    expect(denormalized.growth24h).toBe(3);
    expect(denormalized.growth7d).toBe(30);
    expect(denormalized.growthPercent7d).toBe(12.5);
    expect(fallback.growth24h).toBe(2);
    expect(fallback.growth7d).toBe(20);
    expect(fallback.growthPercent7d).toBe(8.5);
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

describe("stored string array mapping", () => {
  it("sanitizes idea first steps and evidence ids before display", () => {
    const mapped = mapIdea(
      rawIdeaRecord({
        firstStepsJson: JSON.stringify([" Validate market ", 42, { label: "bad" }, "ship\u0000demo"]),
        evidenceIdsJson: JSON.stringify([" source_1 ", null, ["bad"], "source\u0001two"])
      })
    );

    expect(mapped.firstSteps).toEqual(["Validate market", "shipdemo"]);
    expect(mapped.evidenceIds).toEqual(["source_1", "source two"]);
  });

  it("sanitizes report top repository ids before comparisons", () => {
    const mapped = mapReport(
      rawReportRecord({
        topRepoIdsJson: JSON.stringify([" repo_1 ", 33, { id: "repo_bad" }, "repo\u0002two"])
      })
    );

    expect(mapped.topRepoIds).toEqual(["repo_1", "repo two"]);
  });

  it("sanitizes idea opportunity breakdown numeric values", () => {
    const mapped = mapIdea(
      rawIdeaRecord({
        opportunityBreakdownJson: JSON.stringify({
          demand: 82,
          "risk\u0001score": 33,
          ignoredString: "90",
          below: -5,
          above: 125
        })
      })
    );

    expect(mapped.opportunityBreakdown).toEqual({
      demand: 82,
      "risk score": 33,
      below: 0,
      above: 100
    });
  });
});

function settingsStatus(overrides: Partial<DashboardSettingsStatus> = {}): DashboardSettingsStatus {
  return {
    githubTokenConfigured: true,
    openAiConfigured: true,
    discordWebhookStatus: "missing",
    autoOpportunityResearchEnabled: false,
    ...overrides
  };
}

function notificationStatus(overrides: Partial<DashboardNotificationStatus> = {}): DashboardNotificationStatus {
  return {
    failed24h: 0,
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
  it("ranks next action candidates by deterministic Radar priority", () => {
    const repo = mapRepository(
      repositoryRecord({
        id: "repo_signal",
        fullName: "owner/signal",
        trendScore: 91,
        initialMomentumScore: 65,
        growth7d: 42,
        snapshots: []
      })
    );
    const candidates = rankRadarNextActionCandidates({
      alerts: [
        {
          id: "github-token-missing",
          level: "warning",
          title: "Brak GitHub token",
          message: "Skan moze szybciej trafic w rate limit bez lokalnego GITHUB_TOKEN."
        }
      ],
      actionItems: [actionItemRecord({ id: "urgent", priority: 9, dueAt: "2026-06-16T13:00:00.000Z" })],
      businessCandidates: [ideaRecord({ id: "idea_signal", opportunityScore: 94, confidenceScore: 5, usefulnessScore: 5 })],
      topRepositories: [repo],
      latestRepositories: [],
      lastScan: null
    });

    expect(candidates.map((candidate) => candidate.kind)).toEqual(["alert", "task", "idea", "repo"]);
    expect(candidates[0]).toMatchObject({
      kind: "alert",
      id: "alert:github-token-missing",
      actionLabel: "Otworz ustawienia"
    });
    expect(candidates[0].signals).toContain("Alert ma poziom: ostrzezenie.");
    expect(candidates[0].signals).toContain("Alerty operacyjne maja pierwszenstwo przed zadaniami, pomyslami i repo.");
    expect(candidates[0].signals).toContain("Zmienna .env do ustawienia: GITHUB_TOKEN.");
    expect(candidates[1].signals).toContain("Ma najblizszy termin w aktywnej kolejce.");
    expect(candidates[2].signals).toContain("Ocena okazji: 94.");
    expect(candidates[3].signals).toContain("Wzrost 7d: +42 gwiazdek.");
  });

  it("points invalid Discord webhook alerts directly to settings", () => {
    const [candidate] = rankRadarNextActionCandidates({
      alerts: [
        {
          id: "discord-webhook-invalid",
          level: "warning",
          title: "Discord webhook ma bledny URL",
          message: "Popraw DISCORD_WEBHOOK_URL w .env."
        }
      ],
      actionItems: [],
      businessCandidates: [],
      topRepositories: [],
      latestRepositories: [],
      lastScan: null
    });

    expect(candidate).toMatchObject({
      kind: "alert",
      id: "alert:discord-webhook-invalid",
      actionLabel: "Otworz ustawienia"
    });
    expect(candidate.signals).toContain("Zmienna .env do poprawy: DISCORD_WEBHOOK_URL.");
  });

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
        settingsStatus: settingsStatus(),
        notificationStatus: notificationStatus()
      },
      2,
      now
    );

    expect(radar.topRepositories.map((repo) => repo.fullName)).toEqual(["owner/a", "owner/b"]);
    expect(radar.highInitialMomentum.map((repo) => repo.fullName)).toContain("owner/b");
    expect(radar.topRepositories).toHaveLength(2);
    expect(radar.nextAction).toMatchObject({ kind: "repo", repoId: "repo_a" });
    expect(radar.nextAction.signals).toContain("Ocena trendu: 90.");
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
        settingsStatus: settingsStatus(),
        notificationStatus: notificationStatus()
      },
      5,
      now
    );

    expect(radar.businessCandidates.map((idea) => idea.id)).toEqual(["idea_high", "idea_low"]);
    expect(radar.actionItems.map((item) => item.id)).toEqual(["open"]);
    expect(radar.nextAction).toMatchObject({ kind: "task", taskId: "open" });
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
        settingsStatus: settingsStatus({
          githubTokenConfigured: false,
          openAiConfigured: false,
          discordWebhookStatus: "invalid",
          autoOpportunityResearchEnabled: true
        }),
        notificationStatus: notificationStatus({ failed24h: 2 })
      },
      6,
      now
    );

    expect(radar.alerts.map((alert) => alert.id)).toEqual([
      "last-scan-failed",
      "github-token-missing",
      "openai-missing",
      "discord-webhook-invalid",
      "auto-research-enabled",
      "notification-failures"
    ]);
    expect(radar.alerts.find((alert) => alert.id === "github-token-missing")).toMatchObject({
      level: "warning",
      title: "Brak GitHub token",
      message: expect.stringContaining("Dodaj GITHUB_TOKEN w .env i zrestartuj npm run dev")
    });
    expect(radar.alerts.find((alert) => alert.id === "discord-webhook-invalid")).toMatchObject({
      level: "warning",
      title: "Discord webhook ma bledny URL",
      message: expect.stringContaining("Po zmianie zrestartuj npm run dev")
    });
    expect(radar.alerts.find((alert) => alert.id === "openai-missing")).toMatchObject({
      level: "info",
      title: "OpenAI jest opcjonalne",
      message: expect.stringContaining("Scan, scoring i kolejka dzialaja bez klucza")
    });
    expect(radar.alerts.find((alert) => alert.id === "openai-missing")?.message).toContain("po zmianie zrestartuj npm run dev");
    expect(radar.nextAction).toMatchObject({ kind: "alert", id: "alert:last-scan-failed" });
  });

  it("builds first-run onboarding for an empty or unconfigured radar", () => {
    const radar = buildRadarToday(
      {
        repositories: [],
        ideas: [],
        actionItems: [],
        lastScan: null,
        settingsStatus: settingsStatus({ githubTokenConfigured: false, openAiConfigured: false }),
        notificationStatus: notificationStatus()
      },
      5,
      now
    );

    expect(radar.firstRun.visible).toBe(true);
    expect(radar.firstRun.completedCount).toBe(0);
    expect(radar.firstRun.totalCount).toBe(3);
    expect(radar.firstRun.steps.map((step) => step.id)).toEqual([
      "local_data",
      "github_token",
      "first_scan",
      "decision_queue",
      "openai",
      "portfolio_screenshots"
    ]);
    expect(radar.firstRun.steps.find((step) => step.id === "local_data")).toMatchObject({
      status: "todo",
      priority: "required",
      command: "npm run db:seed"
    });
    expect(radar.firstRun.steps.find((step) => step.id === "github_token")?.description).toContain(
      "Po zmianie zrestartuj npm run dev"
    );
    expect(radar.firstRun.steps.find((step) => step.id === "openai")).toMatchObject({
      status: "optional",
      priority: "optional",
      action: "open_settings",
      description: expect.stringContaining("Dodaj OPENAI_API_KEY w .env tylko dla funkcji AI na zadanie")
    });
    expect(radar.firstRun.steps.find((step) => step.id === "openai")?.description).toContain("zrestartuj npm run dev");
  });

  it("hides first-run onboarding once local data, scan, and GitHub config are ready", () => {
    const radar = buildRadarToday(
      {
        repositories: [mapRepository(repositoryRecord({ id: "repo_ready", fullName: "owner/ready" }))],
        ideas: [],
        actionItems: [actionItemRecord()],
        lastScan: {
          startedAt: now.toISOString(),
          finishedAt: now.toISOString(),
          status: "SUCCESS",
          reposFound: 1,
          reposUpdated: 1,
          errorMessage: null
        },
        settingsStatus: settingsStatus({ githubTokenConfigured: true, openAiConfigured: false }),
        notificationStatus: notificationStatus()
      },
      5,
      now
    );

    expect(radar.firstRun.visible).toBe(false);
    expect(radar.firstRun.steps.find((step) => step.id === "local_data")).toMatchObject({ status: "done" });
    expect(radar.firstRun.steps.find((step) => step.id === "first_scan")).toMatchObject({ status: "done" });
    expect(radar.firstRun.steps.find((step) => step.id === "openai")).toMatchObject({ status: "optional" });
  });

  it("keeps first-run onboarding visible after a failed scan until a successful scan exists", () => {
    const radar = buildRadarToday(
      {
        repositories: [mapRepository(repositoryRecord({ id: "repo_existing", fullName: "owner/existing" }))],
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
        settingsStatus: settingsStatus({ githubTokenConfigured: true }),
        notificationStatus: notificationStatus()
      },
      5,
      now
    );

    expect(radar.firstRun.visible).toBe(true);
    expect(radar.firstRun.steps.find((step) => step.id === "first_scan")).toMatchObject({
      status: "todo",
      priority: "required"
    });
  });
});
