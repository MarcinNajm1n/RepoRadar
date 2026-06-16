import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db/client";
import { truncateText } from "@/lib/utils";
import { isExcellentOpportunity } from "@/lib/market-research/opportunity";
import { IDEA_STATUS } from "@/types/idea-status";
import { isHighValueRepository } from "./thresholds";
import { sendDiscordNotification } from "./channels/discord";
import { sendNoopNotification } from "./channels/noop";
import { sendWindowsNotification } from "./channels/windows";
import type { NotificationPayload, NotificationRepository, NotificationResult } from "./types";

async function saveNotificationLog(result: NotificationResult) {
  await prisma.notificationLog.create({
    data: {
      channel: result.channel,
      eventType: result.eventType,
      status: result.status,
      maskedTarget: result.maskedTarget,
      payloadJson: result.payloadJson,
      error: result.error ? truncateText(result.error, 1000) : null
    }
  });
}

async function sendAndLog(payload: NotificationPayload) {
  const config = getConfig();
  const results: NotificationResult[] = [];

  if (!config.enableNotifications) {
    results.push(await sendNoopNotification(payload));
  } else {
    results.push(await sendWindowsNotification(payload));
    results.push(await sendDiscordNotification(payload));
  }

  await Promise.all(results.map(saveNotificationLog));
  return results;
}

function notificationRepoFromRecord(repo: {
  fullName: string;
  url: string;
  trendScore: number;
  starsCurrent: number;
  relevanceScore: number;
  snapshots: Array<{ growth7d: number | null }>;
}): NotificationRepository {
  return {
    fullName: repo.fullName,
    url: repo.url,
    trendScore: repo.trendScore,
    starsCurrent: repo.starsCurrent,
    relevanceScore: repo.relevanceScore,
    growth7d: repo.snapshots[0]?.growth7d ?? null
  };
}

export async function dispatchScanSuccessNotifications(scanRunId: string) {
  const scanRun = await prisma.scanRun.findUniqueOrThrow({ where: { id: scanRunId } });
  const repositories = await prisma.repository.findMany({
    where: {
      isDeletedFromView: false,
      lastSeenAt: { gte: scanRun.startedAt }
    },
    orderBy: [{ trendScore: "desc" }, { starsCurrent: "desc" }],
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { growth7d: true }
      }
    },
    take: 50
  });

  const highValue = repositories
    .filter((repo) =>
      isHighValueRepository({
        trendScore: repo.trendScore,
        growth7d: repo.snapshots[0]?.growth7d ?? null,
        relevanceScore: repo.relevanceScore
      })
    )
    .slice(0, 10)
    .map(notificationRepoFromRecord);

  if (!highValue.length) {
    return [];
  }

  return sendAndLog({
    eventType: "scan_success",
    scanRunId,
    title: `RepoRadar: ${highValue.length} high-value repo`,
    message: `Scan zakonczony. Znaleziono ${highValue.length} repo przekraczajacych prog powiadomien.`,
    repositories: highValue
  });
}

export async function dispatchScanFailureNotification(scanRunId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown scan error";
  return sendAndLog({
    eventType: "scan_failure",
    scanRunId,
    title: "RepoRadar: scan failed",
    message: "GitHub scan nie zakonczyl sie poprawnie.",
    error: truncateText(message, 1000)
  });
}

export async function dispatchOpportunityCandidateNotification(candidateId: string) {
  const duplicate = await prisma.notificationLog.findFirst({
    where: {
      eventType: "opportunity_candidate_high",
      status: "SENT",
      payloadJson: { contains: candidateId }
    }
  });
  if (duplicate) {
    return [];
  }

  const candidate = await prisma.idea.findUniqueOrThrow({
    where: { id: candidateId },
    include: {
      repository: {
        include: {
          snapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1,
            select: { growth7d: true }
          }
        }
      },
      marketResearchSources: {
        orderBy: [{ sourceRank: "desc" }, { sourceConfidence: "desc" }, { relevanceScore: "desc" }, { retrievedAt: "desc" }],
        take: 6
      }
    }
  });
  const independentSourceCount = new Set(
    candidate.marketResearchSources
      .map((source) => source.publisher || source.sourceType || source.canonicalUrl || source.sourceKey)
      .filter(Boolean)
  ).size;
  const confidenceValues = candidate.marketResearchSources
    .map((source) => source.sourceConfidence)
    .filter((score): score is number => typeof score === "number");
  const averageSourceConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, score) => sum + score, 0) / confidenceValues.length)
    : null;

  const text = [
    candidate.title,
    candidate.problem,
    candidate.applicationSummary,
    candidate.businessRationale,
    candidate.marketSummary,
    ...candidate.marketResearchSources.map((source) => `${source.title} ${source.snippet}`)
  ].join(" ");
  if (candidate.status !== IDEA_STATUS.CANDIDATE && candidate.status !== IDEA_STATUS.FULL) {
    return [];
  }
  if (
    !isExcellentOpportunity({
      opportunityScore: candidate.opportunityScore,
      confidenceScore: candidate.confidenceScore,
      sourceCount: candidate.marketResearchSources.length,
      independentSourceCount,
      averageSourceConfidence,
      text
    })
  ) {
    return [];
  }

  const repo = notificationRepoFromRecord(candidate.repository);
  return sendAndLog({
    eventType: "opportunity_candidate_high",
    opportunityCandidateId: candidate.id,
    title: `RepoRadar: mocny kandydat ${candidate.opportunityScore ?? "?"}/100`,
    message: candidate.businessRationale ?? "Znaleziono mocnego kandydata biznesowego.",
    repositories: [
      {
        ...repo,
        opportunityScore: candidate.opportunityScore,
        confidenceScore: candidate.confidenceScore,
        sourceCount: candidate.marketResearchSources.length,
        applicationSummary: candidate.applicationSummary,
        businessRationale: candidate.businessRationale
      }
    ]
  });
}

export async function dispatchTestNotification() {
  return sendAndLog({
    eventType: "test_notification",
    title: "RepoRadar: test notification",
    message: "Testowe powiadomienie z lokalnej aplikacji RepoRadar.",
    repositories: []
  });
}
