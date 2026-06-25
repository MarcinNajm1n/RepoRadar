import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsView } from "../../src/components/repo-radar/settings-view";
import type { NotificationSummary, SettingsSummary } from "../../src/types/repository";

const noop = () => undefined;

const notificationSummary: NotificationSummary = {
  sent24h: 0,
  failed24h: 0,
  skipped24h: 0,
  lastResults: []
};

function settingsSummary(overrides: Partial<SettingsSummary> = {}): SettingsSummary {
  return {
    githubTokenConfigured: true,
    openAiConfigured: true,
    discordWebhookConfigured: false,
    autoGenerateWeeklyIdeas: false,
    notificationsEnabled: true,
    windowsNotificationsEnabled: false,
    marketResearchEnabled: true,
    marketResearchMode: "light",
    autoOpportunityResearchEnabled: false,
    openAiDailyAnalysisLimit: 10,
    marketResearchDailyLimit: 5,
    externalResearchCacheTtlHours: 24,
    reportsDir: "reports",
    persistedSettingCount: 3,
    aiJobSummary: {
      queued: 0,
      running: 0,
      done24h: 0,
      failed24h: 0
    },
    aiJobQueue: {
      generatedAt: "2026-06-25T12:00:00.000Z",
      totalJobs: 2,
      activeCount: 1,
      needsAttentionCount: 1,
      retryableFailedCount: 1,
      byStatus: [
        { key: "RUNNING", label: "W toku", count: 1 },
        { key: "FAILED", label: "Blad", count: 1 }
      ],
      byType: [
        { key: "REPORT", label: "Raport", count: 1 },
        { key: "RESEARCH", label: "Badanie", count: 1 }
      ],
      oldestActiveJob: {
        id: "job_running",
        type: "REPORT",
        status: "RUNNING",
        priority: 70,
        repoId: "repo_1",
        ideaId: null,
        reportId: null,
        dedupeKey: "report:repo_1:default",
        repoFullName: "owner/tool",
        createdAt: "2026-06-25T11:00:00.000Z",
        startedAt: "2026-06-25T11:01:00.000Z",
        finishedAt: null,
        error: null
      },
      recentFailures: [
        {
          id: "job_failed",
          type: "RESEARCH",
          status: "FAILED",
          priority: 40,
          repoId: "repo_2",
          ideaId: null,
          reportId: null,
          dedupeKey: "research:repo_2:default",
          repoFullName: "owner/research",
          createdAt: "2026-06-25T10:00:00.000Z",
          startedAt: "2026-06-25T10:01:00.000Z",
          finishedAt: "2026-06-25T10:02:00.000Z",
          error: "Provider failed"
        }
      ]
    },
    recentAiJobs: [
      {
        id: "job_failed",
        type: "RESEARCH",
        status: "FAILED",
        priority: 40,
        repoId: "repo_2",
        ideaId: null,
        reportId: null,
        dedupeKey: "research:repo_2:default",
        repoFullName: "owner/research",
        createdAt: "2026-06-25T10:00:00.000Z",
        startedAt: "2026-06-25T10:01:00.000Z",
        finishedAt: "2026-06-25T10:02:00.000Z",
        error: "Provider failed"
      }
    ],
    aiCostSummary: {
      analysesToday: 0,
      analysesThisWeek: 0,
      analysesAllTime: 0,
      estimatedNextActions: {
        summary: "ok. 1 call",
        report: "ok. 3 calls",
        idea: "ok. 2 calls",
        research: "ok. 2 calls"
      }
    },
    openAiCache: {
      totalEntries: 0,
      byKind: [],
      recentEntries: []
    },
    observability: {
      lastScan: null,
      recentScanCount: 0,
      failedScans24h: 0,
      averageScanDurationMs: null,
      totalRepositories: 0,
      openAiCacheEntries: 0,
      externalResearchCacheEntries: 0,
      expiredExternalResearchCacheEntries: 0,
      marketResearchRuns24h: 0,
      marketResearchSources24h: 0,
      githubRuntime: {
        requests: 0,
        cacheHits: 0,
        notModifiedHits: 0,
        cacheWrites: 0,
        cacheEntries: 0,
        maxEntries: 500
      }
    },
    graphify: {
      status: "missing",
      graphExists: false,
      nodeCount: 0,
      edgeCount: 0,
      communityCount: 0,
      manifestFileCount: 0,
      graphSizeBytes: 0,
      reportSizeBytes: 0,
      lastUpdatedAt: null,
      packageVersion: null,
      skillVersion: null,
      skillPath: null,
      note: "Brak grafu."
    },
    maintenancePreview: {
      generatedAt: "2026-06-25T12:00:00.000Z",
      externalResearchCache: {
        expiredEntries: 3
      },
      notificationLogs: {
        daysToKeep: 30,
        cutoff: "2026-05-26T12:00:00.000Z",
        oldEntries: 4
      },
      snapshots: {
        daysToKeep: 180,
        cutoff: "2025-12-27T12:00:00.000Z",
        oldEntries: 12,
        affectedRepositories: 5,
        repositoriesLosingAllSnapshots: 2
      }
    },
    githubRateLimit: null,
    ...overrides
  };
}

describe("SettingsView maintenance preview", () => {
  it("renders dry-run cleanup counts before maintenance actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settingsSummary: settingsSummary(),
        notificationSummary,
        isLoading: false,
        isPending: false,
        onSaveSetting: noop,
        onClearExpiredExternalCache: noop,
        onClearOldNotificationLogs: noop,
        onTestNotification: noop,
        onRetryAiJob: noop,
        onOpenDailyBriefing: noop,
        onDownloadIdeasCsv: noop,
        onPruneSnapshots: noop,
        onRetryLoad: noop
      })
    );

    expect(html).toContain("Preview jest dry-run");
    expect(html).toContain("Wygasly research cache");
    expect(html).toContain("Repo bez historii");
    expect(html).toContain("Wyczysc cache (3)");
    expect(html).toContain("Wyczysc logi 30d+ (4)");
    expect(html).toContain("Przytnij snapshoty 180d+ (12)");
    expect(html).toContain("2 repo straci wszystkie snapshoty po prune");
  });

  it("renders AI jobs center with queue diagnostics and retry cost", () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsView, {
        settingsSummary: settingsSummary(),
        notificationSummary,
        isLoading: false,
        isPending: false,
        onSaveSetting: noop,
        onClearExpiredExternalCache: noop,
        onClearOldNotificationLogs: noop,
        onTestNotification: noop,
        onRetryAiJob: noop,
        onOpenDailyBriefing: noop,
        onDownloadIdeasCsv: noop,
        onPruneSnapshots: noop,
        onRetryLoad: noop
      })
    );

    expect(html).toContain("Centrum zadan AI");
    expect(html).toContain("Aktywne");
    expect(html).toContain("Retry dostepne");
    expect(html).toContain("Ostatnie bledy 24h");
    expect(html).toContain("Ponow Badanie / owner/research");
    expect(html).toContain("(ok. 2 calls)");
    expect(html).toContain("Provider failed");
  });
});
