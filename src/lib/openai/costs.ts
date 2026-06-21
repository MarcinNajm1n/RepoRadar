import type { AiCostSummary } from "@/types/ai-cost";
import { formatOpenAiBudgetLabel } from "./token-budgets";

export function estimateOpenAiNextActions(marketResearchEnabled: boolean): AiCostSummary["estimatedNextActions"] {
  return {
    summary: formatOpenAiBudgetLabel("summary"),
    report: marketResearchEnabled ? formatOpenAiBudgetLabel("repo-report") : "1 call, max 2400 output tokens",
    idea: marketResearchEnabled ? formatOpenAiBudgetLabel("idea") : "1 call, max 1600 output tokens",
    research: marketResearchEnabled ? formatOpenAiBudgetLabel("opportunity-research") : "0 calls"
  };
}
