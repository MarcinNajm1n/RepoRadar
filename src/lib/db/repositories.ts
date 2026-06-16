import { prisma } from "./client";
import { isRepositoryStatus } from "@/types/status";
import type { RepositoryStatus } from "@/types/status";
import { FULL_IDEA_STATUSES, IDEA_STATUS, isIdeaStatus } from "@/types/idea-status";
import type { IdeaStatus } from "@/types/idea-status";
import type {
  DashboardData,
  EvidenceSourceItem,
  IdeaListItem,
  ReportListItem,
  RepositoryListItem
} from "@/types/repository";
import { safeJsonParse } from "@/lib/utils";

const DEFAULT_SCORE_BREAKDOWN = {
  absoluteGrowthPoints: 0,
  percentageGrowthPoints: 0,
  agePoints: 0,
  totalStarsPoints: 0,
  forksPoints: 0,
  pushFreshnessPoints: 0,
  topicRelevancePoints: 0,
  readmeQualityPoints: 0,
  keywordRelevancePoints: 0,
  initialMomentumPoints: 0,
  usedInitialMomentumFallback: false
};

type RepositoryRecord = Awaited<ReturnType<typeof prisma.repository.findMany>>[number] & {
  snapshots?: {
    growth24h: number | null;
    growth7d: number | null;
    growthPercent7d: number | null;
  }[];
};

type EvidenceSourceRecord = {
  id: string;
  sourceType: string;
  title: string;
  url: string;
  publisher: string | null;
  retrievedAt: Date;
  publishedAt: Date | null;
  snippet: string;
  sentiment: string | null;
  relevanceScore: number | null;
  canonicalUrl: string | null;
  sourceKey: string | null;
  evidenceKind: string | null;
  whatItProves: string | null;
  sourceConfidence: number | null;
  sourceRank: number | null;
};

export function mapEvidenceSource(source: EvidenceSourceRecord): EvidenceSourceItem {
  return {
    id: source.id,
    sourceType: source.sourceType,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    retrievedAt: source.retrievedAt.toISOString(),
    publishedAt: source.publishedAt?.toISOString() ?? null,
    snippet: source.snippet,
    sentiment: source.sentiment,
    relevanceScore: source.relevanceScore,
    canonicalUrl: source.canonicalUrl,
    sourceKey: source.sourceKey,
    evidenceKind: source.evidenceKind,
    whatItProves: source.whatItProves,
    sourceConfidence: source.sourceConfidence,
    sourceRank: source.sourceRank
  };
}

export function mapRepository(repository: RepositoryRecord): RepositoryListItem {
  const latestSnapshot = repository.snapshots?.[0];

  return {
    id: repository.id,
    fullName: repository.fullName,
    owner: repository.owner,
    name: repository.name,
    url: repository.url,
    description: repository.description,
    readmeExcerpt: repository.readmeExcerpt,
    primaryLanguage: repository.primaryLanguage,
    topics: safeJsonParse<string[]>(repository.topicsJson, []),
    license: repository.license,
    createdAt: repository.createdAt.toISOString(),
    pushedAt: repository.pushedAt?.toISOString() ?? null,
    firstSeenAt: repository.firstSeenAt.toISOString(),
    lastSeenAt: repository.lastSeenAt.toISOString(),
    starsCurrent: repository.starsCurrent,
    forksCurrent: repository.forksCurrent,
    watchersCurrent: repository.watchersCurrent,
    openIssues: repository.openIssues,
    ageMonths: repository.ageMonths,
    isOldRepo: repository.isOldRepo,
    isArchived: repository.isArchived,
    isFork: repository.isFork,
    isDeletedFromView: repository.isDeletedFromView,
    status: repository.status,
    shortSummaryPl: repository.shortSummaryPl,
    lastAnalyzedAt: repository.lastAnalyzedAt?.toISOString() ?? null,
    trendScore: repository.trendScore,
    relevanceScore: repository.relevanceScore,
    initialMomentumScore: repository.initialMomentumScore,
    scoreBreakdown: safeJsonParse(repository.scoreBreakdownJson, DEFAULT_SCORE_BREAKDOWN),
    discoveryProfiles: safeJsonParse<string[]>(repository.discoveryProfilesJson, []),
    source: repository.source,
    growth24h: latestSnapshot?.growth24h ?? null,
    growth7d: latestSnapshot?.growth7d ?? null,
    growthPercent7d: latestSnapshot?.growthPercent7d ?? null
  };
}

function mapIdea(
  idea: Awaited<ReturnType<typeof prisma.idea.findMany>>[number] & {
    repository?: { fullName: string };
    marketResearchSources?: EvidenceSourceRecord[];
  }
): IdeaListItem {
  return {
    id: idea.id,
    sourceRepoId: idea.sourceRepoId,
    sourceRepoName: idea.repository?.fullName ?? "nieznane repo",
    title: idea.title,
    problem: idea.problem,
    proposedSolution: idea.proposedSolution,
    targetUser: idea.targetUser,
    mvpScope: idea.mvpScope,
    monetizationPotential: idea.monetizationPotential,
    difficulty: idea.difficulty,
    usefulnessScore: idea.usefulnessScore,
    riskScore: idea.riskScore,
    confidenceScore: idea.confidenceScore,
    opportunityScore: idea.opportunityScore,
    opportunityBreakdown: safeJsonParse<Record<string, number>>(idea.opportunityBreakdownJson, {}),
    applicationSummary: idea.applicationSummary,
    businessRationale: idea.businessRationale,
    researchMode: idea.researchMode,
    marketSummary: idea.marketSummary,
    suggestedStack: idea.suggestedStack,
    firstSteps: safeJsonParse<string[]>(idea.firstStepsJson, []),
    evidenceIds: safeJsonParse<string[]>(idea.evidenceIdsJson, []),
    evidenceSources: idea.marketResearchSources?.map(mapEvidenceSource) ?? [],
    status: idea.status,
    lastResearchAt: idea.lastResearchAt?.toISOString() ?? null,
    createdAt: idea.createdAt.toISOString()
  };
}

