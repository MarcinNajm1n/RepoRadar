import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const aiJob = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn()
  };
  const prisma = {
    aiJob,
    $transaction: vi.fn()
  };

  return { aiJob, prisma };
});

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

import {
  AI_JOB_ALREADY_RUNNING_MESSAGE,
  AI_JOB_STALE_LOCK_ERROR,
  buildAiJobDedupeKey,
  getAiJobQueueSummary,
  getRecentAiJobs,
  normalizeAiJobType,
  runAiJob
} from "../../src/lib/db/ai-jobs";
import type { AiJobType } from "../../src/types/ai-job";

type TransactionCallback = (tx: typeof mocks.prisma) => Promise<unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.$transaction.mockImplementation((callback: TransactionCallback) => callback(mocks.prisma));
  mocks.aiJob.updateMany.mockResolvedValue({ count: 0 });
});

describe("buildAiJobDedupeKey", () => {
  it("builds stable dedupe keys from job identity", () => {
    expect(buildAiJobDedupeKey({ type: "REPORT", repoId: "repo_1" })).toBe("REPORT:repo_1");
  });

  it("honors explicit dedupe keys", () => {
    expect(buildAiJobDedupeKey({ type: "IDEA", repoId: "repo_1", dedupeKey: "custom" })).toBe("custom");
  });

  it("rejects unsupported runtime job types", () => {
    expect(normalizeAiJobType("REPORT")).toBe("REPORT");
    expect(() => buildAiJobDedupeKey({ type: "BAD" as unknown as AiJobType, repoId: "repo_1" })).toThrow(
      "Unsupported AI job type"
    );
    expect(() => buildAiJobDedupeKey({ type: "BAD" as unknown as AiJobType, dedupeKey: "manual" })).toThrow(
      "Unsupported AI job type"
    );
  });
});

describe("runAiJob", () => {
  it("rejects unsupported job types before creating database work", async () => {
    const handler = vi.fn();

    await expect(runAiJob({ type: "BAD" as unknown as AiJobType, repoId: "repo_1" }, handler)).rejects.toThrow(
      "Unsupported AI job type"
    );

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("blocks a second active job with the same dedupe key", async () => {
    const handler = vi.fn();
    mocks.aiJob.findFirst.mockResolvedValue({ id: "job_running" });

    await expect(runAiJob({ type: "REPORT", repoId: "repo_1" }, handler)).rejects.toThrow(AI_JOB_ALREADY_RUNNING_MESSAGE);

    expect(mocks.aiJob.findFirst).toHaveBeenCalledWith({
      where: {
        dedupeKey: "REPORT:repo_1",
        status: { in: ["QUEUED", "RUNNING"] }
      },
      select: { id: true }
    });
    expect(mocks.aiJob.create).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("expires stale active jobs before checking for duplicates", async () => {
    const handler = vi.fn((): Promise<{ id: string }> => Promise.resolve({ id: "report_1" }));
    mocks.aiJob.findFirst.mockResolvedValue(null);
    mocks.aiJob.create.mockResolvedValue({ id: "job_1" });
    mocks.aiJob.update.mockResolvedValue({ id: "job_1" });

    await expect(runAiJob({ type: "REPORT", repoId: "repo_1" }, handler)).resolves.toEqual({ id: "report_1" });

    expect(mocks.aiJob.updateMany).toHaveBeenCalledWith({
      where: {
        dedupeKey: "REPORT:repo_1",
        status: { in: ["QUEUED", "RUNNING"] },
        OR: [{ startedAt: null }, { startedAt: { lt: expect.any(Date) } }]
      },
      data: {
        status: "FAILED",
        finishedAt: expect.any(Date),
        error: AI_JOB_STALE_LOCK_ERROR
      }
    });
  });

  it("creates a running job and marks it done after the handler resolves", async () => {
    const handler = vi.fn((): Promise<{ id: string }> => Promise.resolve({ id: "report_1" }));
    mocks.aiJob.findFirst.mockResolvedValue(null);
    mocks.aiJob.create.mockResolvedValue({ id: "job_1" });
    mocks.aiJob.update.mockResolvedValue({ id: "job_1" });

    await expect(
      runAiJob({ type: "REPORT", repoId: "repo_1", priority: 150 }, handler, (value) => ({ reportId: value.id }))
    ).resolves.toEqual({ id: "report_1" });

    expect(mocks.aiJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "REPORT",
        status: "RUNNING",
        repoId: "repo_1",
        priority: 100,
        dedupeKey: "REPORT:repo_1",
        startedAt: expect.any(Date)
      })
    });
    expect(mocks.aiJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "DONE",
        resultJson: JSON.stringify({ reportId: "report_1" }),
        finishedAt: expect.any(Date)
      })
    });
  });

  it("blocks an overlapping in-process job before the handler finishes", async () => {
    let resolveHandler: ((value: { ok: true }) => void) | undefined;
    const handler = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveHandler = resolve;
        })
    );
    mocks.aiJob.findFirst.mockResolvedValue(null);
    mocks.aiJob.create.mockResolvedValue({ id: "job_1" });
    mocks.aiJob.update.mockResolvedValue({ id: "job_1" });

    const firstRun = runAiJob({ type: "REPORT", repoId: "repo_1" }, handler);

    await expect(runAiJob({ type: "REPORT", repoId: "repo_1" }, vi.fn())).rejects.toThrow(AI_JOB_ALREADY_RUNNING_MESSAGE);

    expect(mocks.aiJob.create).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    if (!resolveHandler) {
      throw new Error("Expected the first AI job handler to be pending.");
    }
    resolveHandler({ ok: true });
    await expect(firstRun).resolves.toEqual({ ok: true });
  });

  it("marks the job failed when the handler throws", async () => {
    const error = new Error("OpenAI request failed");
    mocks.aiJob.findFirst.mockResolvedValue(null);
    mocks.aiJob.create.mockResolvedValue({ id: "job_1" });
    mocks.aiJob.update.mockResolvedValue({ id: "job_1" });

    await expect(runAiJob({ type: "SUMMARY", repoId: "repo_1" }, () => Promise.reject(error))).rejects.toThrow(error);

    expect(mocks.aiJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "FAILED",
        error: "OpenAI request failed",
        finishedAt: expect.any(Date)
      })
    });
  });
});

