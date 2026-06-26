import { prisma } from "./client";
import { AI_JOB_STATUSES, AI_JOB_TYPES } from "@/types/ai-job";
import type { AiJobListItem, AiJobQueueSummary, AiJobSummary, AiJobType } from "@/types/ai-job";

type RunAiJobInput = {
  type: AiJobType;
  repoId?: string | null;
  ideaId?: string | null;
  reportId?: string | null;
  priority?: number;
  dedupeKey?: string | null;
};

const ACTIVE_AI_JOB_STATUSES = ["QUEUED", "RUNNING"] as const;
const RETRYABLE_AI_JOB_TYPES = new Set(["REPORT", "IDEA", "SUMMARY", "RESEARCH"]);
const STALE_AI_JOB_LOCK_MS = 60 * 60 * 1000;
export const AI_JOB_ALREADY_RUNNING_MESSAGE = "Ta analiza już trwa.";
export const AI_JOB_STALE_LOCK_ERROR = "Zadanie AI przerwane po przekroczeniu czasu blokady.";
const activeAiJobDedupeKeys = new Set<string>();

type AiJobRow = {
  id: string;
  type: string;
  status: string;
  priority: number;
  repoId: string | null;
  ideaId: string | null;
  reportId: string | null;
  dedupeKey: string | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  repository: {
    fullName: string;
  } | null;
};

const aiJobListSelect = {
  id: true,
  type: true,
  status: true,
  priority: true,
  repoId: true,
  ideaId: true,
  reportId: true,
  dedupeKey: true,
  error: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true,
  repository: {
    select: { fullName: true }
  }
} as const;

function mapAiJob(job: AiJobRow): AiJobListItem {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    priority: job.priority,
    repoId: job.repoId,
    ideaId: job.ideaId,
    reportId: job.reportId,
    dedupeKey: job.dedupeKey,
    repoFullName: job.repository?.fullName ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    error: job.error
  };
}

function cleanPriority(priority: number | undefined) {
  if (priority === undefined || !Number.isFinite(priority)) {
    return 0;
  }

  return Math.max(-100, Math.min(100, Math.round(priority)));
}

function isAiJobType(type: unknown): type is AiJobType {
  return typeof type === "string" && Object.prototype.hasOwnProperty.call(AI_JOB_TYPES, type);
}

export function normalizeAiJobType(type: unknown): AiJobType {
  if (!isAiJobType(type)) {
    throw new Error("Unsupported AI job type.");
  }

  return type;
}

export function buildAiJobDedupeKey(input: RunAiJobInput) {
  const type = normalizeAiJobType(input.type);
  return input.dedupeKey ?? [type, input.repoId, input.ideaId, input.reportId].filter(Boolean).join(":");
}

export async function runAiJob<T>(
  input: RunAiJobInput,
  handler: () => Promise<T>,
  result: (value: T) => Record<string, unknown> = () => ({})
) {
  const type = normalizeAiJobType(input.type);
  const dedupeKey = buildAiJobDedupeKey({ ...input, type });

  if (activeAiJobDedupeKeys.has(dedupeKey)) {
    throw new Error(AI_JOB_ALREADY_RUNNING_MESSAGE);
  }

  activeAiJobDedupeKeys.add(dedupeKey);

  try {
    const job = await prisma.$transaction(async (tx) => {
      const staleBefore = new Date(Date.now() - STALE_AI_JOB_LOCK_MS);
      await tx.aiJob.updateMany({
        where: {
          dedupeKey,
          status: { in: [...ACTIVE_AI_JOB_STATUSES] },
          OR: [{ startedAt: null }, { startedAt: { lt: staleBefore } }]
        },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: AI_JOB_STALE_LOCK_ERROR
        }
      });
      const activeJob = await tx.aiJob.findFirst({
        where: {
          dedupeKey,
          status: { in: [...ACTIVE_AI_JOB_STATUSES] }
        },
        select: { id: true }
      });

      if (activeJob) {
        throw new Error(AI_JOB_ALREADY_RUNNING_MESSAGE);
      }

      return tx.aiJob.create({
        data: {
          type,
          status: "RUNNING",
          repoId: input.repoId ?? null,
          ideaId: input.ideaId ?? null,
          reportId: input.reportId ?? null,
          priority: cleanPriority(input.priority),
          dedupeKey,
          startedAt: new Date()
        }
      });
    });

    try {
      const value = await handler();
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: "DONE",
          finishedAt: new Date(),
          resultJson: JSON.stringify(result(value))
        }
      });
      return value;
    } catch (error) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown AI job error"
        }
      });
      throw error;
    }
  } finally {
    activeAiJobDedupeKeys.delete(dedupeKey);
  }
}

