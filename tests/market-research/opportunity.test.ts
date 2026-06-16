import { describe, expect, it } from "vitest";
import { calculateOpportunityScore, isExcellentOpportunity } from "../../src/lib/market-research/opportunity";

describe("opportunity scoring", () => {
  it("rewards evidence, confidence, business fit and savings signals", () => {
    const score = calculateOpportunityScore({
      trendScore: 88,
      relevanceScore: 92,
      starsCurrent: 12000,
      research: {
        summary: "B2B devtools teams want to automate manual workflow and save time.",
        signals: ["teams discuss automation"],
        userProblems: ["manual deployment workflow is slow", "costly setup"],
        demandEvidence: ["developers ask for faster CI automation", "SaaS teams want lower ops cost"],
        validationRisks: [],
        confidenceScore: 4,
        sentiment: "mixed",
        sources: [
          { sourceType: "hn", title: "HN", url: "https://news.ycombinator.com/item?id=1", snippet: "workflow pain", relevanceScore: 90 },
          { sourceType: "rss", title: "RSS", url: "https://example.com/post", snippet: "automation saves time", relevanceScore: 80 },
          { sourceType: "web", title: "Web", url: "https://example.org/post", snippet: "B2B cost reduction", relevanceScore: 75 }
        ]
      }
    });

    expect(score).toBeGreaterThanOrEqual(65);
  });

  it("requires strong score, confidence, sources and business savings fit for notifications", () => {
    expect(
      isExcellentOpportunity({
        opportunityScore: 90,
        confidenceScore: 4,
        sourceCount: 3,
        text: "B2B devtools automation saves time and cost for teams"
      })
    ).toBe(true);

    expect(
      isExcellentOpportunity({
        opportunityScore: 90,
        confidenceScore: 4,
        sourceCount: 1,
        text: "B2B devtools automation saves time and cost for teams"
      })
    ).toBe(false);
  });
});
