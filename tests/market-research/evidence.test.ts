import { describe, expect, it } from "vitest";
import {
  buildSourceKey,
  canonicalizeUrl,
  classifyEvidenceKind,
  dedupeEvidenceSources,
  estimateSourceConfidence,
  normalizeSource,
  rankEvidenceSource
} from "../../src/lib/market-research/evidence";
import type { MarketResearchContext, MarketResearchSourceInput } from "../../src/lib/market-research/types";

const context: MarketResearchContext = {
  kind: "opportunity-candidate",
  mode: "full",
  repoId: "repo_1",
  fullName: "owner/tool",
  url: "https://github.com/owner/tool",
  description: "AI devtools automation",
  primaryLanguage: "TypeScript",
  topics: ["devtools", "automation"],
  starsCurrent: 1000,
  forksCurrent: 80,
  openIssues: 3,
  trendScore: 70,
  relevanceScore: 90,
  repositoryContext: "Repo context"
};

function source(overrides: Partial<MarketResearchSourceInput> = {}): MarketResearchSourceInput {
  return {
    sourceType: "hn",
    title: "Looking for a tool to automate manual workflow",
    url: "https://Example.com/post/?utm_source=x&gclid=abc",
    publisher: "Hacker News",
    publishedAt: new Date().toISOString(),
    snippet: "Developers describe slow manual workflow pain and ask how to automate it.",
    sentiment: "mixed",
    relevanceScore: 90,
    ...overrides
  };
}

describe("evidence engine", () => {
  it("canonicalizes public URLs and blocks unsafe targets", () => {
    expect(canonicalizeUrl("https://Example.com/path/?utm_source=hn&fbclid=1")).toBe("https://example.com/path");
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeUrl("file:///etc/passwd")).toBeNull();
    expect(canonicalizeUrl("http://localhost:3000")).toBeNull();
    expect(canonicalizeUrl("http://192.168.1.1/router")).toBeNull();
  });

  it("builds stable source keys from provider IDs or canonical URLs", () => {
    expect(buildSourceKey(source({ providerItemId: "123" }), "hn")).toBe("hn:123");
    expect(buildSourceKey(source({ sourceType: "reddit", providerItemId: "abc" }), "reddit")).toBe("reddit:abc");
    expect(buildSourceKey(source({ sourceType: "bluesky", providerItemId: "at://did/app.bsky.feed.post/x" }), "bluesky")).toBe(
      "bluesky:at://did/app.bsky.feed.post/x"
    );
    expect(buildSourceKey(source({ providerItemId: null }), "rss")).toBe("url:https://example.com/post");
    expect(buildSourceKey(source({ providerItemId: null, url: "bad-url" }), "rss")).toContain("fingerprint:");
  });

  it("classifies evidence kinds with deterministic keywords", () => {
    expect(classifyEvidenceKind(source({ title: "Problem pain is slow", snippet: "Broken missing setup is hard." }), context)).toBe("pain_point");
    expect(classifyEvidenceKind(source({ title: "Looking for recommendation need tool" }), context)).toBe("demand_signal");
    expect(classifyEvidenceKind(source({ title: "Manual spreadsheet copy paste process", snippet: "Spreadsheet copy paste process." }), context)).toBe(
      "manual_workflow"
    );
    expect(classifyEvidenceKind(source({ title: "Pricing is expensive paid subscription" }), context)).toBe("pricing");
    expect(classifyEvidenceKind(source({ title: "Security privacy compliance risk" }), context)).toBe("risk");
  });

  it("scores high-quality fresh evidence above weak stale hype", () => {
    const strong = estimateSourceConfidence(source(), context);
    const weak = estimateSourceConfidence(
      source({
        sourceType: "bluesky",
        title: "Viral hype",
        snippet: "buzz",
        publishedAt: "2020-01-01",
        relevanceScore: 20
      }),
      context
    );

    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(60);
    expect(weak).toBeGreaterThanOrEqual(0);
    expect(weak).toBeLessThanOrEqual(100);
  });

  it("normalizes, dedupes and respects provider limits", () => {
    const normalized = normalizeSource(source({ providerItemId: "1" }), "hn", context);
    expect(normalized?.canonicalUrl).toBe("https://example.com/post");
    expect(normalized?.sourceKey).toBe("hn:1");
    expect(normalized?.whatItProves).toBeTruthy();

    const deduped = dedupeEvidenceSources(
      [
        source({ providerItemId: "1", relevanceScore: 80 }),
        source({ providerItemId: "1", relevanceScore: 95 }),
        source({ sourceType: "rss", url: "https://example.org/a?utm_medium=x", title: "Need tool", relevanceScore: 70 }),
        source({ sourceType: "rss", url: "https://example.org/b", title: "Manual workflow", relevanceScore: 65 }),
        source({ sourceType: "rss", url: "https://example.org/c", title: "Pricing pain", relevanceScore: 60 })
      ],
      { maxSources: 3, maxPerProvider: 2, context }
    );

    expect(deduped).toHaveLength(3);
    expect(deduped.filter((item) => item.sourceType === "rss")).toHaveLength(2);
    expect(new Set(deduped.map((item) => item.sourceKey)).size).toBe(3);
  });

  it("keeps invalid runtime relevance scores out of confidence and ranking", () => {
    const normalized = normalizeSource(source({ relevanceScore: "bad" as unknown as number }), "hn", context);
    const infinite = normalizeSource(source({ relevanceScore: Number.POSITIVE_INFINITY }), "hn", context);
    const blank = normalizeSource(source({ relevanceScore: "  " as unknown as number }), "hn", context);

    expect(normalized?.relevanceScore).toBeNull();
    expect(infinite?.relevanceScore).toBeNull();
    expect(blank?.relevanceScore).toBeNull();
    expect(normalized?.sourceConfidence).toEqual(expect.any(Number));
    expect(normalized?.sourceRank).toEqual(expect.any(Number));
    expect(Number.isFinite(normalized?.sourceConfidence)).toBe(true);
    expect(Number.isFinite(normalized?.sourceRank)).toBe(true);
  });

  it("parses and clamps numeric runtime relevance score strings", () => {
    const normalized = normalizeSource(source({ relevanceScore: "105.8" as unknown as number }), "hn", context);

    expect(normalized?.relevanceScore).toBe(100);
  });

  it("defaults missing runtime source types and revalidates canonical URL keys", () => {
    const normalized = normalizeSource(source({ sourceType: undefined as unknown as string }), undefined as unknown as string, context);

    expect(normalized?.sourceType).toBe("web");
    expect(normalized?.sourceRank).toEqual(expect.any(Number));
    expect(Number.isFinite(normalized?.sourceRank)).toBe(true);
    expect(buildSourceKey(source({ providerItemId: null, canonicalUrl: "javascript:alert(1)" }))).toBe("url:https://example.com/post");
  });

  it("keeps invalid runtime confidence scores out of direct ranking", () => {
    const rank = rankEvidenceSource(
      source({
        sourceConfidence: Number.POSITIVE_INFINITY,
        relevanceScore: "80" as unknown as number
      })
    );

    expect(rank).toEqual(expect.any(Number));
    expect(Number.isFinite(rank)).toBe(true);
  });
});
