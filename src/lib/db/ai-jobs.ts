import { prisma } from "./client";
import type { AiJobListItem, AiJobSummary, AiJobType } from "@/types/ai-job";

type RunAiJobInput = {
  type: AiJobType;
  repoId?: string | null;
  ideaId?: string | null;
  reportId?: string | null;
  priority?: number;
  dedupeKey?: string | null;
};

const ACTIVE_AI_JOB_STATUSES = ["QUEUED", "RUNNING"] as const;
const STALE_AI_JOB_LOCK_MS = 60 * 60 * 1000;
export const AI_JOB_ALREADY_RUNNING_MESSAGE = "Ta analiza już trwa.";
export const AI_JOB_STALE_LOCK_ERROR = "Zadanie AI przerwane po przekroczeniu czasu blokady.";
const activeAiJobDedupeKeys = new Set<string>();

function cleanPriority(priority: number | undefined) {
  if (priority === undefined || !Number.isFinite(priority)) {
    return 0;
  }

  return Math.max(-100, Math.min(100, Math.round(priority)));
}

export function buildAiJobDedupeKey(input: RunAiJobInput) {
  return input.dedupeKey ?? [input.type, input.repoId, input.ideaId, input.reportId].filter(Boolean).join(":");
}

export async function runAiJob<T>(
  input: RunAiJobInput,
  handler: () => Promise<T>,
  result: (value: T) => Record<string, unknown> = () => ({})
) {
  const dedupeKey = buildAiJobDedupeKey(input);

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
          type: input.type,
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

export async function getRecentAiJobs(limit = 8): Promise<AiJobListItem[]> {
  const take = Math.min(20, Math.max(1, Math.floor(limit)));
  const jobs = await prisma.aiJob.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      status: true,
      priority: true,
      error: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      repository: {
        select: { fullName: true }
      }
    }
  });

  return jobs.map((job) => ({
    id: job.id,
    type: job.type,
    status: job.status,
    priority: job.priority,
    repoFullName: job.repository?.fullName ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    error: job.error
  }));
}
