import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActionItemListItem } from "../../src/types/action-item";
import { filterQueueItems, TasksView } from "../../src/components/repo-radar/tasks-view";

const now = "2026-06-16T12:00:00.000Z";
const noop = () => undefined;

function actionItem(overrides: Partial<ActionItemListItem> = {}): ActionItemListItem {
  return {
    id: "action_1",
    type: "READ_README",
    status: "OPEN",
    title: "Przeczytaj README",
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
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("TasksView filters", () => {
  const items = [
    actionItem({ id: "readme", title: "Przeczytaj README", type: "READ_README", priority: 1, repoFullName: "owner/readme-tool" }),
    actionItem({ id: "demo", title: "Sprawdz demo", type: "CHECK_DEMO", priority: 3, repoFullName: "owner/demo-tool" }),
    actionItem({
      id: "market",
      title: "Zweryfikuj rynek",
      type: "VALIDATE_MARKET",
      status: "SNOOZED",
      priority: 4,
      repoFullName: "owner/market-tool"
    }),
    actionItem({
      id: "report",
      title: "Raport gotowy",
      type: "GENERATE_REPORT",
      status: "DONE",
      priority: 5,
      repoFullName: null,
      reportTitle: "Raport tygodniowy"
    })
  ];

  it("filters queue items by text, type, status and minimum priority", () => {
    expect(
      filterQueueItems(items, {
        query: "demo",
        type: "CHECK_DEMO",
        status: "OPEN",
        minPriority: 2
      }).map((item) => item.id)
    ).toEqual(["demo"]);

    expect(
      filterQueueItems(items, {
        query: "owner",
        type: "ALL",
        status: "ALL",
        minPriority: 3
      }).map((item) => item.id)
    ).toEqual(["demo", "market"]);

    expect(
      filterQueueItems(items, {
        query: "raport",
        type: "ALL",
        status: "DONE",
        minPriority: 0
      }).map((item) => item.id)
    ).toEqual(["report"]);
  });

  it("renders compact filter controls with visible counts", () => {
    const html = renderToStaticMarkup(
      React.createElement(TasksView, {
        items,
        isPending: false,
        onCreateManualTask: noop,
        onComplete: noop,
        onSnooze: noop,
        onDismiss: noop
      })
    );

    expect(html).toContain("Filtry zadan");
    expect(html).toContain("Szukaj tytulu, repo, pomyslu...");
    expect(html).toContain("Wszystkie typy");
    expect(html).toContain("Wszystkie statusy");
    expect(html).toContain("Widoczne");
    expect(html).toContain("4/4");
  });
});