export async function getAiJobSummary(): Promise<AiJobSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [queued, running, done24h, failed24h] = await Promise.all([
    prisma.aiJob.count({ where: { status: "QUEUED" } }),
    prisma.aiJob.count({ where: { status: "RUNNING" } }),
    prisma.aiJob.count({ where: { status: "DONE", finishedAt: { gte: since } } }),
    prisma.aiJob.count({ where: { status: "FAILED", finishedAt: { gte: since } } })
  ]);

  return { queued, running, done24h, failed24h };
}

export async function getAiJobQueueSummary(): Promise<AiJobQueueSummary> {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [statusRows, typeRows, oldestActiveJob, recentFailures] = await Promise.all([
    prisma.aiJob.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    prisma.aiJob.groupBy({
      by: ["type"],
      _count: { _all: true }
    }),
    prisma.aiJob.findFirst({
      where: { status: { in: [...ACTIVE_AI_JOB_STATUSES] } },
      orderBy: [{ createdAt: "asc" }],
      select: aiJobListSelect
    }),
    prisma.aiJob.findMany({
      where: { status: "FAILED", finishedAt: { gte: since } },
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: aiJobListSelect
    })
  ]);
  const statusCounts = new Map(statusRows.map((row) => [row.status, row._count._all]));
  const typeCounts = new Map(typeRows.map((row) => [row.type, row._count._all]));
  const recentFailureItems = recentFailures.map(mapAiJob);
  const byStatus = Object.entries(AI_JOB_STATUSES).map(([status, label]) => ({
    key: status,
    label,
    count: statusCounts.get(status) ?? 0
  }));
  const knownTypeCounts = Object.entries(AI_JOB_TYPES).map(([type, label]) => ({
    key: type,
    label,
    count: typeCounts.get(type) ?? 0
  }));
  const customTypeCounts = [...typeCounts.entries()]
    .filter(([type]) => !(type in AI_JOB_TYPES))
    .map(([type, count]) => ({ key: type, label: type, count }));

  return {
    generatedAt: now.toISOString(),
    totalJobs: [...statusCounts.values()].reduce((sum, count) => sum + count, 0),
    activeCount: (statusCounts.get("QUEUED") ?? 0) + (statusCounts.get("RUNNING") ?? 0),
    needsAttentionCount: statusCounts.get("FAILED") ?? 0,
    retryableFailedCount: recentFailureItems.filter((job) => job.repoId && RETRYABLE_AI_JOB_TYPES.has(job.type)).length,
    byStatus,
    byType: [...knownTypeCounts, ...customTypeCounts].filter((entry) => entry.count > 0),
    oldestActiveJob: oldestActiveJob ? mapAiJob(oldestActiveJob) : null,
    recentFailures: recentFailureItems
  };
}

export async function getRecentAiJobs(limit = 8): Promise<AiJobListItem[]> {
  const take = Math.min(20, Math.max(1, Math.floor(limit)));
  const jobs = await prisma.aiJob.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: aiJobListSelect
  });

  return jobs.map(mapAiJob);
}
