import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    actionItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    }
  },
  recordActionItemDecision: vi.fn()
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/db/repository-audit", () => ({
  recordActionItemDecision: mocks.recordActionItemDecision
}));

import {
  createActionItem,
  getActionItems,
  getActiveActionItems,
  normalizeActionItemStatus,
  normalizeActionItemType,
  updateActionItem
} from "../../src/lib/db/action-items";

function actionItemRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "task_1",
    type: "CUSTOM",
    status: "OPEN",
    title: "Manual task",
    description: null,
    repoId: null,
    ideaId: null,
    reportId: null,
    priority: 0,
    dueAt: null,
    snoozedUntil: null,
    completedAt: null,
    dismissedAt: null,
    dedupeKey: null,
    metadataJson: "{}",
    createdAt: new Date("2026-06-25T10:00:00.000Z"),
    updatedAt: new Date("2026-06-25T10:00:00.000Z"),
    repository: null,
    idea: null,
    report: null,
    ...overrides
  };
}

describe("action item input normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.actionItem.create.mockResolvedValue(actionItemRecord());
  });

  it("falls back to neutral priority for non-number runtime payloads", async () => {
    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      priority: "99" as unknown as number
    });
    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      priority: Number.POSITIVE_INFINITY
    });
    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      priority: Number.NaN
    });

    expect(mocks.prisma.actionItem.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ priority: 0 })
      })
    );
    expect(mocks.prisma.actionItem.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ priority: 0 })
      })
    );
    expect(mocks.prisma.actionItem.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({ priority: 0 })
      })
    );
  });

  it("clamps finite numeric priorities", async () => {
    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      priority: 150.7
    });
    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      priority: -150.7
    });

    expect(mocks.prisma.actionItem.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ priority: 100 })
      })
    );
    expect(mocks.prisma.actionItem.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ priority: -100 })
      })
    );
  });

  it("sanitizes optional relation ids before creating action items", async () => {
    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      repoId: "\u0000repo_1",
      ideaId: { id: "idea_1" } as unknown as string,
      reportId: "  report_1  "
    });

    expect(mocks.prisma.actionItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repoId: "repo_1",
          ideaId: null,
          reportId: "report_1"
        })
      })
    );
  });

  it("sanitizes metadata before creating action items", async () => {
    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      metadata: {
        " source\u0000key ": " value\u0000with control ",
        unsafeNumber: Number.POSITIVE_INFINITY,
        safeNumber: 3,
        nested: {
          ok: "yes",
          missing: Symbol("bad"),
          deeper: {
            label: "deep",
            tooDeep: { dropped: "value" }
          }
        },
        list: ["one", Number.NaN, "two", { nested: "kept" }],
        unsupported: () => "bad"
      } as unknown as Record<string, unknown>
    });

    const call = mocks.prisma.actionItem.create.mock.calls[0]?.[0] as { data: { metadataJson: string } };
    const metadata = JSON.parse(call.data.metadataJson);

    expect(metadata).toEqual({
      sourcekey: "valuewith control",
      safeNumber: 3,
      nested: {
        ok: "yes",
        deeper: {
          label: "deep"
        }
      },
      list: ["one", "two", { nested: "kept" }]
    });
  });

  it("limits stored metadata keys before creating action items", async () => {
    const metadata = Object.fromEntries(Array.from({ length: 35 }, (_, index) => [`field_${index}`, `value_${index}`]));

    await createActionItem({
      type: "CUSTOM",
      title: "Manual task",
      metadata
    });

    const call = mocks.prisma.actionItem.create.mock.calls[0]?.[0] as { data: { metadataJson: string } };
    const parsed = JSON.parse(call.data.metadataJson) as Record<string, unknown>;

    expect(Object.keys(parsed)).toHaveLength(30);
    expect(parsed).toHaveProperty("field_0", "value_0");
    expect(parsed).toHaveProperty("field_29", "value_29");
    expect(parsed).not.toHaveProperty("field_30");
  });

  it("sanitizes action item ids before update and rejects blank ids", async () => {
    mocks.prisma.actionItem.update.mockResolvedValue(actionItemRecord());

    await updateActionItem("  task_1\u0000  ", { repoId: "\u0000repo_1", ideaId: { id: "idea_1" } as unknown as string });
    await expect(updateActionItem("   ", { title: "Ignored" })).rejects.toThrow("Action item id is required");

    expect(mocks.prisma.actionItem.update).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.actionItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task_1" },
        data: expect.objectContaining({
          repoId: "repo_1",
          ideaId: null
        })
      })
    );
  });
});

describe("action item list limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.actionItem.findMany.mockResolvedValue([actionItemRecord()]);
  });

  it("clamps finite list limits before passing them to Prisma", async () => {
    await getActionItems(250);
    await getActiveActionItems(0);

    expect(mocks.prisma.actionItem.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 100
      })
    );
    expect(mocks.prisma.actionItem.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 1
      })
    );
  });

  it("falls back for non-finite list limits while preserving explicit unlimited reads", async () => {
    await getActionItems(Number.NaN);
    await getActiveActionItems(Number.POSITIVE_INFINITY);
    await getActiveActionItems("many" as unknown as number);
    await getActionItems(null);

    expect(mocks.prisma.actionItem.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 50
      })
    );
    expect(mocks.prisma.actionItem.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 20
      })
    );
    expect(mocks.prisma.actionItem.findMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        take: 20
      })
    );
    expect(mocks.prisma.actionItem.findMany.mock.calls[3]?.[0]).not.toHaveProperty("take");
  });
});

describe("action item validation", () => {
  it("accepts known action item types and statuses", () => {
    expect(normalizeActionItemType("READ_README")).toBe("READ_README");
    expect(normalizeActionItemStatus("SNOOZED")).toBe("SNOOZED");
  });

  it("rejects unknown action item values", () => {
    expect(() => normalizeActionItemType("BAD")).toThrow("Unsupported action item type");
    expect(() => normalizeActionItemStatus("BAD")).toThrow("Unsupported action item status");
  });
});
