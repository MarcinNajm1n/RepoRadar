import { describe, expect, it } from "vitest";
import { buildRepositoryTimelineItems } from "../../src/lib/db/repository-timeline";

const baseDate = new Date("2026-06-16T12:00:00Z");

describe("buildRepositoryTimelineItems", () => {
  it("combines scans, snapshots, reports, status and actions newest first", () => {
    const timeline = buildRepositoryTimelineItems({
      id: "repo_1",
      fullName: "owner/tool",
      status: "SAVED",
      firstSeenAt: new Date("2026-06-10T12:00:00Z"),
      lastSeenAt: baseDate,
      updatedDbAt: new Date("2026-06-15T12:00:00Z"),
      ignoredRecord: null,
      snapshots: [
        {
          id: "snapshot_1",
          capturedAt: new Date("2026-06-16T11:00:00Z"),
          stars: 1200,
          growth24h: 10,
          growth7d: 100
        }
      ],
      reports: [
        {
          id: "report_1",
          type: "repo_quick_brief",
          title: "Quick brief: owner/tool",
          createdAt: new Date("2026-06-16T10:00:00Z")
        }
      ],
      actionItems: [
        {
          id: "action_1",
          type: "READ_README",
          status: "DONE",
          title: "Read README",
          createdAt: new Date("2026-06-14T12:00:00Z"),
          completedAt: new Date("2026-06-16T09:00:00Z"),
          dismissedAt: null
        }
      ]
    });

    expect(timeline.map((item) => item.type)).toEqual(["scan", "snapshot", "report", "action", "status", "scan"]);
    expect(timeline.find((item) => item.id === "report:report_1")).toMatchObject({
      title: "Quick brief",
      tone: "positive"
    });
    expect(timeline.find((item) => item.id === "action:action_1")).toMatchObject({
      title: "Read README",
      tone: "positive"
    });
  });

  it("marks ignored repositories as warning status events", () => {
    const timeline = buildRepositoryTimelineItems({
      id: "repo_1",
      fullName: "owner/tool",
      status: "IGNORED",
      firstSeenAt: new Date("2026-06-10T12:00:00Z"),
      lastSeenAt: baseDate,
      updatedDbAt: new Date("2026-06-15T12:00:00Z"),
      ignoredRecord: { ignoredAt: new Date("2026-06-16T12:30:00Z"), reason: "Too weak" },
      snapshots: [],
      reports: [],
      actionItems: []
    });

    expect(timeline[0]).toMatchObject({
      id: "ignored:repo_1",
      tone: "warning"
    });
  });
});