describe("getRecentAiJobs", () => {
  it("maps recent jobs with repository names and clamps the list size", async () => {
    const createdAt = new Date("2026-06-16T12:00:00Z");
    const finishedAt = new Date("2026-06-16T12:01:00Z");
    mocks.aiJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        type: "REPORT",
        status: "FAILED",
        priority: 60,
        repoId: "repo_1",
        ideaId: null,
        reportId: null,
        dedupeKey: "report:repo_1:default",
        error: "Boom",
        createdAt,
        startedAt: null,
        finishedAt,
        repository: { fullName: "owner/tool" }
      }
    ]);

    await expect(getRecentAiJobs(50)).resolves.toEqual([
      {
        id: "job_1",
        type: "REPORT",
        status: "FAILED",
        priority: 60,
        repoId: "repo_1",
        ideaId: null,
        reportId: null,
        dedupeKey: "report:repo_1:default",
        repoFullName: "owner/tool",
        createdAt: createdAt.toISOString(),
        startedAt: null,
        finishedAt: finishedAt.toISOString(),
        error: "Boom"
      }
    ]);
    expect(mocks.aiJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        take: 20
      })
    );
  });
});

describe("getAiJobQueueSummary", () => {
  it("builds queue diagnostics with status/type counts and retryable failures", async () => {
    const createdAt = new Date("2026-06-16T12:00:00Z");
    const startedAt = new Date("2026-06-16T12:00:10Z");
    const finishedAt = new Date("2026-06-16T12:01:00Z");
    mocks.aiJob.groupBy
      .mockResolvedValueOnce([
        { status: "RUNNING", _count: { _all: 1 } },
        { status: "FAILED", _count: { _all: 2 } }
      ])
      .mockResolvedValueOnce([
        { type: "REPORT", _count: { _all: 2 } },
        { type: "RESEARCH", _count: { _all: 1 } }
      ]);
    mocks.aiJob.findFirst.mockResolvedValue({
      id: "job_running",
      type: "REPORT",
      status: "RUNNING",
      priority: 80,
      repoId: "repo_1",
      ideaId: null,
      reportId: null,
      dedupeKey: "report:repo_1:default",
      error: null,
      createdAt,
      startedAt,
      finishedAt: null,
      repository: { fullName: "owner/tool" }
    });
    mocks.aiJob.findMany.mockResolvedValue([
      {
        id: "job_failed",
        type: "RESEARCH",
        status: "FAILED",
        priority: 40,
        repoId: "repo_2",
        ideaId: null,
        reportId: null,
        dedupeKey: "research:repo_2:default",
        error: "Provider failed",
        createdAt,
        startedAt,
        finishedAt,
        repository: { fullName: "owner/research" }
      }
    ]);

    const summary = await getAiJobQueueSummary();

    expect(summary.activeCount).toBe(1);
    expect(summary.needsAttentionCount).toBe(2);
    expect(summary.retryableFailedCount).toBe(1);
    expect(summary.byStatus).toEqual([
      { key: "QUEUED", label: "W kolejce", count: 0 },
      { key: "RUNNING", label: "W toku", count: 1 },
      { key: "DONE", label: "Gotowe", count: 0 },
      { key: "FAILED", label: "Błąd", count: 2 }
    ]);
    expect(summary.byType).toEqual([
      { key: "REPORT", label: "Raport", count: 2 },
      { key: "RESEARCH", label: "Badanie", count: 1 }
    ]);
    expect(summary.oldestActiveJob?.repoFullName).toBe("owner/tool");
    expect(summary.recentFailures[0]).toMatchObject({
      id: "job_failed",
      repoId: "repo_2",
      repoFullName: "owner/research",
      error: "Provider failed"
    });
  });
});
