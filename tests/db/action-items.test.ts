import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    actionItem: {
      create: vi.fn(),
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

import { createActionItem, normalizeActionItemStatus, normalizeActionItemType } from "../../src/lib/db/action-items";

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
