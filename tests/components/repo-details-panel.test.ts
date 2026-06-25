import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RepoDetailsPanel } from "../../src/components/repo-radar/repo-details-panel";
import type { RepositoryDecisionContext, RepositoryListItem } from "../../src/types/repository";

const noop = () => undefined;

function repo(overrides: Partial<RepositoryListItem> = {}): RepositoryListItem {
  return {
    id: "repo_details",
    fullName: "very-long-owner-name-for-decision-center/extremely-long-repository-name-that-should-remain-readable",
    owner: "very-long-owner-name-for-decision-center",
    name: "extremely-long-repository-name-that-should-remain-readable",
    url: "https://github.com/example/repo",
    description: null,
    readmeExcerpt: null,
    primaryLanguage: null,
    topics: [],
    license: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    pushedAt: null,
    firstSeenAt: "2026-06-16T00:00:00.000Z",
    lastSeenAt: "2026-06-16T00:00:00.000Z",
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

function emptyDecisionContext(): RepositoryDecisionContext {
  return {
    repoId: "repo_details",
    generatedAt: "2026-06-25T10:00:00.000Z",
    nextAction: {
      id: "decision:quick-brief",
      kind: "quick_brief",
      title: "Zrob quick brief",
      description: "Repo nie ma jeszcze lokalnego szybkiego briefu.",
      reason: "Najpierw potrzebny jest tani punkt odniesienia przed pelnym raportem.",
      actionLabel: "Quick brief",
      tone: "warning",
      taskId: null
    },
    signals: [
      { id: "trend", label: "Trend", value: "0/100", tone: "neutral" },
      { id: "growth-7d", label: "Growth 7d", value: "brak historii", tone: "warning" },
      { id: "reports", label: "Raporty", value: "0 pelne / 0 brief", tone: "warning" },
      { id: "tasks", label: "Zadania", value: "0 otwartych", tone: "success" },
      { id: "evidence", label: "Evidence", value: "0 zrodel", tone: "warning" },
      { id: "status", label: "Status", value: "NEW", tone: "warning" }
    ],
    reports: {
      totalCount: 0,
      quickBriefCount: 0,
      fullReportCount: 0,
      decisionLogCount: 0,
      scoringSnapshotCount: 0,
      recent: []
    },
    tasks: {
      openCount: 0,
      recentOpen: []
    },
    evidence: {
      sourceCount: 0,
      researchRunCount: 0,
      lastResearchAt: null,
      sourceTypes: [],
      summary: "Brak lokalnych zrodel evidence i research runow dla tego repo.",
      topSources: []
    },
    snapshots: {
      totalCount: 0,
      latestCapturedAt: null,
      growth24h: null,
      growth7d: null,
      growthPercent7d: null
    },
    status: {
      current: "NEW",
      needsDecision: true,
      lastAnalyzedAt: null
    }
  };
}

describe("RepoDetailsPanel decision center", () => {
  it("renders long repository metadata, empty states and the decision center", () => {
    const html = renderToStaticMarkup(
      createElement(RepoDetailsPanel, {
        repo: repo(),
        timeline: [],
        isTimelineLoading: false,
        decisionContext: emptyDecisionContext(),
        isDecisionContextLoading: false,
        isPending: false,
        onOpenReport: noop,
        onRegenerateReport: noop,
        onSave: noop,
        onMarkRead: noop,
        onOpenQuickBrief: noop,
        onGenerateIdea: noop,
        onResearch: noop,
        onAddCloneTask: noop,
        onAddDemoTask: noop,
        onValidateMarket: noop,
        onIgnore: noop
      })
    );

    expect(html).toContain('id="repo-details-repo_details"');
    expect(html).toContain("very-long-owner-name-for-decision-center");
    expect(html).toContain("Centrum decyzji");
    expect(html).toContain("Nastepna akcja");
    expect(html).toContain("Zrob quick brief");
    expect(html).toContain("Brak raportow dla tego repo.");
    expect(html).toContain("Brak otwartych zadan blokujacych decyzje.");
    expect(html).toContain("Brak lokalnych zrodel evidence");
    expect(html).toContain("Za malo snapshotow do wykresu.");
    expect(html).toContain("Brak dodatkowych zdarzen poza metadanymi repo.");
  });

  it("renders a clear decision center error state", () => {
    const html = renderToStaticMarkup(
      createElement(RepoDetailsPanel, {
        repo: repo(),
        timeline: [],
        isTimelineLoading: false,
        decisionContext: null,
        isDecisionContextLoading: false,
        decisionContextError: "DB timeout while loading context",
        isPending: false,
        onOpenReport: noop,
        onRegenerateReport: noop,
        onSave: noop,
        onMarkRead: noop,
        onOpenQuickBrief: noop,
        onGenerateIdea: noop,
        onResearch: noop,
        onAddCloneTask: noop,
        onAddDemoTask: noop,
        onValidateMarket: noop,
        onIgnore: noop
      })
    );

    expect(html).toContain("Centrum decyzji");
    expect(html).toContain("Nie udalo sie zaladowac centrum decyzji");
    expect(html).toContain("DB timeout while loading context");
  });
});
