import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RepoRow } from "../../src/components/repo-radar/repo-row";
import type { RepositoryListItem } from "../../src/types/repository";

function repo(overrides: Partial<RepositoryListItem> = {}): RepositoryListItem {
  return {
    id: "repo_long",
    fullName: "very-long-owner-name-for-layout-testing/extremely-long-repository-name-that-should-not-break-the-desktop-row",
    owner: "very-long-owner-name-for-layout-testing",
    name: "extremely-long-repository-name-that-should-not-break-the-desktop-row",
    url: "https://github.com/example/repo",
    description:
      "This is a very long repository description used to verify that RepoRadar keeps long GitHub metadata within a dense desktop row without horizontal overflow or broken action placement.",
    readmeExcerpt: "Long README excerpt. ".repeat(40),
    primaryLanguage: "TypeScript",
    topics: [
      "ai-agent-workflow-automation-with-long-topic",
      "model-context-protocol",
      "developer-tooling",
      "local-first-automation",
      "very-long-topic-name-that-must-truncate"
    ],
    license: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    pushedAt: "2026-06-01T00:00:00.000Z",
    firstSeenAt: "2026-06-16T00:00:00.000Z",
    lastSeenAt: "2026-06-16T00:00:00.000Z",
    starsCurrent: 123456,
    forksCurrent: 1234,
    watchersCurrent: 123456,
    openIssues: 42,
    ageMonths: 5,
    isOldRepo: false,
    isArchived: false,
    isFork: false,
    isDeletedFromView: false,
    status: "NEW",
    shortSummaryPl:
      "Bardzo dlugie polskie podsumowanie repozytorium, ktore powinno zostac ograniczone wizualnie w wierszu oraz panelu szczegolow, bez wypychania metryk i akcji poza ekran.",
    lastAnalyzedAt: null,
    trendScore: 98,
    relevanceScore: 92,
    initialMomentumScore: 88,
    scoreBreakdown: {
      absoluteGrowthPoints: 10,
      percentageGrowthPoints: 10,
      agePoints: 8,
      totalStarsPoints: 8,
      forksPoints: 6,
      pushFreshnessPoints: 9,
      topicRelevancePoints: 10,
      readmeQualityPoints: 8,
      keywordRelevancePoints: 9,
      initialMomentumPoints: 8,
      usedInitialMomentumFallback: false
    },
    discoveryProfiles: ["AI_AGENTS", "MCP", "DEVTOOLS_AUTOMATION"],
    source: "github",
    growth24h: 120,
    growth7d: 2500,
    growthPercent7d: 12.5,
    ...overrides
  };
}

const noop = () => undefined;

function renderRepoRow(isExpanded: boolean) {
  return renderToStaticMarkup(
    createElement(RepoRow, {
      repo: repo(),
      isExpanded,
      timeline: [],
      isTimelineLoading: false,
      isCompareSelected: false,
      isPending: false,
      onToggle: noop,
      onToggleCompare: noop,
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
}

describe("RepoRow long content rendering", () => {
  it("keeps extreme GitHub names and descriptions constrained by row classes", () => {
    const html = renderRepoRow(false);

    expect(html).toContain("very-long-owner-name-for-layout-testing");
    expect(html).toContain("truncate text-sm font-semibold");
    expect(html).toContain("line-clamp-2");
    expect(html).toContain("max-w-[140px] truncate");
  });

  it("renders expanded details for long content without dropping action controls", () => {
    const html = renderRepoRow(true);

    expect(html).toContain('id="repo-details-repo_long"');
    expect(html).toContain("Dlaczego radar to pokazuje?");
    expect(html).toContain("Priorytet AI");
    expect(html).toContain("w kolejce automatycznej");
    expect(html).toContain("Brief");
    expect(html).toContain("Ignoruj");
  });
});
