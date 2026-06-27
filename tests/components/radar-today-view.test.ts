import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RadarTodayView } from "../../src/components/repo-radar/radar-today-view";
import type { RadarTodayData, RepositoryListItem } from "../../src/types/repository";

const noop = () => undefined;

function radarToday(overrides: Partial<RadarTodayData> = {}): RadarTodayData {
  return {
    generatedAt: "2026-06-16T12:00:00.000Z",
    firstRun: {
      visible: false,
      completedCount: 3,
      totalCount: 3,
      steps: []
    },
    nextAction: {
      id: "repo:repo_signal",
      kind: "repo",
      title: "owner/signal",
      description: "Repo wymaga szybkiego briefu.",
      reason: "Najmocniejszy aktualny sygnal repozytorium.",
      signals: ["Ocena trendu: 91.", "Wzrost 7d: +42 gwiazdek."],
      actionLabel: "Otworz brief",
      repoId: "repo_signal",
      ideaId: null,
      taskId: null
    },
    topRepositories: [],
    newGems: [],
    highInitialMomentum: [],
    businessCandidates: [],
    ideasToDevelop: [],
    actionItems: [],
    scanChanges: {
      lastScan: null,
      latestRepositories: []
    },
    alerts: [],
    ...overrides
  };
}

function repository(overrides: Partial<RepositoryListItem> = {}): RepositoryListItem {
  return {
    id: "repo_signal",
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
    pushedAt: "2026-06-20T12:00:00.000Z",
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

describe("RadarTodayView", () => {
  it("renders deterministic next-action reasoning signals in the existing card", () => {
    const html = renderToStaticMarkup(
      React.createElement(RadarTodayView, {
        radarToday: radarToday(),
        isPending: false,
        onOpenLibrary: noop,
        onOpenReport: noop,
        onOpenQuickBrief: noop,
        onCreateReadmeTask: noop,
        onCreateManualTask: noop,
        onOpenCandidate: noop,
        onPromoteCandidate: noop,
        onOpenTasks: noop,
        onOpenSettings: noop,
        onRunScan: noop,
        renderActionItem: () => React.createElement("div")
      })
    );

    expect(html).toContain("Najlepsza nastepna akcja");
    expect(html).toContain("Dlaczego teraz");
    expect(html).toContain("Ocena trendu: 91.");
    expect(html).toContain("Wzrost 7d: +42 gwiazdek.");
    expect(html.indexOf("Dlaczego teraz")).toBeLessThan(html.indexOf("Ocena trendu: 91."));
  });

  it("renders first-run onboarding when the radar is not configured yet", () => {
    const html = renderToStaticMarkup(
      React.createElement(RadarTodayView, {
        radarToday: radarToday({
          firstRun: {
            visible: true,
            completedCount: 0,
            totalCount: 2,
            steps: [
              {
                id: "local_data",
                title: "Dane lokalne albo demo",
                description: "Pusta baza jest poprawna, ale do demo najpierw uruchom seed albo scan.",
                status: "todo",
                priority: "required",
                action: "open_library",
                command: "npm run db:seed"
              },
              {
                id: "github_token",
                title: "GitHub token",
                description: "Dodaj GITHUB_TOKEN w .env, zeby uniknac szybkiego rate limitu.",
                status: "todo",
                priority: "required",
                action: "open_settings",
                command: null
              },
              {
                id: "portfolio_screenshots",
                title: "Portfolio screenshots",
                description: "Po seedzie i starcie aplikacji zapisz lokalne ujecia do ignorowanego test-results.",
                status: "optional",
                priority: "optional",
                action: "none",
                command: "npm run screenshots:portfolio"
              }
            ]
          }
        }),
        isPending: false,
        onOpenLibrary: noop,
        onOpenReport: noop,
        onOpenQuickBrief: noop,
        onCreateReadmeTask: noop,
        onCreateManualTask: noop,
        onOpenCandidate: noop,
        onPromoteCandidate: noop,
        onOpenTasks: noop,
        onOpenSettings: noop,
        onRunScan: noop,
        renderActionItem: () => React.createElement("div")
      })
    );

    expect(html).toContain("Szybki start");
    expect(html).toContain("Przygotuj lokalny radar do pierwszej decyzji");
    expect(html).toContain("Nastepny krok");
    expect(html).toContain("Dane lokalne albo demo");
    expect(html.indexOf("Nastepny krok")).toBeLessThan(html.indexOf("Opcjonalnie pozniej"));
    expect(html).toContain("npm run db:seed");
    expect(html).toContain("GitHub token");
    expect(html).toContain("Otworz Ustawienia dla kroku: GitHub token");
    expect(html).toContain("Opcjonalnie pozniej");
    expect(html).toContain("npm run screenshots:portfolio");
  });

  it("renders scan failure diagnostics with timing and partial counts", () => {
    const html = renderToStaticMarkup(
      React.createElement(RadarTodayView, {
        radarToday: radarToday({
          scanChanges: {
            lastScan: {
              startedAt: "2026-06-16T09:00:00.000Z",
              finishedAt: "2026-06-16T09:03:30.000Z",
              status: "FAILED",
              reposFound: 30,
              reposUpdated: 12,
              errorMessage: "GitHub API rate limit exhausted until 2026-06-16T10:00:00.000Z."
            },
            latestRepositories: []
          }
        }),
        isPending: false,
        onOpenLibrary: noop,
        onOpenReport: noop,
        onOpenQuickBrief: noop,
        onCreateReadmeTask: noop,
        onCreateManualTask: noop,
        onOpenCandidate: noop,
        onPromoteCandidate: noop,
        onOpenTasks: noop,
        onOpenSettings: noop,
        onRunScan: noop,
        renderActionItem: () => React.createElement("div")
      })
    );

    expect(html).toContain("Ostatni scan nie powiodl sie");
    expect(html).toContain("GitHub API rate limit exhausted");
    expect(html).toContain("Start");
    expect(html).toContain("Koniec");
    expect(html).toContain("Repo");
    expect(html).toContain("12/30 zaktualizowane");
  });

  it("keeps long radar repository cards in wrapping signal lanes", () => {
    const html = renderToStaticMarkup(
      React.createElement(RadarTodayView, {
        radarToday: radarToday({
          topRepositories: [
            repository({
              fullName: "DietrichGebert/ponytail-extremely-long-agentic-javascript-tooling-repository-name",
              description:
                "Ponytail to narzedzie AI symulujace podejscie do repozytoriow, z bardzo dlugim opisem sprawdzajacym zawijanie tekstu w karcie radaru.",
              primaryLanguage: "JAVASCRIPT",
              status: "HOT",
              trendScore: 93,
              initialMomentumScore: 82,
              starsCurrent: 60500,
              growth7d: 327,
              pushedAt: "2026-06-26T12:00:00.000Z"
            })
          ]
        }),
        isPending: false,
        onOpenLibrary: noop,
        onOpenReport: noop,
        onOpenQuickBrief: noop,
        onCreateReadmeTask: noop,
        onCreateManualTask: noop,
        onOpenCandidate: noop,
        onPromoteCandidate: noop,
        onOpenTasks: noop,
        onOpenSettings: noop,
        onRunScan: noop,
        renderActionItem: () => React.createElement("div")
      })
    );

    expect(html).toContain("sm:grid-cols-[2rem_minmax(0,1fr)]");
    expect(html).toContain("grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))]");
    expect(html).toContain("inline-flex max-w-full flex-wrap items-center gap-1.5");
    expect(html).not.toContain("lg:grid-cols-[2rem_minmax(0,1fr)_auto]");
    expect(html).toContain("Brief");
    expect(html).toContain("Raport");
    expect(html).toContain("README");
    expect(html).toContain("GitHub");
  });
});
