import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RepositoryListItem } from "../../src/types/repository";

vi.mock("../../src/components/repo-radar/repo-row", async () => {
  const React = await import("react");

  return {
    RepoRow: ({ repo }: { repo: RepositoryListItem }) => React.createElement("div", { "data-row": repo.fullName }, repo.fullName)
  };
});

vi.mock("../../src/components/repo-radar/repo-compare-panel", async () => {
  const React = await import("react");

  return {
    RepoComparePanel: ({ repositories }: { repositories: RepositoryListItem[] }) =>
      React.createElement("div", { "data-compare": repositories.map((repo) => repo.fullName).join("|") }, `compare:${repositories.map((repo) => repo.fullName).join("|")}`)
  };
});

vi.mock("../../src/components/repo-radar/repo-inbox-strip", async () => {
  const React = await import("react");

  return {
    RepoInboxStrip: ({ repositories }: { repositories: RepositoryListItem[] }) =>
      React.createElement("div", { "data-inbox": repositories.map((repo) => repo.fullName).join("|") }, `inbox:${repositories.map((repo) => repo.fullName).join("|")}`)
  };
});

import { RepoListView } from "../../src/components/repo-radar/repo-list-view";

function repository(overrides: Partial<RepositoryListItem>): RepositoryListItem {
  return {
    id: "repo",
    fullName: "owner/repo",
    owner: "owner",
    name: "repo",
    url: "https://github.com/owner/repo",
    description: null,
    readmeExcerpt: null,
    primaryLanguage: null,
    topics: [],
    license: null,
    createdAt: "2026-06-16T12:00:00.000Z",
    pushedAt: null,
    firstSeenAt: "2026-06-16T12:00:00.000Z",
    lastSeenAt: "2026-06-16T12:00:00.000Z",
    starsCurrent: 0,
    forksCurrent: 0,
    watchersCurrent: 0,
    openIssues: 0,
    ageMonths: 0,
    isOldRepo: false,
    isArchived: false,
    isFork: false,
    isDeletedFromView: false,
    status: "NEW",
    shortSummaryPl: null,
    lastAnalyzedAt: null,
    trendScore: 0,
    relevanceScore: 0,
    initialMomentumScore: 0,
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

function noop() {}

describe("RepoListView", () => {
  it("renders repositories in the server-provided page order", () => {
    const first = repository({ id: "low", fullName: "server/low", trendScore: 10, starsCurrent: 10 });
    const second = repository({ id: "high", fullName: "server/high", trendScore: 99, starsCurrent: 99 });

    const markup = renderToStaticMarkup(
      React.createElement(RepoListView, {
        repositories: [first, second],
        filterBar: React.createElement("div"),
        totalCount: 2,
        hasMore: true,
        onLoadMore: noop,
        expandedRepoId: null,
        timelines: {},
        loadingTimelineRepoId: null,
        selectedCompareRepoIds: ["high", "low"],
        showInbox: true,
        hasActiveFilters: false,
        isLoading: false,
        isPending: false,
        onRunScan: noop,
        onResetFilters: noop,
        onToggleCompare: noop,
        onRemoveCompare: noop,
        onClearCompare: noop,
        callbacks: {
          onToggle: noop,
          onOpenReport: noop,
          onRegenerateReport: noop,
          onSave: noop,
          onMarkRead: noop,
          onOpenQuickBrief: noop,
          onGenerateIdea: noop,
          onResearch: noop,
          onAddInboxTask: noop,
          onAddCloneTask: noop,
          onAddDemoTask: noop,
          onValidateMarket: noop,
          onIgnore: noop
        }
      })
    );

    expect(markup.indexOf("server/low")).toBeLessThan(markup.indexOf("server/high"));
    expect(markup).toContain("inbox:server/low|server/high");
    expect(markup).toContain("compare:server/high|server/low");
    expect(markup).toContain("Pokazano <span class=\"font-semibold text-foreground\">2</span> z");
  });
});
