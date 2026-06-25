import { describe, expect, it } from "vitest";
import { estimateOpenAiNextActions } from "../../src/lib/openai/costs";
import { getOpenAiActionBudget } from "../../src/lib/openai/token-budgets";

describe("estimateOpenAiNextActions", () => {
  it("shows larger estimates when market research is enabled", () => {
    const reportBudget = getOpenAiActionBudget("repo-report");
    const ideaBudget = getOpenAiActionBudget("idea");

    expect(estimateOpenAiNextActions(true).report).toContain("1-2 wyw.");
    expect(estimateOpenAiNextActions(true).report).toContain(String(reportBudget.maxOutputTokens));
    expect(estimateOpenAiNextActions(true).idea).toContain("1-2 wyw.");
    expect(estimateOpenAiNextActions(true).idea).toContain(String(ideaBudget.maxOutputTokens));
  });

  it("keeps deterministic research at zero when market research is disabled", () => {
    expect(estimateOpenAiNextActions(false).report).toContain("1 wyw.");
    expect(estimateOpenAiNextActions(false).idea).toContain("1 wyw.");
    expect(estimateOpenAiNextActions(false).research).toBe("wylaczone");
  });
});
