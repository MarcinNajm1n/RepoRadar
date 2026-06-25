export type OpenAiActionBudgetKey =
  | "summary"
  | "repo-report"
  | "idea"
  | "idea-promote"
  | "opportunity-research"
  | "weekly-report";

export type OpenAiActionKind = OpenAiActionBudgetKey;

export type OpenAiActionBudget = {
  key: OpenAiActionBudgetKey;
  label: string;
  maxInputChars: number;
  maxOutputTokens: number;
  expectedCalls: string;
  expectedCallsWithoutResearch?: string;
};

export const OPENAI_ACTION_BUDGETS: Record<OpenAiActionBudgetKey, OpenAiActionBudget> = {
  summary: {
    key: "summary",
    label: "Summary",
    maxInputChars: 12000,
    maxOutputTokens: 350,
    expectedCalls: "1 call"
  },
  "repo-report": {
    key: "repo-report",
    label: "Full report",
    maxInputChars: 28000,
    maxOutputTokens: 2400,
    expectedCalls: "1-2 calls",
    expectedCallsWithoutResearch: "1 call"
  },
  idea: {
    key: "idea",
    label: "Idea",
    maxInputChars: 22000,
    maxOutputTokens: 1600,
    expectedCalls: "1-2 calls",
    expectedCallsWithoutResearch: "1 call"
  },
  "idea-promote": {
    key: "idea-promote",
    label: "Idea promotion",
    maxInputChars: 24000,
    maxOutputTokens: 1800,
    expectedCalls: "1-2 calls",
    expectedCallsWithoutResearch: "1 call"
  },
  "opportunity-research": {
    key: "opportunity-research",
    label: "Research",
    maxInputChars: 16000,
    maxOutputTokens: 1100,
    expectedCalls: "0-1 call"
  },
  "weekly-report": {
    key: "weekly-report",
    label: "Weekly report",
    maxInputChars: 0,
    maxOutputTokens: 0,
    expectedCalls: "0 calls"
  }
};

export function getOpenAiActionBudget(key: OpenAiActionBudgetKey) {
  return OPENAI_ACTION_BUDGETS[key];
}

export function applyOpenAiActionBudget(input: string, key: OpenAiActionBudgetKey) {
  const budget = getOpenAiActionBudget(key);
  if (budget.maxInputChars <= 0 || input.length <= budget.maxInputChars) {
    return input;
  }

  return `${input.slice(0, budget.maxInputChars)}\n\n[RepoRadar: context truncated to ${budget.maxInputChars} characters for ${budget.label}.]`;
}

export function getOpenAiActionOptions(key: OpenAiActionBudgetKey) {
  const budget = getOpenAiActionBudget(key);
  return budget.maxOutputTokens > 0 ? { maxOutputTokens: budget.maxOutputTokens } : {};
}

function formatExpectedCallsPl(expectedCalls: string) {
  return `${expectedCalls.replace(/\s*calls?$/, "")} wyw.`;
}

export function formatOpenAiBudgetLabel(key: OpenAiActionBudgetKey, options: { marketResearchEnabled?: boolean } = {}) {
  const budget = getOpenAiActionBudget(key);
  const expectedCalls =
    options.marketResearchEnabled === false && budget.expectedCallsWithoutResearch
      ? budget.expectedCallsWithoutResearch
      : budget.expectedCalls;
  const calls = formatExpectedCallsPl(expectedCalls);
  return budget.maxOutputTokens > 0 ? `${calls} / ${budget.maxOutputTokens} tok.` : calls;
}

export function formatOpenAiBudgetBadgeLabel(key: OpenAiActionBudgetKey, options: { marketResearchEnabled?: boolean } = {}) {
  return `AI: ${formatOpenAiBudgetLabel(key, options)}`;
}

export function formatOpenAiBudgetCommandDescription(
  key: OpenAiActionBudgetKey,
  options: { marketResearchEnabled?: boolean } = {}
) {
  return `Budzet AI: ${formatOpenAiBudgetLabel(key, options)}`;
}
