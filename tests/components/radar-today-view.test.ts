import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RadarTodayView } from "../../src/components/repo-radar/radar-today-view";
import type { RadarTodayData } from "../../src/types/repository";

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
    expect(html).toContain("Dane lokalne albo demo");
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
});
