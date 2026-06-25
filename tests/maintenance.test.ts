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

import { getMaintenancePreview } from "../src/lib/maintenance";

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
});
