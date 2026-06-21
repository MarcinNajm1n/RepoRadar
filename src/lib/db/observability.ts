import { getGitHubRuntimeCacheStats } from "@/lib/github/client";
import type { ObservabilitySummary } from "@/types/repository";
import { prisma } from "./client";

export type ScanRunObservabilityRecord = {
  startedAt: Date;
  finishedAt: Date | null;
  status: string;
  reposFound: number;
  reposUpdated: number;
  errorMessage: string | null;
};

function durationMs(scan: ScanRunObservabilityRecord) {
  if (!scan.finishedAt) {
    return null;
  }

  return Math.max(0, scan.finishedAt.getTime() - scan.startedAt.getTime());
}

export function buildScanObservability(scanRuns: ScanRunObservabilityRecord[], now = new Date()) {
  const lastScan = scanRuns[0] ?? null;
  const finishedDurations = scanRuns.map(durationMs).filter((value): value is number => value !== null);
  const since24h = now.getTime() - 24 * 60 * 60 * 1000;

  return {
    lastScan: lastScan
      ? {
          status: lastScan.status,
          startedAt: lastScan.startedAt.toISOString(),
          finishedAt: lastScan.finishedAt?.toISOString() ?? null,
          durationMs: durationMs(lastScan),
          reposFound: lastScan.reposFound,
          reposUpdated: lastScan.reposUpdated,
          errorMessage: lastScan.errorMessage
        }
      : null,
    recentScanCount: scanRuns.length,
    failedScans24h: scanRuns.filter((scan) => scan.status === "FAILED" && scan.startedAt.getTime() >= since24h).length,
    averageScanDurationMs: finishedDurations.length
      ? Math.round(finishedDurations.reduce((sum, value) => sum + value, 0) / finishedDurations.length)
      : null
  };
}

export async function getObservabilitySummary(): Promise<ObservabilitySummary> {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [scanRuns, totalRepositories, openAiCacheEntries, externalResearchCacheEntries, expiredExternalResearchCacheEntries, marketResearchRuns24h, marketResearchSources24h] =
    await Promise.all([
      prisma.scanRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          startedAt: true,
          finishedAt: true,
          status: true,
          reposFound: true,
          reposUpdated: true,
          errorMessage: true
        }
      }),
      prisma.repository.count({ where: { isDeletedFromView: false } }),
      prisma.openAiCache.count(),
      prisma.externalResearchCache.count(),
      prisma.externalResearchCache.count({ where: { expiresAt: { lt: now } } }),
      prisma.marketResearchRun.count({ where: { startedAt: { gte: since24h } } }),
      prisma.marketResearchSource.count({ where: { retrievedAt: { gte: since24h } } })
    ]);
  const scanSummary = buildScanObservability(scanRuns, now);

  return {
    ...scanSummary,
    totalRepositories,
    openAiCacheEntries,
    externalResearchCacheEntries,
    expiredExternalResearchCacheEntries,
    marketResearchRuns24h,
    marketResearchSources24h,
    githubRuntime: getGitHubRuntimeCacheStats()
  };
}
