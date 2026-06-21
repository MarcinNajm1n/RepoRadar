import { prisma } from "@/lib/db/client";
import { getConfig } from "@/lib/config";
import { runAiJob } from "@/lib/db/ai-jobs";
import { monthsBetween, safeJsonParse, sanitizeExternalStringArray, sanitizeExternalText } from "@/lib/utils";
import { calculateGrowth } from "@/lib/scoring/growth";
import { calculateTrendScore } from "@/lib/scoring/trend-score";
import { generateShortSummaryForRepository } from "@/lib/openai/repository-analysis";
import { buildAiPriorityRepositoryWhere } from "@/lib/openai/priority";
import { createDailyReport } from "@/lib/reports/daily";
import { dispatchScanFailureNotification, dispatchScanSuccessNotifications } from "@/lib/notifications/dispatcher";
import { runAutoOpportunityResearch } from "@/lib/market-research/auto-opportunities";
import { buildGitHubSearchQueries } from "./queries";
import { GitHubClient, searchGitHubRepositories } from "./client";
import { getAdaptiveGitHubConcurrency, runWithAdaptiveConcurrency } from "./concurrency";
import { prioritizeIncrementalScanItems } from "./incremental-scan";
import { getLastGitHubRateLimitSnapshot } from "./rate-limit";
import { saveGitHubRateLimitSnapshot } from "@/lib/db/github-rate-limit";
import type { GitHubReadmeResult, GitHubRepositoryItem, GitHubSearchProfile } from "./types";

type ScanOptions = {
  maxPages?: number;
  fetchReadmeLimit?: number;
  generateSummaries?: boolean;
};

const USER_LOCKED_STATUSES = new Set(["SAVED", "READ", "IGNORED", "IDEA", "ANALYZED"]);

function mapTopics(item: GitHubRepositoryItem) {
  return sanitizeExternalStringArray(item.topics);
}

function getLicense(item: GitHubRepositoryItem) {
  return sanitizeExternalText(item.license?.spdx_id || item.license?.key || item.license?.name || null, 120);
}

function shouldPreserveStatus(status: string) {
  return USER_LOCKED_STATUSES.has(status);
}

async function maybeFetchReadme(
  client: GitHubClient,
  item: GitHubRepositoryItem,
  shouldFetch: boolean
): Promise<GitHubReadmeResult | null> {
  if (!shouldFetch) {
    return null;
  }

  return client.getReadme(item.owner.login, item.name).catch(() => null);
}

async function upsertRepositoryFromGitHub(
  item: GitHubRepositoryItem,
  readme: GitHubReadmeResult | null,
  now: Date,
  matchedProfiles: GitHubSearchProfile[]
) {
  const config = getConfig();
  const fullName = sanitizeExternalText(item.full_name, 300) ?? item.full_name;
  const owner = sanitizeExternalText(item.owner.login, 180) ?? item.owner.login;
  const name = sanitizeExternalText(item.name, 180) ?? item.name;
  const url = sanitizeExternalText(item.html_url, 500) ?? item.html_url;
  const description = sanitizeExternalText(item.description, 2000);
  const primaryLanguage = sanitizeExternalText(item.language, 120);
  const readmeExcerpt = sanitizeExternalText(readme?.excerpt, 2400);
  const topics = mapTopics(item);
  const ignored = await prisma.ignoredRepository.findUnique({ where: { fullName } });
  const existingByGitHubId = await prisma.repository.findUnique({ where: { githubId: item.id } });
  const existingByFullName = existingByGitHubId ? null : await prisma.repository.findUnique({ where: { fullName } });
  const existing = existingByGitHubId ?? existingByFullName;

  const createdAt = new Date(item.created_at);
  const pushedAt = item.pushed_at ? new Date(item.pushed_at) : null;
  const ageMonths = monthsBetween(createdAt, now);
  const isOldRepo = ageMonths > config.oldRepoAgeMonths;

  const updateData = {
    githubId: item.id,
    fullName,
    owner,
    name,
    url,
    description,
    readmeHash: readme?.hash ?? existing?.readmeHash ?? null,
    readmeExcerpt: readmeExcerpt ?? existing?.readmeExcerpt ?? null,
    primaryLanguage,
    topicsJson: JSON.stringify(topics),
    license: getLicense(item),
    createdAt,
    pushedAt,
    lastSeenAt: now,
    starsCurrent: item.stargazers_count,
    forksCurrent: item.forks_count,
    watchersCurrent: item.subscribers_count ?? item.watchers_count,
    openIssues: item.open_issues_count,
    ageMonths,
    isOldRepo,
    isArchived: item.archived,
    isFork: item.fork,
    status: ignored ? "IGNORED" : existing?.status ?? "NEW",
    isDeletedFromView: Boolean(ignored) || existing?.isDeletedFromView === true,
    discoveryProfilesJson: JSON.stringify(matchedProfiles)
  };

  const repository = existing
    ? await prisma.repository.update({
        where: { id: existing.id },
        data: updateData
      })
    : await prisma.repository.create({
        data: {
          ...updateData,
          firstSeenAt: now,
          source: "github"
        }
      });

  if (ignored && !ignored.repoId) {
    await prisma.ignoredRepository.update({
      where: { id: ignored.id },
      data: { repoId: repository.id }
    });
  }

  return repository;
}

