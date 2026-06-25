import { describe, expect, it } from "vitest";
import { buildAiPriorityRepositoryWhere, getAiPriorityReasons, isAiPriorityRepository } from "../../src/lib/openai/priority";

describe("isAiPriorityRepository", () => {
  it("prioritizes high trend score repositories", () => {
    expect(isAiPriorityRepository({ trendScore: 80, status: "NEW" })).toBe(true);
  });

  it("prioritizes manually saved repositories", () => {
    expect(isAiPriorityRepository({ trendScore: 10, status: "SAVED" })).toBe(true);
  });

  it("prioritizes fresh growth repositories", () => {
    expect(isAiPriorityRepository({ trendScore: 20, status: "NEW", growth7d: 30 })).toBe(true);
  });

  it("skips low-signal repositories", () => {
    expect(isAiPriorityRepository({ trendScore: 20, status: "NEW", growth24h: 0, growth7d: 0 })).toBe(false);
  });

  it("explains all matching priority reasons", () => {
    expect(getAiPriorityReasons({ trendScore: 82, status: "SAVED", growth24h: 12, growth7d: 30 }).map((reason) => reason.id)).toEqual([
      "trend",
      "manual_status",
      "growth_24h",
      "growth_7d"
    ]);
  });

  it("uses denormalized growth fields for automatic priority queries", () => {
    expect(buildAiPriorityRepositoryWhere()).toEqual({
      OR: [
        { trendScore: { gte: 70 } },
        { status: { in: ["SAVED", "IDEA", "ANALYZED"] } },
        { growth24h: { gte: 10 } },
        { growth7d: { gte: 25 } }
      ]
    });
  });
});
