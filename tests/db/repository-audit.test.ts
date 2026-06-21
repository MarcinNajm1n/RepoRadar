import { describe, expect, it } from "vitest";
import { buildDecisionLogMarkdown, buildScoringSnapshotMarkdown } from "../../src/lib/db/repository-audit";

const createdAt = new Date("2026-06-21T12:00:00.000Z");

describe("repository audit markdown", () => {
  it("captures scoring state with status context", () => {
    const markdown = buildScoringSnapshotMarkdown({
      createdAt,
      previousStatus: "NEW",
      nextStatus: "SAVED",
      reason: "Manual review",
      repository: {
        id: "repo_1",
        fullName: "owner/tool",
        status: "SAVED",
        trendScore: 87,
        relevanceScore: 76,
        initialMomentumScore: 63,
        starsCurrent: 1234,
        forksCurrent: 120,
        watchersCurrent: 1234,
        openIssues: 9,
        firstSeenAt: createdAt,
        lastSeenAt: createdAt,
        pushedAt: createdAt,
        scoreBreakdownJson: JSON.stringify({
          absoluteGrowthPoints: 20,
          percentageGrowthPoints: 8,
          usedInitialMomentumFallback: false
        }),
        snapshots: [
          {
            capturedAt: createdAt,
            stars: 1234,
            growth24h: 12,
            growth7d: 120,
            growthPercent7d: 10.8
          }
        ]
      }
    });

    expect(markdown).toContain("# Scoring snapshot - owner/tool");
    expect(markdown).toContain("- Status przed: NEW");
    expect(markdown).toContain("- Status po: SAVED");
    expect(markdown).toContain("- Trend score: 87/100");
    expect(markdown).toContain("- Growth abs: 20");
    expect(markdown).toContain("- Initial fallback: nie");
  });

  it("captures user decisions in a compact changelog format", () => {
    const markdown = buildDecisionLogMarkdown({
      createdAt,
      repositoryFullName: "owner/tool",
      action: "action_item_created",
      nextStatus: "OPEN",
      reason: "Read README",
      metadata: [["Task priority", 8]]
    });

    expect(markdown).toContain("# Decision log - owner/tool");
    expect(markdown).toContain("- Akcja: action_item_created");
    expect(markdown).toContain("- Status po: OPEN");
    expect(markdown).toContain("- Task priority: 8");
  });
});