async function snapshotAndScoreRepository(repoId: string, readmeText: string | null, now: Date) {
  const repository = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });
  const previousSnapshots = await prisma.repoSnapshot.findMany({
    where: {
      repoId,
      capturedAt: {
        lt: now
      }
    },
    orderBy: { capturedAt: "asc" },
    select: {
      capturedAt: true,
      stars: true
    }
  });

  const growth = calculateGrowth(
    {
      capturedAt: now,
      stars: repository.starsCurrent
    },
    previousSnapshots,
    now
  );

  const score = calculateTrendScore({
    starsCurrent: repository.starsCurrent,
    forksCurrent: repository.forksCurrent,
    createdAt: repository.createdAt,
    pushedAt: repository.pushedAt,
    topics: safeJsonParse<string[]>(repository.topicsJson, []),
    description: repository.description,
    readmeText: readmeText ?? repository.readmeExcerpt,
    readmeExcerpt: repository.readmeExcerpt,
    primaryLanguage: repository.primaryLanguage,
    growth7d: growth.growth7d,
    growthPercent7d: growth.growthPercent7d,
    starsBefore7d: growth.starsBefore7d
  });

  await prisma.repoSnapshot.create({
    data: {
      repoId,
      capturedAt: now,
      stars: repository.starsCurrent,
      forks: repository.forksCurrent,
      watchers: repository.watchersCurrent,
      openIssues: repository.openIssues,
      pushedAt: repository.pushedAt,
      growth24h: growth.growth24h,
      growth7d: growth.growth7d,
      growthPercent7d: growth.growthPercent7d
    }
  });

  const nextStatus = shouldPreserveStatus(repository.status) ? repository.status : score.status;

  await prisma.repository.update({
    where: { id: repoId },
    data: {
      trendScore: score.trendScore,
      relevanceScore: score.relevanceScore,
      initialMomentumScore: score.initialMomentumScore,
      scoreBreakdownJson: JSON.stringify(score.scoreBreakdown),
      ageMonths: score.ageMonths,
      isOldRepo: score.isOldRepo,
      status: nextStatus
    }
  });

  return { growth, score };
}

