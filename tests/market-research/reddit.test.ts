import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redditProvider } from "../../src/lib/market-research/providers/reddit";
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

beforeEach(() => {
  process.env.ENABLE_REDDIT_SOURCE = "true";
  process.env.REDDIT_CLIENT_ID = "reddit-id";
  process.env.REDDIT_CLIENT_SECRET = "reddit-secret";
  process.env.REDDIT_USER_AGENT = "RepoRadarTest/0.1";
  process.env.MARKET_RESEARCH_MAX_SOURCES = "3";
});

afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("redditProvider", () => {
  it("rejects OAuth responses with non-string access tokens", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ access_token: { token: "bad" } }), { status: 200 })) as typeof fetch;

    await expect(redditProvider.research(context)).rejects.toThrow("Reddit OAuth failed");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized OAuth responses before parsing them", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ access_token: "ignored" }), {
          status: 200,
          headers: {
            "content-length": "64001"
          }
        })
    ) as typeof fetch;

    await expect(redditProvider.research(context)).rejects.toThrow("Reddit response exceeds 64000 bytes");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("drops unsafe result URLs and sanitizes invalid Reddit metadata", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              children: [
                "not-a-child",
                {
                  data: {
                    title: "Bad URL",
                    permalink: { path: "/r/devtools/comments/bad" },
                    selftext: "This should be skipped."
                  }
                },
                {
                  data: {
                    title: " Workflow automation pain ",
                    permalink: "/r/devtools/comments/abc123/workflow_automation_pain/",
                    subreddit_name_prefixed: { name: "bad" },
                    selftext: " Teams want less manual release work. ",
                    id: { id: "abc123" },
                    created_utc: Number.POSITIVE_INFINITY,
                    score: "200",
                    num_comments: { count: 3 }
                  }
                }
              ]
            }
          }),
          { status: 200 }
        )
      ) as typeof fetch;

    const result = await redditProvider.research(context);

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      title: "Workflow automation pain",
      url: "https://www.reddit.com/r/devtools/comments/abc123/workflow_automation_pain/",
      providerItemId: "/r/devtools/comments/abc123/workflow_automation_pain/",
      publisher: "Reddit",
      publishedAt: null,
      snippet: "Teams want less manual release work.",
      relevanceScore: 60
    });
    expect(result.sources[0].snippet).not.toContain("[object Object]");
  });

  it("rejects oversized search responses before parsing them", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { children: [] } }), {
          status: 200,
          headers: {
            "content-length": "700001"
          }
        })
      ) as typeof fetch;

    await expect(redditProvider.research(context)).rejects.toThrow("Reddit response exceeds 700000 bytes");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
