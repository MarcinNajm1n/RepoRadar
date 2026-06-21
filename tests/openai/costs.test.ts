import { describe, expect, it } from "vitest";
import { estimateOpenAiNextActions } from "../../src/lib/openai/costs";

describe("estimateOpenAiNextActions", () => {
  it("shows larger estimates when market research is enabled", () => {
    expect(estimateOpenAiNextActions(true).report).toContain("1-2 calls");
    expect(estimateOpenAiNextActions(true).report).toContain("2400");
    expect(estimateOpenAiNextActions(true).idea).toContain("1-2 calls");
    expect(estimateOpenAiNextActions(true).idea).toContain("1600");
  });

  it("keeps deterministic research at zero when market research is disabled", () => {
    expect(estimateOpenAiNextActions(false).research).toBe("0 calls");
  });
});