async function maybeGenerateSummaries() {
  const config = getConfig();
  if (!config.openAiApiKey) {
    return;
  }

  const candidates = await prisma.repository.findMany({
    where: {
      isDeletedFromView: false,
      shortSummaryPl: null,
      ...buildAiPriorityRepositoryWhere()
    },
    orderBy: [{ trendScore: "desc" }],
    take: config.openAiDailyAnalysisLimit
  });

  for (const candidate of candidates) {
    try {
      await runAiJob(
        { type: "SUMMARY", repoId: candidate.id, priority: candidate.trendScore, dedupeKey: `summary:${candidate.id}` },
        () => generateShortSummaryForRepository(candidate.id),
        () => ({ repoId: candidate.id })
      );
    } catch {
      break;
    }
  }
}

async function orderForIncrementalScan(discovered: Awaited<ReturnType<typeof searchGitHubRepositories>>) {
  const githubIds = discovered.map((item) => item.item.id);
  const fullNames = discovered.map((item) => item.item.full_name);
  const existing = await prisma.repository.findMany({
    where: {
      OR: [{ githubId: { in: githubIds } }, { fullName: { in: fullNames } }]
    },
    select: {
      githubId: true,
      fullName: true,
      pushedAt: true,
      starsCurrent: true
    }
  });

  return prioritizeIncrementalScanItems(discovered, existing);
}

export async function runDailyScan(options: ScanOptions = {}) {
  const config = getConfig();
  const scanRun = await prisma.scanRun.create({
    data: { status: "RUNNING" }
  });
  const now = new Date();

  try {
    const queries = buildGitHubSearchQueries(now);
    const rawItems = await searchGitHubRepositories(queries, options.maxPages ?? 1);
    const filtered = rawItems.filter((discovered) => {
      if (config.excludeForks && discovered.item.fork) {
        return false;
      }

      return true;
    });
    const prioritized = await orderForIncrementalScan(filtered);

    const client = new GitHubClient();
    const readmeLimit = options.fetchReadmeLimit ?? 25;
    let updated = 0;
    const itemErrors: string[] = [];

    const concurrency = getAdaptiveGitHubConcurrency(getLastGitHubRateLimitSnapshot());
    await runWithAdaptiveConcurrency(prioritized, concurrency, async (discovered, index) => {
      const item = discovered.item;
      try {
        const readme = await maybeFetchReadme(client, item, index < readmeLimit);
        const repository = await upsertRepositoryFromGitHub(item, readme, now, discovered.matchedProfiles);
        await snapshotAndScoreRepository(repository.id, readme?.text ?? null, now);
        updated += 1;
      } catch (error) {
        const fullName = sanitizeExternalText(item.full_name, 300) ?? `github:${item.id}`;
        const message = error instanceof Error ? error.message : "Unknown item error";
        itemErrors.push(`${fullName}: ${message.slice(0, 180)}`);
      }
    });

    if (options.generateSummaries !== false) {
      await maybeGenerateSummaries();
    }

    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        reposFound: filtered.length,
        reposUpdated: updated,
        errorMessage: itemErrors.length ? itemErrors.slice(0, 5).join(" | ") : null
      }
    });
    await saveGitHubRateLimitSnapshot(getLastGitHubRateLimitSnapshot());

    await createDailyReport(scanRun.id);
    await runAutoOpportunityResearch(scanRun.id).catch((opportunityError) => {
      console.warn(
        "RepoRadar opportunity research failed:",
        opportunityError instanceof Error ? opportunityError.message : "Unknown opportunity research error"
      );
    });
    await dispatchScanSuccessNotifications(scanRun.id).catch((notificationError) => {
      console.warn(
        "RepoRadar notification dispatch failed:",
        notificationError instanceof Error ? notificationError.message : "Unknown notification error"
      );
    });

    return prisma.scanRun.findUniqueOrThrow({ where: { id: scanRun.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scan error";
    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: message
      }
    });
    await saveGitHubRateLimitSnapshot(getLastGitHubRateLimitSnapshot());
    await dispatchScanFailureNotification(scanRun.id, error).catch((notificationError) => {
      console.warn(
        "RepoRadar failure notification dispatch failed:",
        notificationError instanceof Error ? notificationError.message : "Unknown notification error"
      );
    });
    throw error;
  }
}
