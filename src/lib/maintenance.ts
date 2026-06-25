import { prisma } from "@/lib/db/client";
import { deleteExpiredExternalResearchCache } from "@/lib/market-research/external-cache";
import { clamp } from "@/lib/utils";
import type { MaintenancePreviewSummary } from "@/types/repository";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_NOTIFICATION_LOG_DAYS_TO_KEEP = 30;
const DEFAULT_SNAPSHOT_DAYS_TO_KEEP = 180;

function notificationLogRetentionDays(daysToKeep = DEFAULT_NOTIFICATION_LOG_DAYS_TO_KEEP) {
  return Math.round(clamp(daysToKeep, 1, 365));
}

function snapshotRetentionDays(daysToKeep = DEFAULT_SNAPSHOT_DAYS_TO_KEEP) {
  return Math.round(clamp(daysToKeep, 30, 3650));
}

function retentionCutoff(now: Date, daysToKeep: number) {
  return new Date(now.getTime() - daysToKeep * MS_PER_DAY);
}

export async function getMaintenancePreview(
  options: {
    notificationLogDaysToKeep?: number;
    snapshotDaysToKeep?: number;
    now?: Date;
  } = {}
): Promise<MaintenancePreviewSummary> {
  const now = options.now ?? new Date();
  const notificationDays = notificationLogRetentionDays(options.notificationLogDaysToKeep);
  const snapshotDays = snapshotRetentionDays(options.snapshotDaysToKeep);
  const notificationCutoff = retentionCutoff(now, notificationDays);
  const snapshotCutoff = retentionCutoff(now, snapshotDays);
  const [
    expiredExternalResearchCacheEntries,
    oldNotificationLogEntries,
    oldSnapshotEntries,
    oldSnapshotRepositories,
    repositoriesWithRetainedSnapshots
  ] = await Promise.all([
    prisma.externalResearchCache.count({
      where: { expiresAt: { lt: now } }
    }),
    prisma.notificationLog.count({
      where: { createdAt: { lt: notificationCutoff } }
    }),
    prisma.repoSnapshot.count({
      where: { capturedAt: { lt: snapshotCutoff } }
    }),
    prisma.repoSnapshot.findMany({
      where: { capturedAt: { lt: snapshotCutoff } },
      distinct: ["repoId"],
      select: { repoId: true }
    }),
    prisma.repoSnapshot.findMany({
      where: { capturedAt: { gte: snapshotCutoff } },
      distinct: ["repoId"],
      select: { repoId: true }
    })
  ]);
  const affectedRepoIds = oldSnapshotRepositories.map((row) => row.repoId);
  const retainedRepoIds = new Set(repositoriesWithRetainedSnapshots.map((row) => row.repoId));

  return {
    generatedAt: now.toISOString(),
    externalResearchCache: {
      expiredEntries: expiredExternalResearchCacheEntries
    },
    notificationLogs: {
      daysToKeep: notificationDays,
      cutoff: notificationCutoff.toISOString(),
      oldEntries: oldNotificationLogEntries
    },
    snapshots: {
      daysToKeep: snapshotDays,
      cutoff: snapshotCutoff.toISOString(),
      oldEntries: oldSnapshotEntries,
      affectedRepositories: affectedRepoIds.length,
      repositoriesLosingAllSnapshots: affectedRepoIds.filter((repoId) => !retainedRepoIds.has(repoId)).length
    }
  };
}

export async function clearExpiredExternalCache() {
  const result = await deleteExpiredExternalResearchCache();
  return { deletedCount: result.count };
}

export async function clearOldNotificationLogs(daysToKeep = 30) {
  const days = notificationLogRetentionDays(daysToKeep);
  const cutoff = retentionCutoff(new Date(), days);
  const result = await prisma.notificationLog.deleteMany({
    where: {
      createdAt: { lt: cutoff }
    }
  });

  return { deletedCount: result.count, cutoff: cutoff.toISOString() };
}

export async function pruneOldSnapshots(options: { daysToKeep?: number; confirmed?: boolean } = {}) {
  if (!options.confirmed) {
    throw new Error("Snapshot pruning requires explicit confirmation.");
  }

  const days = snapshotRetentionDays(options.daysToKeep);
  const cutoff = retentionCutoff(new Date(), days);
  const result = await prisma.repoSnapshot.deleteMany({
    where: {
      capturedAt: { lt: cutoff }
    }
  });

  return { deletedCount: result.count, cutoff: cutoff.toISOString() };
}
