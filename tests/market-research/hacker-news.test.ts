import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchJsonWithTimeout: vi.fn()
}));

vi.mock("../../src/lib/market-research/providers/http", () => ({
  fetchJsonWithTimeout: mocks.fetchJsonWithTimeout
}));

import { hackerNewsProvider } from "../../src/lib/market-research/providers/hacker-news";
import type { MarketResearchContext } from "../../src/lib/market-research/types";

const originalEnv = { ...process.env };

const context: MarketResearchContext = {
  kind: "idea",
  mode: "light",
  repoId: "repo_1",
  fullName: "owner/reporadar",
  url: "https://github.com/owner/reporadar",
  description: "AI devtools automation",
  primaryLanguage: "TypeScript",
  topics: ["ai", "devtools", "automation"],
  starsCurrent: 1200,
  forksCurrent: 50,
  openIssues: 3,
  trendScore: 80,
  relevanceScore: 90,
  readmeHash: "hash",
  readmeExcerpt: "README",
  repositoryContext: "Repo context"
};

beforeEach(() => {
  mocks.fetchJsonWithTimeout.mockReset();
  process.env.ENABLE_HN_SOURCE = "true";
  process.env.MARKET_RESEARCH_MAX_SOURCES = "1";
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("hackerNewsProvider", () => {
  it("ignores invalid dates and non-numeric score metadata from Algolia hits", async () => {
    mocks.fetchJsonWithTimeout.mockResolvedValue({
      hits: [
        "not-a-hit",
        {
          objectID: "123",
          title: "Workflow automation pain",
          url: "https://example.com/workflow",
          author: { name: "bad" },
          created_at: "not-a-date",
          points: "200",
          num_comments: Number.POSITIVE_INFINITY,
          story_text: "Teams want less manual release work."
        }
      ]
    });

    const result = await hackerNewsProvider.research(context);

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      providerItemId: "123",
      publisher: "Hacker News",
      publishedAt: null,
      relevanceScore: 45
    });
    expect(result.sources[0].snippet).toBe("Teams want less manual release work.");
  });

  it("does not stringify object ids into fallback Hacker News URLs", async () => {
    mocks.fetchJsonWithTimeout.mockResolvedValue({
      hits: [
        {
          objectID: { id: "123" },
          title: "Missing direct URL",
          story_text: "No safe URL should skip this hit."
        }
      ]
    });

    const result = await hackerNewsProvider.research(context);

    expect(result.sources).toHaveLength(0);
  });
});
