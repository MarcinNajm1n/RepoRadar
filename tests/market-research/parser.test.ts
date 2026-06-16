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
});
