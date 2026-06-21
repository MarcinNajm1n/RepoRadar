import { prisma } from "./client";
import { getConfig } from "@/lib/config";
import { estimateOpenAiNextActions } from "@/lib/openai/costs";
import type { AiCostSummary } from "@/types/ai-cost";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek() {
  const today = startOfToday();
  const day = today.getDay() || 7;
  return new Date(today.getTime() - (day - 1) * 24 * 60 * 60 * 1000);
}

export async function getAiCostSummary(): Promise<AiCostSummary> {
  const config = getConfig();
  const [analysesToday, analysesThisWeek, analysesAllTime] = await Promise.all([
    prisma.openAiCache.count({ where: { createdAt: { gte: startOfToday() } } }),
    prisma.openAiCache.count({ where: { createdAt: { gte: startOfWeek() } } }),
    prisma.openAiCache.count()
  ]);

  return {
    analysesToday,
    analysesThisWeek,
    analysesAllTime,
    estimatedNextActions: estimateOpenAiNextActions(config.marketResearchEnabled)
  };
}
