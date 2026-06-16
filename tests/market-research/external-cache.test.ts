import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketResearchContext } from "../../src/lib/market-research/types";

const mocks = vi.hoisted(() => ({
  prisma: {
    externalResearchCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

import {
  buildExternalResearchCacheKey,
  deleteExpiredExternalResearchCache,
  getExternalResearchCache,
  setExternalResearchCache
} from "../../src/lib/market-research/external-cache";

const context: MarketResearchContext = {
  kind: "opportunity-candidate",
  mode: "light",
  repoId: "repo_1",
  fullName: "owner/tool",
  url: "https://github.com/owner/tool",
  topics: ["ai"],
  starsCurrent: 1000,
  forksCurrent: 10,
  openIssues: 1,
  trendScore: 70,
  relevanceScore: 90,
  readmeHash: "readme_hash",
  repositoryContext: "Repo context"
};

describe("external research cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds stable cache keys from provider, mode, repo, readme and query", () => {
    const first = buildExternalResearchCacheKey("hn", context, "workflow pain");
    const second = buildExternalResearchCacheKey("hn", context, "workflow pain");
    const different = buildExternalResearchCacheKey("hn", context, "pricing");

    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });

  it("returns cached content for valid cache rows", async () => {
    mocks.prisma.externalResearchCache.findUnique.mockResolvedValue({
      contentJson: JSON.stringify({ sources: [{ title: "cached" }] }),
      expiresAt: new Date(Date.now() + 60_000)
    });

    await expect(getExternalResearchCache("hn", "key")).resolves.toEqual({ sources: [{ title: "cached" }] });
  });

  it("treats expired cache as a miss", async () => {
    mocks.prisma.externalResearchCache.findUnique.mockResolvedValue({
      contentJson: JSON.stringify({ sources: [] }),
      expiresAt: new Date(Date.now() - 60_000)
    });

    await expect(getExternalResearchCache("hn", "key")).resolves.toBeNull();
  });

  it("stores JSON content with TTL and skips empty payloads", async () => {
    mocks.prisma.externalResearchCache.upsert.mockResolvedValue({ id: "cache_1" });

    await setExternalResearchCache("hn", "key", { sources: [{ title: "cached" }] }, { mode: "light", query: "workflow", ttlHours: 2 });
    expect(mocks.prisma.externalResearchCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider: "hn",
          cacheKey: "key",
          mode: "light",
          query: "workflow",
          contentJson: expect.stringContaining("cached"),
          expiresAt: expect.any(Date)
        })
      })
    );

    vi.clearAllMocks();
    await expect(setExternalResearchCache("hn", "empty", [], { ttlHours: 2 })).resolves.toBeNull();
    expect(mocks.prisma.externalResearchCache.upsert).not.toHaveBeenCalled();
  });

  it("deletes expired cache rows", async () => {
    mocks.prisma.externalResearchCache.deleteMany.mockResolvedValue({ count: 1 });

    await deleteExpiredExternalResearchCache();
    expect(mocks.prisma.externalResearchCache.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } }
    });
  });
});
