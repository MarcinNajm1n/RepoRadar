import { prisma } from "@/lib/db/client";
import { deleteExpiredExternalResearchCache } from "@/lib/market-research/external-cache";
import { clamp } from "@/lib/utils";

export async function clearExpiredExternalCache() {
  const result = await deleteExpiredExternalResearchCache();
  return { deletedCount: result.count };
}

export async function clearOldNotificationLogs(daysToKeep = 30) {
  const days = Math.round(clamp(daysToKeep, 1, 365));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
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

  const days = Math.round(clamp(options.daysToKeep ?? 180, 30, 3650));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.repoSnapshot.deleteMany({
    where: {
      capturedAt: { lt: cutoff }
    }
  });

  return { deletedCount: result.count, cutoff: cutoff.toISOString() };
}
