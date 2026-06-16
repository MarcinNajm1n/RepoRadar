import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db/client";
import { dispatchOpportunityCandidateNotification } from "@/lib/notifications/dispatcher";
import { generateOpportunityCandidateForRepository } from "@/lib/openai/repository-analysis";

export async function runAutoOpportunityResearch(scanRunId: string) {
  const config = getConfig();
  if (!config.marketResearchEnabled || !config.enableAutoOpportunityResearch) {
    return [];
  }

  const scanRun = await prisma.scanRun.findUniqueOrThrow({ where: { id: scanRunId } });
  const topRepositories = await prisma.repository.findMany({
    where: {
      isDeletedFromView: false,
      lastSeenAt: { gte: scanRun.startedAt },
      status: { not: "IGNORED" }
    },
    orderBy: [{ trendScore: "desc" }, { relevanceScore: "desc" }, { starsCurrent: "desc" }],
    take: Math.max(1, Math.min(config.autoOpportunityResearchTopRepos, 3))
  });

  const results = [];
  for (const repository of topRepositories) {
    try {
      const result = await generateOpportunityCandidateForRepository(repository.id);
      results.push({ repoId: repository.id, fullName: repository.fullName, ...result });
      if (result.created && result.ideaId) {
        await dispatchOpportunityCandidateNotification(result.ideaId);
      }
    } catch (error) {
      results.push({
        repoId: repository.id,
        fullName: repository.fullName,
        created: false,
        reason: error instanceof Error ? error.message : "Unknown opportunity research error"
      });
    }
  }

  return results;
}
