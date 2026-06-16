import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketResearchContext } from "../../src/lib/market-research/types";

const mocks = vi.hoisted(() => ({
  config: {
    marketResearchEnabled: true,
    marketResearchProvider: "hybrid",
    marketResearchMode: "light",
    marketResearchDailyLimit: 10,
    marketResearchMaxSources: 8,
    marketResearchMaxItemsPerProvider: 4,
    marketResearchMinIndependentSources: 2,
    marketResearchMinSourceConfidence: 50,
    marketResearchEnableEvidenceRanking: true,
    externalResearchCacheTtlHours: 24,
    enableHnSource: true,
    enableRssSource: true,
    enableOpenAiWebSearchSource: false,
    openAiApiKey: undefined,
    enableRedditSource: false,
    redditClientId: undefined,
    redditClientSecret: undefined,
    enableBlueskySource: false,
    mcpWebResearchServerUrl: undefined
  },
  prisma: {
    marketResearchRun: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    marketResearchSource: {
      create: vi.fn()
    },
    externalResearchCache: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    }
  },
  hnResearch: vi.fn(),
  rssResearch: vi.fn()
}));

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

vi.mock("../../src/lib/market-research/providers/hacker-news", () => ({
  hackerNewsProvider: {
    name: "hn",
    research: mocks.hnResearch
  }
}));

vi.mock("../../src/lib/market-research/providers/rss", () => ({
  rssProvider: {
    name: "rss",
    research: mocks.rssResearch
  }
}));

vi.mock("../../src/lib/market-research/providers/openai-web-search", () => ({
  openAiWebSearchProvider: {
    name: "openai-web-search",
    usesOpenAi: true,
    research: vi.fn()
  }
}));

vi.mock("../../src/lib/market-research/providers/reddit", () => ({
  redditProvider: {
    name: "reddit",
    research: vi.fn()
  }
}));

vi.mock("../../src/lib/market-research/providers/bluesky", () => ({
  blueskyProvider: {
    name: "bluesky",
    research: vi.fn()
  }
}));

vi.mock("../../src/lib/market-research/providers/mcp-web-research", () => ({
  mcpWebResearchProvider: {
    name: "mcp-web-research",
    usesOpenAi: true,
    research: vi.fn()
  }
}));

import { getMarketResearchForRepository } from "../../src/lib/market-research/service";

const context: MarketResearchContext = {
  kind: "opportunity-candidate",
  mode: "light",
  repoId: "repo_1",
  fullName: "owner/tool",
  url: "https://github.com/owner/tool",
  description: "AI devtools automation",
  primaryLanguage: "TypeScript",
  topics: ["devtools", "automation"],
  starsCurrent: 1000,
  forksCurrent: 100,
  openIssues: 4,
  trendScore: 80,
  relevanceScore: 90,
  repositoryContext: "Repo context"
};

describe("market research service aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.marketResearchRun.count.mockResolvedValue(0);
    mocks.prisma.externalResearchCache.findUnique.mockResolvedValue(null);
    mocks.prisma.externalResearchCache.upsert.mockResolvedValue({ id: "cache_1" });
    mocks.prisma.marketResearchRun.create.mockResolvedValueOnce({ id: "run_hn" }).mockResolvedValueOnce({ id: "run_rss" });
    mocks.prisma.marketResearchRun.update.mockResolvedValue({});
    mocks.prisma.marketResearchSource.create.mockResolvedValue({ id: "source_1" });
    mocks.hnResearch.mockResolvedValue({
      provider: "hn",
      summary: "HN found evidence",
      signals: ["Developers discuss automation"],
      userProblems: ["Manual workflow is slow"],
      sentiment: "mixed",
      demandEvidence: ["Looking for a tool"],
      validationRisks: [],
      confidenceScore: 3,
      sources: [
        {
          sourceType: "hn",
          title: "Looking for workflow automation",
          url: "https://news.ycombinator.com/item?id=1&utm_source=x",
          providerItemId: "1",
          publisher: "Hacker News",
          snippet: "Developers ask for a tool to automate manual workflow.",
          sentiment: "mixed",
          relevanceScore: 90
        }
      ]
    });
    mocks.rssResearch.mockRejectedValue(new Error("RSS failed"));
  });

  it("returns successful hybrid results when one provider fails and stores run metadata", async () => {
    const result = await getMarketResearchForRepository(context);

    expect(result.status).toBe("SUCCESS");
    expect(result.runIds).toEqual(["run_hn"]);
    expect(result.sourceIds).toEqual(["source_1"]);
    expect(result.independentSourceCount).toBeGreaterThanOrEqual(1);
    expect(result.evidenceSummary).toContain("zrodel");
    expect(result.sources[0]).toMatchObject({
      canonicalUrl: "https://news.ycombinator.com/item?id=1",
      sourceKey: "hn:1",
      evidenceKind: expect.any(String),
      sourceConfidence: expect.any(Number),
      sourceRank: expect.any(Number)
    });
    expect(mocks.prisma.marketResearchRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queriesJson: expect.stringContaining("workflow"),
          providersJson: JSON.stringify(["hn"])
        })
      })
    );
    expect(mocks.prisma.marketResearchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run_rss" },
        data: expect.objectContaining({ status: "FAILED" })
      })
    );
  });
});
