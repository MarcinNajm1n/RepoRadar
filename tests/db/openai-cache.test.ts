import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    openAiCache: {
      count: vi.fn()
    },
    marketResearchRun: {
      count: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

import { countOpenAiAnalysesToday } from "../../src/lib/db/openai-cache";
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
