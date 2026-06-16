import { describe, expect, it } from "vitest";
import {
  calculateOpportunityScore,
  calculateOpportunityScoreWithBreakdown,
  isExcellentOpportunity
} from "../../src/lib/market-research/opportunity";

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

  it("returns a stable 0-100 score with business-focused breakdown", () => {
    const result = calculateOpportunityScoreWithBreakdown({
      trendScore: 10,
      relevanceScore: 10,
      starsCurrent: 50,
      research: {
        summary: "B2B team has manual workflow pain and wants to save cost.",
        signals: ["internal automation request"],
        userProblems: ["manual reporting is slow"],
        demandEvidence: ["teams compare alternatives pricing"],
        validationRisks: ["crowded alternatives"],
        confidenceScore: 4,
        sentiment: "mixed",
        sources: [
          { sourceType: "hn", title: "HN", url: "https://news.ycombinator.com/item?id=2", snippet: "manual workflow pain", relevanceScore: 90 },
          { sourceType: "rss", title: "RSS", url: "https://example.com/rss", snippet: "save time", relevanceScore: 80 },
          { sourceType: "web", title: "Web", url: "https://example.com/web", snippet: "B2B automation", relevanceScore: 70 }
        ]
      }
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown.sourcePoints).toBeGreaterThan(0);
    expect(result.breakdown.confidencePoints).toBeGreaterThan(0);
    expect(result.breakdown.b2bFitPoints).toBeGreaterThan(0);
    expect(result.breakdown.timeSavingPoints).toBeGreaterThan(0);
    expect(result.breakdown.evidenceQualityPoints).toBeGreaterThan(0);
    expect(result.breakdown.competitionPenalty).toBeLessThanOrEqual(0);
  });

  it("blocks excellent opportunity notifications when evidence quality is weak", () => {
    const text = "B2B devtools automation saves time and cost for teams";

    expect(
      isExcellentOpportunity({
        opportunityScore: 90,
        confidenceScore: 4,
        sourceCount: 3,
        independentSourceCount: 1,
        averageSourceConfidence: 80,
        text
      })
    ).toBe(false);

    expect(
      isExcellentOpportunity({
        opportunityScore: 90,
        confidenceScore: 4,
        sourceCount: 3,
        independentSourceCount: 3,
        averageSourceConfidence: 30,
        text
      })
    ).toBe(false);
  });
});
