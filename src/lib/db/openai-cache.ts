import { prisma } from "./client";
import { OPENAI_DAILY_ANALYSIS_CACHE_KINDS, OPENAI_DAILY_ANALYSIS_RESEARCH_PROVIDERS } from "@/lib/openai/token-budgets";
import type { OpenAiCacheSummary } from "@/types/repository";

export async function getCachedOpenAiOutput(kind: string, repoId: string | null, inputHash: string, model: string) {
  return prisma.openAiCache.findFirst({
    where: { kind, repoId, inputHash, model }
  });
}

export async function getCachedOpenAiOutputByHashes(kind: string, repoId: string | null, inputHashes: string[], model: string) {
  if (inputHashes.length === 0) {
    return null;
  }

  return prisma.openAiCache.findFirst({
    where: { kind, repoId, inputHash: { in: inputHashes }, model },
    orderBy: { createdAt: "desc" }
  });
}

export async function saveOpenAiOutput(kind: string, repoId: string | null, inputHash: string, model: string, content: string) {
  const existing = await getCachedOpenAiOutput(kind, repoId, inputHash, model);
  if (existing) {
    return prisma.openAiCache.update({
      where: { id: existing.id },
      data: { content }
    });
  }

  return prisma.openAiCache.create({
    data: { kind, repoId, inputHash, model, content }
  });
}

export async function countOpenAiAnalysesToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [cachedOutputs, researchRuns] = await Promise.all([
    prisma.openAiCache.count({
      where: {
        kind: { in: [...OPENAI_DAILY_ANALYSIS_CACHE_KINDS] },
        createdAt: {
          gte: start
        }
      }
    }),
    prisma.marketResearchRun.count({
      where: {
        provider: { in: [...OPENAI_DAILY_ANALYSIS_RESEARCH_PROVIDERS] },
        status: { in: ["RUNNING", "SUCCESS", "FAILED"] },
        startedAt: {
          gte: start
        }
      }
    })
  ]);

  return cachedOutputs + researchRuns;
}

export async function getOpenAiCacheSummary(limit = 8): Promise<OpenAiCacheSummary> {
  const recentLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  const [totalEntries, kindCounts, recentEntries] = await Promise.all([
    prisma.openAiCache.count(),
    prisma.openAiCache.groupBy({
      by: ["kind"],
      _count: { _all: true }
    }),
    prisma.openAiCache.findMany({
      orderBy: { createdAt: "desc" },
      take: recentLimit,
      select: {
        id: true,
        kind: true,
        model: true,
        createdAt: true,
        repository: {
          select: { fullName: true }
        }
      }
    })
  ]);

  return {
    totalEntries,
    byKind: kindCounts
      .map((row) => ({
        kind: row.kind,
        count: row._count._all
      }))
      .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)),
    recentEntries: recentEntries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      repoFullName: entry.repository?.fullName ?? null,
      model: entry.model,
      createdAt: entry.createdAt.toISOString()
    }))
  };
}
