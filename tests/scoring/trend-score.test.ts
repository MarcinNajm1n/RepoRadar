import { describe, expect, it, vi } from "vitest";
import { calculateTrendScore } from "../../src/lib/scoring/trend-score";

vi.mock("@/lib/config", () => ({
  getConfig: () => ({
    minStars: 1000,
    oldRepoAgeMonths: 7,
    newRepoMaxAgeMonths: 7,
    minWeeklyStarGrowthAbsolute: 200
  })
}));

describe("calculateTrendScore", () => {
  it("does not reward tiny percentage growth like mature absolute growth", () => {
    const tiny = calculateTrendScore({
      starsCurrent: 51,
      forksCurrent: 2,
      createdAt: new Date("2026-06-01T00:00:00Z"),
      pushedAt: new Date(),
      topics: ["ai", "agent"],
      description: "AI agent",
      readmeExcerpt: "install usage example",
      growth7d: 50,
      growthPercent7d: 5000,
      starsBefore7d: 1
    });

    const mature = calculateTrendScore({
      starsCurrent: 3000,
      forksCurrent: 300,
      createdAt: new Date("2026-04-01T00:00:00Z"),
      pushedAt: new Date(),
      topics: ["ai", "agent"],
      description: "AI agent",
      readmeExcerpt: "install usage example",
      growth7d: 2000,
      growthPercent7d: 200,
      starsBefore7d: 1000
    });

    expect(mature.trendScore).toBeGreaterThan(tiny.trendScore);
  });

  it("marks old repositories as hot when strong growth returns", () => {
    const result = calculateTrendScore({
      starsCurrent: 5000,
      forksCurrent: 400,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      pushedAt: new Date(),
      topics: ["mcp", "developer-tools"],
      description: "MCP bridge for developer tools",
      readmeExcerpt: "install usage examples",
      growth7d: 350,
      growthPercent7d: 8,
      starsBefore7d: 4650
    });

    expect(result.isOldRepo).toBe(true);
    expect(result.status).toBe("HOT");
  });

  it("uses baseline-only initial traction when no local history exists", () => {
    const result = calculateTrendScore({
      starsCurrent: 6000,
      forksCurrent: 500,
      createdAt: new Date("2026-05-01T00:00:00Z"),
      pushedAt: new Date(),
      topics: ["llm", "rag"],
      description: "LLM RAG app",
      readmeExcerpt: "install usage examples",
      growth7d: null,
      growthPercent7d: null,
      starsBefore7d: null
    });

    expect(result.trendScore).toBeGreaterThan(0);
    expect(result.components.percentageGrowthScore).toBe(0);
  });
});
