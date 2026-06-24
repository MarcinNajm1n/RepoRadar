import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const aiJob = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn()
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
  getRecentAiJobs,
  runAiJob
} from "../../src/lib/db/ai-jobs";

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
});

describe("runAiJob", () => {
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
