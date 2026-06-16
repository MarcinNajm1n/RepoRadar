import { afterEach, describe, expect, it } from "vitest";
import { getConfig } from "../../src/lib/config";
import { selectMarketResearchProviders } from "../../src/lib/market-research/service";
import type { MarketResearchContext } from "../../src/lib/market-research/types";

const originalEnv = { ...process.env };

const context: MarketResearchContext = {
  kind: "opportunity-candidate",
  mode: "light",
  repoId: "repo_1",
  fullName: "owner/tool",
  url: "https://github.com/owner/tool",
  description: "AI devtools automation",
  primaryLanguage: "TypeScript",
  topics: ["ai", "devtools"],
  starsCurrent: 1000,
  forksCurrent: 100,
  openIssues: 2,
  trendScore: 80,
  relevanceScore: 90,
  repositoryContext: "Repo context"
};

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("selectMarketResearchProviders", () => {
  it("selects only light-safe providers in light mode", () => {
    process.env.MARKET_RESEARCH_ENABLED = "true";
    process.env.MARKET_RESEARCH_PROVIDER = "hybrid";
    process.env.ENABLE_HN_SOURCE = "true";
    process.env.ENABLE_RSS_SOURCE = "true";
    process.env.ENABLE_OPENAI_WEB_SEARCH_SOURCE = "true";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.ENABLE_REDDIT_SOURCE = "true";
    process.env.REDDIT_CLIENT_ID = "reddit-id";
    process.env.REDDIT_CLIENT_SECRET = "reddit-secret";
    process.env.ENABLE_BLUESKY_SOURCE = "true";

    const providers = selectMarketResearchProviders(context, getConfig()).map((provider) => provider.name);

    expect(providers).toEqual(["hn", "rss", "openai-web-search"]);
  });

  it("allows opt-in full providers only in full mode with credentials", () => {
    process.env.MARKET_RESEARCH_ENABLED = "true";
    process.env.MARKET_RESEARCH_PROVIDER = "hybrid";
    process.env.ENABLE_HN_SOURCE = "false";
    process.env.ENABLE_RSS_SOURCE = "false";
    process.env.ENABLE_OPENAI_WEB_SEARCH_SOURCE = "false";
    process.env.ENABLE_REDDIT_SOURCE = "true";
    process.env.REDDIT_CLIENT_ID = "reddit-id";
    process.env.REDDIT_CLIENT_SECRET = "reddit-secret";
    process.env.ENABLE_BLUESKY_SOURCE = "true";

    const providers = selectMarketResearchProviders({ ...context, mode: "full" }, getConfig()).map((provider) => provider.name);

    expect(providers).toEqual(["reddit", "bluesky"]);
  });

  it("skips OpenAI web search when API key is missing", () => {
    process.env.MARKET_RESEARCH_ENABLED = "true";
    process.env.MARKET_RESEARCH_PROVIDER = "hybrid";
    process.env.ENABLE_HN_SOURCE = "false";
    process.env.ENABLE_RSS_SOURCE = "false";
    process.env.ENABLE_OPENAI_WEB_SEARCH_SOURCE = "true";
    delete process.env.OPENAI_API_KEY;

    const providers = selectMarketResearchProviders(context, getConfig()).map((provider) => provider.name);

    expect(providers).toEqual([]);
  });
});
