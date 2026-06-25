import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RadarTodayView } from "../../src/components/repo-radar/radar-today-view";
import type { RadarTodayData } from "../../src/types/repository";

const noop = () => undefined;

function radarToday(overrides: Partial<RadarTodayData> = {}): RadarTodayData {
  return {
    generatedAt: "2026-06-16T12:00:00.000Z",
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
});
