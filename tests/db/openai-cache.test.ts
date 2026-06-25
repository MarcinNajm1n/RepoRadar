import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    openAiCache: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn()
    },
    marketResearchRun: {
      count: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

import { countOpenAiAnalysesToday, getOpenAiCacheSummary } from "../../src/lib/db/openai-cache";
import {
  OPENAI_DAILY_ANALYSIS_CACHE_KINDS,
  OPENAI_DAILY_ANALYSIS_RESEARCH_PROVIDERS
} from "../../src/lib/openai/token-budgets";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("countOpenAiAnalysesToday", () => {
  it("counts cached OpenAI outputs and OpenAI-backed market research runs", async () => {
    mocks.prisma.openAiCache.count.mockResolvedValue(3);
    mocks.prisma.marketResearchRun.count.mockResolvedValue(2);

    await expect(countOpenAiAnalysesToday()).resolves.toBe(5);

    expect(mocks.prisma.openAiCache.count).toHaveBeenCalledWith({
      where: {
        kind: { in: [...OPENAI_DAILY_ANALYSIS_CACHE_KINDS] },
        createdAt: { gte: expect.any(Date) }
      }
    });
    expect(mocks.prisma.marketResearchRun.count).toHaveBeenCalledWith({
      where: {
        provider: { in: [...OPENAI_DAILY_ANALYSIS_RESEARCH_PROVIDERS] },
        status: { in: ["RUNNING", "SUCCESS", "FAILED"] },
        startedAt: { gte: expect.any(Date) }
      }
    });
  });
});

describe("getOpenAiCacheSummary", () => {
  it("summarizes local cache entries by kind and maps recent rows", async () => {
    const createdAt = new Date("2026-06-20T12:00:00Z");
    const olderCreatedAt = new Date("2026-06-19T09:30:00Z");

    mocks.prisma.openAiCache.count.mockResolvedValue(3);
    mocks.prisma.openAiCache.groupBy.mockResolvedValue([
      { kind: "repo-report", _count: { _all: 1 } },
      { kind: "summary", _count: { _all: 2 } }
    ]);
    mocks.prisma.openAiCache.findMany.mockResolvedValue([
      {
        id: "cache_1",
        kind: "repo-report",
        model: "gpt-4.1-mini",
        createdAt,
        repository: { fullName: "owner/tool" }
      },
      {
        id: "cache_2",
        kind: "summary",
        model: "gpt-4.1-mini",
        createdAt: olderCreatedAt,
        repository: null
      }
    ]);

    await expect(getOpenAiCacheSummary(50)).resolves.toEqual({
      totalEntries: 3,
      byKind: [
        { kind: "summary", count: 2 },
        { kind: "repo-report", count: 1 }
      ],
      recentEntries: [
        {
          id: "cache_1",
          kind: "repo-report",
          repoFullName: "owner/tool",
          model: "gpt-4.1-mini",
          createdAt: createdAt.toISOString()
        },
        {
          id: "cache_2",
          kind: "summary",
          repoFullName: null,
          model: "gpt-4.1-mini",
          createdAt: olderCreatedAt.toISOString()
        }
      ]
    });

    expect(mocks.prisma.openAiCache.groupBy).toHaveBeenCalledWith({
      by: ["kind"],
      _count: { _all: true }
    });
    expect(mocks.prisma.openAiCache.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        model: true,
        createdAt: true,
        repository: {
          select: { fullName: true }
        }
      }
    });
  });
});
