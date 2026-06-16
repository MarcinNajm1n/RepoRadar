import { afterEach, describe, expect, it, vi } from "vitest";
import { blueskyProvider } from "../../src/lib/market-research/providers/bluesky";
import type { MarketResearchContext } from "../../src/lib/market-research/types";

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

const context: MarketResearchContext = {
  kind: "idea",
  mode: "full",
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

afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("bluesky market research provider", () => {
  it("maps public search posts into sanitized evidence sources", async () => {
    process.env.ENABLE_BLUESKY_SOURCE = "true";
    process.env.BLUESKY_PUBLIC_API_BASE = "https://public.api.bsky.app";
    process.env.MARKET_RESEARCH_MAX_SOURCES = "3";
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          posts: [
            {
              uri: "at://did:plc:test/app.bsky.feed.post/abc123",
              author: { handle: "builder.bsky.social" },
              record: {
                text: "B2B devtools teams want to automate manual workflow and save time.",
                createdAt: "2026-06-16T10:00:00.000Z"
              },
              replyCount: 2,
              repostCount: 3,
              likeCount: 10,
              quoteCount: 1
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as typeof fetch;

    const result = await blueskyProvider.research(context);

    expect(result.sources.length).toBeGreaterThanOrEqual(1);
    expect(result.sources[0]).toMatchObject({
      sourceType: "bluesky",
      publisher: "@builder.bsky.social",
      url: "https://bsky.app/profile/builder.bsky.social/post/abc123"
    });
    expect(result.sources[0].snippet).toContain("automate manual workflow");
  });
});