function mapReport(report: Awaited<ReturnType<typeof prisma.report.findMany>>[number]): ReportListItem {
  return {
    id: report.id,
    type: report.type,
    repoId: report.repoId,
    title: report.title,
    markdownPath: report.markdownPath,
    contentMarkdown: report.contentMarkdown,
    summary: report.summary,
    repoCount: report.repoCount,
    topRepoIds: safeJsonParse<string[]>(report.topRepoIdsJson, []),
    createdAt: report.createdAt.toISOString()
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [repositories, ideas, weeklyReports, lastScan, counts] = await Promise.all([
    prisma.repository.findMany({
      orderBy: [{ trendScore: "desc" }, { starsCurrent: "desc" }],
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: {
            growth24h: true,
            growth7d: true,
            growthPercent7d: true
          }
        }
      }
    }),
    prisma.idea.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        repository: { select: { fullName: true } },
        marketResearchSources: {
          orderBy: [{ sourceRank: "desc" }, { sourceConfidence: "desc" }, { relevanceScore: "desc" }, { retrievedAt: "desc" }],
          take: 10
        }
      }
    }),
    prisma.report.findMany({
      where: { type: "weekly" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.scanRun.findFirst({
      orderBy: { startedAt: "desc" }
    }),
    getCounts()
  ]);

  return {
    repositories: repositories.map(mapRepository),
    ideas: ideas.map(mapIdea),
    weeklyReports: weeklyReports.map(mapReport),
    counts,
    lastScan: lastScan
      ? {
          startedAt: lastScan.startedAt.toISOString(),
          finishedAt: lastScan.finishedAt?.toISOString() ?? null,
          status: lastScan.status,
          reposFound: lastScan.reposFound,
          reposUpdated: lastScan.reposUpdated,
          errorMessage: lastScan.errorMessage
        }
      : null
  };
}

async function getCounts() {
  const [all, newlyFound, saved, read, ignored, ideas, candidates, fullIdeas, savedIdeas, dismissedIdeas, old, hot] = await Promise.all([
    prisma.repository.count({ where: { isDeletedFromView: false } }),
    prisma.repository.count({ where: { status: "NEW", isDeletedFromView: false } }),
    prisma.repository.count({ where: { status: "SAVED", isDeletedFromView: false } }),
    prisma.repository.count({ where: { status: "READ", isDeletedFromView: false } }),
    prisma.repository.count({ where: { status: "IGNORED" } }),
    prisma.idea.count(),
    prisma.idea.count({ where: { status: IDEA_STATUS.CANDIDATE } }),
    prisma.idea.count({ where: { status: { in: FULL_IDEA_STATUSES } } }),
    prisma.idea.count({ where: { status: IDEA_STATUS.SAVED } }),
    prisma.idea.count({ where: { status: IDEA_STATUS.DISMISSED } }),
    prisma.repository.count({ where: { isOldRepo: true, status: { not: "HOT" }, isDeletedFromView: false } }),
    prisma.repository.count({ where: { status: "HOT", isDeletedFromView: false } })
  ]);

  return {
    all,
    new: newlyFound,
    saved,
    read,
    ignored,
    ideas,
    candidates,
    fullIdeas,
    savedIdeas,
    dismissedIdeas,
    old,
    hot
  };
}

export async function updateIdeaStatus(ideaId: string, status: string) {
  if (!isIdeaStatus(status)) {
    throw new Error(`Unsupported idea status: ${status}`);
  }

  const nextStatus: IdeaStatus = status;
  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: nextStatus
    }
  });
}

export async function updateRepositoryStatus(repoId: string, status: string, reason?: string) {
  if (!isRepositoryStatus(status)) {
    throw new Error(`Unsupported repository status: ${status}`);
  }

  const repository = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });
  const nextStatus: RepositoryStatus = status;

  if (nextStatus === "IGNORED") {
    await prisma.ignoredRepository.upsert({
      where: { fullName: repository.fullName },
      update: {
        repoId: repository.id,
        reason,
        permanent: true,
        ignoredAt: new Date()
      },
      create: {
        repoId: repository.id,
        fullName: repository.fullName,
        reason,
        permanent: true
      }
    });

    return prisma.repository.update({
      where: { id: repoId },
      data: {
        status: nextStatus,
        isDeletedFromView: true
      }
    });
  }

  await prisma.ignoredRepository.deleteMany({
    where: {
      OR: [{ repoId }, { fullName: repository.fullName }]
    }
  });

  return prisma.repository.update({
    where: { id: repoId },
    data: {
      status: nextStatus,
      isDeletedFromView: false
    }
  });
}

export async function getRepositoryForReport(repoId: string) {
  return prisma.repository.findUniqueOrThrow({
    where: { id: repoId },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 8
      },
      reports: {
        where: { type: "repo" },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
}

export async function getTopRepositories(limit = 20) {
  return prisma.repository.findMany({
    where: { isDeletedFromView: false },
    orderBy: [{ trendScore: "desc" }, { starsCurrent: "desc" }],
    take: limit,
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1
      }
    }
  });
}

export async function getEvidenceSourcesForReport(reportId: string) {
  const sources = await prisma.marketResearchSource.findMany({
    where: { reportId },
    orderBy: [{ sourceRank: "desc" }, { sourceConfidence: "desc" }, { relevanceScore: "desc" }, { retrievedAt: "desc" }],
    take: 10
  });

  return sources.map(mapEvidenceSource);
}
