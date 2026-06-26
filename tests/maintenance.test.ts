import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    externalResearchCache: {
      count: vi.fn(),
      deleteMany: vi.fn()
    },
    notificationLog: {
      count: vi.fn(),
      deleteMany: vi.fn()
    },
    repoSnapshot: {
      count: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

import { clearExpiredExternalCache, clearOldNotificationLogs, getMaintenancePreview, pruneOldSnapshots } from "../src/lib/maintenance";

describe("maintenance preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts dry-run cleanup impact without deleting local records", async () => {
    const now = new Date("2026-06-25T12:00:00.000Z");
    const notificationCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const snapshotCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    mocks.prisma.externalResearchCache.count.mockResolvedValue(3);
    mocks.prisma.notificationLog.count.mockResolvedValue(4);
    mocks.prisma.repoSnapshot.count.mockResolvedValue(12);
    mocks.prisma.repoSnapshot.findMany
      .mockResolvedValueOnce([{ repoId: "repo_a" }, { repoId: "repo_b" }])
      .mockResolvedValueOnce([{ repoId: "repo_b" }]);

    const preview = await getMaintenancePreview({ now });

    expect(preview).toEqual({
      generatedAt: now.toISOString(),
      externalResearchCache: {
        expiredEntries: 3
      },
      notificationLogs: {
        daysToKeep: 30,
        cutoff: notificationCutoff.toISOString(),
        oldEntries: 4
      },
      snapshots: {
        daysToKeep: 180,
        cutoff: snapshotCutoff.toISOString(),
        oldEntries: 12,
        affectedRepositories: 2,
        repositoriesLosingAllSnapshots: 1
      }
    });
    expect(mocks.prisma.externalResearchCache.count).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(mocks.prisma.notificationLog.count).toHaveBeenCalledWith({ where: { createdAt: { lt: notificationCutoff } } });
    expect(mocks.prisma.repoSnapshot.count).toHaveBeenCalledWith({ where: { capturedAt: { lt: snapshotCutoff } } });
    expect(mocks.prisma.repoSnapshot.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.notificationLog.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.externalResearchCache.deleteMany).not.toHaveBeenCalled();
  });

  it("handles zero affected snapshot repositories without destructive work", async () => {
    mocks.prisma.externalResearchCache.count.mockResolvedValue(0);
    mocks.prisma.notificationLog.count.mockResolvedValue(0);
    mocks.prisma.repoSnapshot.count.mockResolvedValue(0);
    mocks.prisma.repoSnapshot.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ repoId: "repo_recent" }]);

    const preview = await getMaintenancePreview({ now: new Date("2026-06-25T12:00:00.000Z") });

    expect(preview.snapshots.affectedRepositories).toBe(0);
    expect(preview.snapshots.repositoriesLosingAllSnapshots).toBe(0);
    expect(mocks.prisma.repoSnapshot.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.repoSnapshot.deleteMany).not.toHaveBeenCalled();
  });

  it("requires strict boolean confirmation before clearing expired external research cache", async () => {
    await expect(clearExpiredExternalCache({ confirmed: "true" } as unknown as { confirmed?: boolean })).rejects.toThrow(
      "External research cache cleanup requires explicit confirmation"
    );

    expect(mocks.prisma.externalResearchCache.deleteMany).not.toHaveBeenCalled();
  });

  it("clears expired external research cache only after explicit confirmation", async () => {
    mocks.prisma.externalResearchCache.deleteMany.mockResolvedValue({ count: 3 });

    await expect(clearExpiredExternalCache({ confirmed: true })).resolves.toEqual({ deletedCount: 3 });

    expect(mocks.prisma.externalResearchCache.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: expect.any(Date) }
      }
    });
  });

  it("requires strict boolean confirmation before clearing old notification logs", async () => {
    await expect(
      clearOldNotificationLogs({ daysToKeep: 45, confirmed: 1 } as unknown as { daysToKeep?: number; confirmed?: boolean })
    ).rejects.toThrow("Notification log cleanup requires explicit confirmation");

    expect(mocks.prisma.notificationLog.deleteMany).not.toHaveBeenCalled();
  });

  it("clears old notification logs only after explicit confirmation", async () => {
    mocks.prisma.notificationLog.deleteMany.mockResolvedValue({ count: 4 });

    await expect(clearOldNotificationLogs({ daysToKeep: 45, confirmed: true })).resolves.toMatchObject({ deletedCount: 4 });

    expect(mocks.prisma.notificationLog.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: { lt: expect.any(Date) }
      }
    });
  });

  it("requires strict boolean confirmation before pruning snapshots", async () => {
    await expect(
      pruneOldSnapshots({ daysToKeep: 180, confirmed: "true" } as unknown as { daysToKeep?: number; confirmed?: boolean })
    ).rejects.toThrow("Snapshot pruning requires explicit confirmation");

    expect(mocks.prisma.repoSnapshot.deleteMany).not.toHaveBeenCalled();
  });

  it("prunes snapshots only after explicit confirmation", async () => {
    mocks.prisma.repoSnapshot.deleteMany.mockResolvedValue({ count: 6 });

    await expect(pruneOldSnapshots({ daysToKeep: 365, confirmed: true })).resolves.toMatchObject({ deletedCount: 6 });

    expect(mocks.prisma.repoSnapshot.deleteMany).toHaveBeenCalledWith({
      where: {
        capturedAt: { lt: expect.any(Date) }
      }
    });
  });
});
