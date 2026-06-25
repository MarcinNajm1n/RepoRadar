import { describe, expect, it } from "vitest";
import { buildOpenAiResponsesBody } from "../../src/lib/openai/client";
import {
  applyOpenAiActionBudget,
  formatOpenAiBudgetBadgeLabel,
  formatOpenAiBudgetCommandDescription,
  formatOpenAiBudgetLabel,
  getOpenAiActionBudget,
  getOpenAiActionOptions
} from "../../src/lib/openai/token-budgets";

describe("OpenAI action token budgets", () => {
  it("defines explicit budgets for expensive actions", () => {
    expect(getOpenAiActionBudget("summary").maxOutputTokens).toBeLessThan(getOpenAiActionBudget("repo-report").maxOutputTokens);
    expect(getOpenAiActionBudget("weekly-report").expectedCalls).toBe("0 calls");
  });

  it("truncates oversized action context before it reaches OpenAI", () => {
    const input = "x".repeat(getOpenAiActionBudget("summary").maxInputChars + 100);

    const budgeted = applyOpenAiActionBudget(input, "summary");

    expect(budgeted.length).toBeLessThan(input.length);
    expect(budgeted).toContain("context truncated");
  });

  it("passes max_output_tokens into Responses API body", () => {
    const body = buildOpenAiResponsesBody("model", "instructions", "input", getOpenAiActionOptions("summary"));

    expect(body).toMatchObject({ max_output_tokens: getOpenAiActionBudget("summary").maxOutputTokens });
  });

  it("formats short Polish UI labels from the shared budget source", () => {
    const reportBudget = getOpenAiActionBudget("repo-report");
    const weeklyBudget = getOpenAiActionBudget("weekly-report");
    const reportCalls = reportBudget.expectedCalls.replace(/\s*calls?$/, "");
    const weeklyCalls = weeklyBudget.expectedCalls.replace(/\s*calls?$/, "");

    expect(formatOpenAiBudgetLabel("repo-report")).toBe(`${reportCalls} wyw. / ${reportBudget.maxOutputTokens} tok.`);
    expect(formatOpenAiBudgetLabel("repo-report", { marketResearchEnabled: false })).toBe(
      `1 wyw. / ${reportBudget.maxOutputTokens} tok.`
    );
    expect(formatOpenAiBudgetBadgeLabel("repo-report")).toBe(`AI: ${reportCalls} wyw. / ${reportBudget.maxOutputTokens} tok.`);
    expect(formatOpenAiBudgetCommandDescription("weekly-report")).toBe(`Budzet AI: ${weeklyCalls} wyw.`);
  });
});
