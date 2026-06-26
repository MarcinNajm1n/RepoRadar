import { describe, expect, it } from "vitest";
import { parseMarketResearchResult } from "../../src/lib/market-research/parser";

describe("parseMarketResearchResult", () => {
  it("sanitizes and limits evidence sources", () => {
    const result = parseMarketResearchResult(
      "openai-web-search",
      JSON.stringify({
        summary: "Demand signal",
        signals: ["teams complain about setup"],
        sentiment: "mixed",
        confidenceScore: 4,
        sources: [
          {
            sourceType: "reddit",
            title: "Discussion",
            url: "https://www.reddit.com/r/devtools/comments/1",
            snippet: "Users discuss workflow gaps.",
            sentiment: "mixed",
            relevanceScore: 88,
            evidenceKind: "pain_point",
            whatItProves: "Users have workflow pain.",
            sourceConfidence: 70,
            sourceRank: 95,
            providerItemId: "post_1"
          },
          {
            sourceType: "x",
            title: "Bad URL",
            url: "javascript:alert(1)",
            snippet: "Should be ignored."
          }
        ]
      }),
      1
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].url).toBe("https://www.reddit.com/r/devtools/comments/1");
    expect(result.sources[0].evidenceKind).toBe("pain_point");
    expect(result.sources[0].whatItProves).toBe("Users have workflow pain.");
    expect(result.sources[0].sourceConfidence).toBe(70);
    expect(result.sources[0].sourceRank).toBe(95);
    expect(result.sources[0].providerItemId).toBe("post_1");
    expect(result.confidenceScore).toBe(4);
  });

  it("keeps blank and non-finite numeric fields as missing data", () => {
    const result = parseMarketResearchResult(
      "openai-web-search",
      JSON.stringify({
        summary: "Demand signal",
        confidenceScore: " ",
        independentSourceCount: "Infinity",
        sources: [
          {
            sourceType: "web",
            title: "Discussion",
            url: "https://example.com/post",
            snippet: "Users discuss workflow gaps.",
            relevanceScore: "",
            sourceConfidence: "NaN",
            sourceRank: "205.4"
          }
        ]
      }),
      1
    );

    expect(result.confidenceScore).toBeNull();
    expect(result.independentSourceCount).toBeUndefined();
    expect(result.sources[0]).toMatchObject({
      relevanceScore: null,
      sourceConfidence: null,
      sourceRank: 200
    });
  });

  it("drops non-string text values instead of stringifying provider JSON objects", () => {
    const result = parseMarketResearchResult(
      "openai-web-search",
      JSON.stringify({
        summary: { text: "should not stringify" },
        signals: ["  valid signal  ", 42, { text: "invalid" }, "bad\u0000signal"],
        userProblems: [false, " manual  work "],
        sentiment: { tone: "mixed" },
        demandEvidence: [null, " demand "],
        validationRisks: [{ text: "invalid" }, " risk "],
        evidenceSummary: { text: "invalid" },
        conflictSummary: 12,
        sources: [
          {
            sourceType: "web",
            title: { text: "object title" },
            url: "https://example.com/object-title",
            snippet: "Snippet"
          },
          {
            sourceType: "web",
            title: "Object URL",
            url: { href: "https://example.com/object-url" },
            snippet: "Snippet"
          },
          {
            sourceType: "web",
            title: "Object snippet",
            url: "https://example.com/object-snippet",
            snippet: { text: "object snippet" }
          },
          {
            sourceType: { text: "web" },
            title: " Good source ",
            url: "https://example.com/good",
            snippet: " Good snippet ",
            publisher: { name: "Publisher" },
            publishedAt: { date: "2026-06-26" },
            sentiment: 42,
            canonicalUrl: { href: "https://example.com/good" },
            sourceKey: ["bad"],
            evidenceKind: " pain_point ",
            whatItProves: " proves\u0000value ",
            providerItemId: 42
          }
        ]
      }),
      10
    );

    expect(result.summary).not.toContain("[object Object]");
    expect(result.signals).toEqual(["valid signal", "badsignal"]);
    expect(result.userProblems).toEqual(["manual work"]);
    expect(result.sentiment).toBe("neutral");
    expect(result.demandEvidence).toEqual(["demand"]);
    expect(result.validationRisks).toEqual(["risk"]);
    expect(result.evidenceSummary).toBeNull();
    expect(result.conflictSummary).toBeNull();
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      sourceType: "web",
      title: "Good source",
      url: "https://example.com/good",
      snippet: "Good snippet",
      publisher: null,
      publishedAt: null,
      sentiment: null,
      canonicalUrl: null,
      sourceKey: null,
      evidenceKind: "pain_point",
      whatItProves: "provesvalue",
      providerItemId: null
    });
  });
});
