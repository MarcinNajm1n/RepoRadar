import { describe, expect, it } from "vitest";
import {
  fallbackWhatItProves,
  getEvidenceSummary,
  groupEvidenceSourcesForDisplay,
  sortEvidenceSources
} from "../../src/lib/display/evidence-display";
import type { EvidenceSourceItem } from "../../src/types/repository";

function source(overrides: Partial<EvidenceSourceItem> = {}): EvidenceSourceItem {
  return {
    id: "source_1",
    sourceType: "web",
    title: "Source <b>title</b>",
    url: "https://example.com/post",
    publisher: "Example",
    retrievedAt: "2026-06-16T12:00:00.000Z",
    publishedAt: null,
    snippet: "Snippet with [link](https://example.com) and &amp; entity.",
    sentiment: "positive",
    relevanceScore: 50,
    canonicalUrl: "https://example.com/post",
    sourceKey: "web:1",
    evidenceKind: "demand_signal",
    whatItProves: null,
    sourceConfidence: 50,
    sourceRank: 50,
    ...overrides
  };
}

describe("evidence display helpers", () => {
  it("groups sources, limits visible items, and cleans display text", () => {
    const groups = groupEvidenceSourcesForDisplay(
      [
        source({ id: "demand_1", sourceConfidence: 80, sourceRank: 80 }),
        source({ id: "demand_2", sourceConfidence: 70, sourceRank: 70 }),
        source({ id: "demand_3", sourceConfidence: 60, sourceRank: 60 }),
        source({ id: "risk_1", evidenceKind: "risk", title: "Risk <em>source</em>" })
      ],
      2
    );

    expect(groups.map((group) => group.key)).toEqual(["demand", "risks"]);
    expect(groups[0].visibleSources).toHaveLength(2);
    expect(groups[0].hiddenCount).toBe(1);
    expect(groups[0].visibleSources[0].displayTitle).toBe("Source title");
    expect(groups[0].visibleSources[0].displaySnippet).toContain("link");
    expect(groups[0].visibleSources[0].displayWhatItProves).toContain("popyt");
  });

  it("sorts by rank, confidence, relevance and retrieved date", () => {
    const sorted = sortEvidenceSources([
      source({ id: "low", sourceRank: 20, sourceConfidence: 90 }),
      source({ id: "high", sourceRank: 80, sourceConfidence: 10 }),
      source({ id: "middle", sourceRank: 50, sourceConfidence: 50 })
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["high", "middle", "low"]);
  });

  it("summarizes confidence, independence and mixed sentiment", () => {
    const summary = getEvidenceSummary([
      source({ id: "one", publisher: "A", sourceConfidence: 60, sentiment: "positive" }),
      source({ id: "two", publisher: "B", sourceConfidence: 80, sentiment: "negative" })
    ]);

    expect(summary.sourceCount).toBe(2);
    expect(summary.independentSourceCount).toBe(2);
    expect(summary.averageConfidence).toBe(70);
    expect(summary.hasMixedSentiment).toBe(true);
  });

  it("provides deterministic proof fallbacks", () => {
    expect(fallbackWhatItProves("pain_point")).toContain("problem");
    expect(fallbackWhatItProves(null)).toContain("kontekstu");
  });
});
