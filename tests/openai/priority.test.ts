import { describe, expect, it } from "vitest";
import { isAiPriorityRepository } from "../../src/lib/openai/priority";

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
});
