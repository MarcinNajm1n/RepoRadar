import { describe, expect, it } from "vitest";
import {
  buildRepositoryDecisionContext,
  type RepositoryDecisionContextRecord
} from "../../src/lib/db/repository-decision-context";

const now = new Date("2026-06-25T10:00:00.000Z");

function report(type: string, id = type) {
  return {
    id,
    type,
    title: `${type} report`,
    summary: `${type} summary`,
    createdAt: new Date("2026-06-24T10:00:00.000Z")
  };
}

function source(id = "source_1") {
  return {
    id,
    sourceType: "hn",
    title: "Users discuss agent workflow pain",
    publisher: "Hacker News",
    retrievedAt: new Date("2026-06-23T10:00:00.000Z"),
    evidenceKind: "pain_point",
    whatItProves: "Developers need better local workflow automation.",
    sourceConfidence: 80
  };
}

function task(id = "task_1") {
  return {
    id,
    type: "READ_README",
    status: "OPEN",
    title: "Read README",
    priority: 5,
    dueAt: null,
    snoozedUntil: null,
    createdAt: new Date("2026-06-22T10:00:00.000Z")
  };
}

function record(overrides: Partial<RepositoryDecisionContextRecord> = {}): RepositoryDecisionContextRecord {
  return {
    id: "repo_1",
    fullName: "owner/tool",
    status: "SAVED",
    lastAnalyzedAt: now,
    trendScore: 84,
    relevanceScore: 72,
    initialMomentumScore: 60,
    growth24h: 8,
    growth7d: 42,
    growthPercent7d: 9.5,
    reports: [report("repo_quick_brief"), report("repo")],
    actionItems: [],
    marketResearchSources: [source()],
    marketResearchRuns: [
      {
        id: "run_1",
        status: "COMPLETED",
        mode: "light",
        provider: "hn",
        sourceCount: 1,
        startedAt: new Date("2026-06-23T09:00:00.000Z"),
        finishedAt: new Date("2026-06-23T10:00:00.000Z")
      }
    ],
    snapshots: [
      {
        id: "snapshot_1",
        capturedAt: new Date("2026-06-24T09:00:00.000Z"),
        growth24h: 8,
        growth7d: 42,
        growthPercent7d: 9.5
      }
    ],
    ...overrides
  };
}

describe("buildRepositoryDecisionContext", () => {
  it("prioritizes a missing quick brief first", () => {
    const context = buildRepositoryDecisionContext(record({ reports: [report("repo")] }), now);

    expect(context.nextAction.kind).toBe("quick_brief");
    expect(context.reports.quickBriefCount).toBe(0);
  });

  it("prioritizes a missing full report after a quick brief exists", () => {
    const context = buildRepositoryDecisionContext(record({ reports: [report("repo_quick_brief")] }), now);

    expect(context.nextAction.kind).toBe("full_report");
    expect(context.reports.fullReportCount).toBe(0);
  });

  it("prioritizes open tasks after reports exist", () => {
    const context = buildRepositoryDecisionContext(
      record({
        actionItems: [task()],
        marketResearchSources: []
      }),
      now
    );

    expect(context.nextAction).toMatchObject({
      kind: "open_task",
      taskId: "task_1"
    });
  });

  it("does not treat future-snoozed tasks as active blockers", () => {
    const context = buildRepositoryDecisionContext(
      record({
        actionItems: [
          {
            ...task("future_snoozed"),
            status: "SNOOZED",
            priority: 99,
            snoozedUntil: new Date("2026-06-26T10:00:00.000Z")
          }
        ],
        marketResearchSources: []
      }),
      now
    );

    expect(context.nextAction.kind).toBe("research_evidence");
    expect(context.tasks.openCount).toBe(0);
  });

  it("prioritizes missing research evidence after reports and tasks are clear", () => {
    const context = buildRepositoryDecisionContext(record({ marketResearchSources: [], marketResearchRuns: [] }), now);

    expect(context.nextAction.kind).toBe("research_evidence");
    expect(context.evidence.sourceCount).toBe(0);
  });

  it("prioritizes undecided status after evidence exists", () => {
    const context = buildRepositoryDecisionContext(record({ status: "NEW" }), now);

    expect(context.nextAction.kind).toBe("status_decision");
    expect(context.status.needsDecision).toBe(true);
  });

  it("falls back to monitor when decision context is complete", () => {
    const context = buildRepositoryDecisionContext(record(), now);

    expect(context.nextAction.kind).toBe("monitor");
    expect(context.signals.map((signal) => signal.id)).toEqual(["trend", "growth-7d", "reports", "tasks", "evidence", "status"]);
  });
});
