import type { AiCostSummary } from "@/types/ai-cost";

export function estimateOpenAiNextActions(marketResearchEnabled: boolean): AiCostSummary["estimatedNextActions"] {
  const research = marketResearchEnabled ? "0-1 call, zależnie od providera/cache" : "0 calls";

  return {
    summary: "1 call",
    report: marketResearchEnabled ? "1-2 calls" : "1 call",
    idea: marketResearchEnabled ? "1-2 calls" : "1 call",
    research
  };
}
