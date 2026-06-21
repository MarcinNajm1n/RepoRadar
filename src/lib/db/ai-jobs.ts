import { prisma } from "./client";
import type { AiJobSummary, AiJobType } from "@/types/ai-job";

type RunAiJobInput = {
  type: AiJobType;
  repoId?: string | null;
  ideaId?: string | null;
  reportId?: string | null;
  priority?: number;
  dedupeKey?: string | null;
};

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
  const job = await prisma.aiJob.create({
    data: {
      type: input.type,
      status: "RUNNING",
      repoId: input.repoId ?? null,
      ideaId: input.ideaId ?? null,
      reportId: input.reportId ?? null,
      priority: cleanPriority(input.priority),
      dedupeKey: buildAiJobDedupeKey(input),
      startedAt: new Date()
    }
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
