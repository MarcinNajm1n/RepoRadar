import type { AiCostSummary } from "@/types/ai-cost";
import { formatOpenAiBudgetLabel } from "./token-budgets";

export function estimateOpenAiNextActions(marketResearchEnabled: boolean): AiCostSummary["estimatedNextActions"] {
  return {
    summary: formatOpenAiBudgetLabel("summary"),
    report: formatOpenAiBudgetLabel("repo-report", { marketResearchEnabled }),
    idea: formatOpenAiBudgetLabel("idea", { marketResearchEnabled }),
    research: marketResearchEnabled ? formatOpenAiBudgetLabel("opportunity-research") : "wylaczone"
  };
}
