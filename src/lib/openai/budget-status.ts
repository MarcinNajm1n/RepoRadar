import { getConfig } from "@/lib/config";
import type { AppConfig } from "@/lib/config";
import { countOpenAiAnalysesToday } from "@/lib/db/openai-cache";
import { getOpenAiActionBudget } from "./token-budgets";
import type { OpenAiActionBudgetKey } from "./token-budgets";

export type OpenAiBudgetStatus = {
  action: OpenAiActionBudgetKey;
  label: string;
  requiredCalls: number;
  dailyLimit: number;
  usedToday: number;
  allowed: boolean;
  warning: string | null;
};

type OpenAiResearchConfig = Pick<AppConfig, "marketResearchEnabled" | "marketResearchProvider"> &
  Partial<
    Pick<
      AppConfig,
      | "openAiApiKey"
      | "enableOpenAiWebSearchSource"
      | "enableHnSource"
      | "enableRssSource"
      | "enableRedditSource"
      | "enableBlueskySource"
      | "redditClientId"
      | "redditClientSecret"
      | "marketResearchMode"
      | "mcpWebResearchServerUrl"
    >
  >;

function actionUsesResearch(action: OpenAiActionBudgetKey) {
  return action === "repo-report" || action === "idea" || action === "idea-promote" || action === "opportunity-research";
}

function marketResearchMayUseOpenAi(action: OpenAiActionBudgetKey, config: OpenAiResearchConfig) {
  if (!actionUsesResearch(action) || !config.marketResearchEnabled || config.marketResearchProvider === "none") {
    return false;
  }

  if (config.marketResearchProvider === "openai") {
    return Boolean(config.openAiApiKey);
  }

  if (config.marketResearchProvider === "mcp") {
    return action !== "opportunity-research" && Boolean(config.mcpWebResearchServerUrl);
  }

  if (config.marketResearchProvider === "hybrid") {
    if (config.enableOpenAiWebSearchSource && config.openAiApiKey) {
      return true;
    }

    const mode = config.marketResearchMode ?? "light";
    const hasLocalProvider =
      Boolean(config.enableHnSource) ||
      Boolean(config.enableRssSource) ||
      (mode === "full" &&
        ((Boolean(config.enableRedditSource) && Boolean(config.redditClientId) && Boolean(config.redditClientSecret)) ||
          Boolean(config.enableBlueskySource)));

    return mode === "full" && !hasLocalProvider && Boolean(config.mcpWebResearchServerUrl);
  }

  return false;
}

export function getRequiredOpenAiCallsForAction(action: OpenAiActionBudgetKey, config: OpenAiResearchConfig = getConfig()) {
  const budget = getOpenAiActionBudget(action);
  if (!marketResearchMayUseOpenAi(action, config) && budget.requiredCallsWithoutResearch !== undefined) {
    return budget.requiredCallsWithoutResearch;
  }

  return budget.requiredCalls;
}

export function formatOpenAiBudgetWarning(input: {
  label: string;
  requiredCalls: number;
  dailyLimit: number;
  usedToday: number;
}) {
  const remaining = Math.max(0, input.dailyLimit - input.usedToday);
  if (remaining <= 0) {
    return `Dzienny limit OpenAI jest juz wykorzystany (${input.usedToday}/${input.dailyLimit}). Sprobuj jutro albo zwieksz OPENAI_DAILY_ANALYSIS_LIMIT.`;
  }

  return `Za malo dziennego limitu OpenAI dla akcji "${input.label}" (${input.usedToday}/${input.dailyLimit}). Wymagane: ${input.requiredCalls} wyw., dostepne: ${remaining}.`;
}

export function buildOpenAiBudgetStatus(input: {
  action: OpenAiActionBudgetKey;
  label: string;
  requiredCalls: number;
  dailyLimit: number;
  usedToday: number;
}): OpenAiBudgetStatus {
  const allowed = input.usedToday + input.requiredCalls <= input.dailyLimit;

  return {
    ...input,
    allowed,
    warning: allowed ? null : formatOpenAiBudgetWarning(input)
  };
}

export async function getOpenAiBudgetStatus(action: OpenAiActionBudgetKey): Promise<OpenAiBudgetStatus> {
  const config = getConfig();
  const budget = getOpenAiActionBudget(action);
  const usedToday = await countOpenAiAnalysesToday();

  return buildOpenAiBudgetStatus({
    action,
    label: budget.label,
    requiredCalls: getRequiredOpenAiCallsForAction(action, config),
    dailyLimit: config.openAiDailyAnalysisLimit,
    usedToday
  });
}

export async function assertOpenAiBudgetForAction(action: OpenAiActionBudgetKey) {
  const status = await getOpenAiBudgetStatus(action);
  if (!status.allowed) {
    throw new Error(status.warning ?? "Dzienny limit OpenAI jest niedostepny.");
  }

  return status;
}
