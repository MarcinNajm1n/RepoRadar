import { prisma } from "@/lib/db/client";
import { getConfig } from "@/lib/config";
import { monthsBetween, safeJsonParse } from "@/lib/utils";
import { calculateGrowth } from "@/lib/scoring/growth";
import { calculateTrendScore } from "@/lib/scoring/trend-score";
import { generateShortSummaryForRepository } from "@/lib/openai/repository-analysis";
import { createDailyReport } from "@/lib/reports/daily";
import { buildGitHubSearchQueries } from "./queries";
import { GitHubClient, searchGitHubRepositories } from "./client";
import type { GitHubReadmeResult, GitHubRepositoryItem } from "./types";

type ScanOptions = {
  maxPages?: number;
  fetchReadmeLimit?: number;
  generateSummaries?: boolean;
};

const USER_LOCKED_STATUSES = new Set(["SAVED", "READ", "IGNORED", "IDEA", "ANALYZED"]);

function mapTopics(item: GitHubRepositoryItem) {
  return Array.isArray(item.topics) ? item.topics.filter(Boolean) : [];
}

function getLicense(item: GitHubRepositoryItem) {
  return item.license?.spdx_id || item.license?.key || item.license?.name || null;
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

async function upsertRepositoryFromGitHub(item: GitHubRepositoryItem, readme: GitHubReadmeResult | null, now: Date) {
  const config = getConfig();
  const fullName = item.full_name;
  const topics = mapTopics(item);
  const ignored = await prisma.ignoredRepository.findUnique({ where: { fullName } });
  const existing = await prisma.repository.findUnique({ where: { githubId: item.id } });

  const createdAt = new Date(item.created_at);
  const pushedAt = item.pushed_at ? new Date(item.pushed_at) : null;
  const ageMonths = monthsBetween(createdAt, now);
  const isOldRepo = ageMonths > config.oldRepoAgeMonths;

  const repository = await prisma.repository.upsert({
    where: { githubId: item.id },
    update: {
      fullName,
      owner: item.owner.login,
      name: item.name,
      url: item.html_url,
      description: item.description,
      readmeHash: readme?.hash ?? existing?.readmeHash ?? null,
      readmeExcerpt: readme?.excerpt ?? existing?.readmeExcerpt ?? null,
      primaryLanguage: item.language,
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
      isDeletedFromView: Boolean(ignored) || existing?.isDeletedFromView === true
    },
    create: {
      githubId: item.id,
      fullName,
      owner: item.owner.login,
      name: item.name,
      url: item.html_url,
      description: item.description,
      readmeHash: readme?.hash ?? null,
      readmeExcerpt: readme?.excerpt ?? null,
      primaryLanguage: item.language,
      topicsJson: JSON.stringify(topics),
      license: getLicense(item),
      createdAt,
      pushedAt,
      firstSeenAt: now,
      lastSeenAt: now,
      starsCurrent: item.stargazers_count,
      forksCurrent: item.forks_count,
      watchersCurrent: item.subscribers_count ?? item.watchers_count,
      openIssues: item.open_issues_count,
      ageMonths,
      isOldRepo,
      isArchived: item.archived,
      isFork: item.fork,
      status: ignored ? "IGNORED" : "NEW",
      isDeletedFromView: Boolean(ignored),
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
      trendScore: { gte: 60 }
    },
    orderBy: [{ trendScore: "desc" }],
    take: config.openAiDailyAnalysisLimit
  });

  for (const candidate of candidates) {
    try {
      await generateShortSummaryForRepository(candidate.id);
    } catch {
      break;
    }
  }
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
    const filtered = rawItems.filter((item) => {
      if (item.stargazers_count < config.minStars) {
        return false;
      }

      if (config.excludeForks && item.fork) {
        return false;
      }

      return true;
    });

    const client = new GitHubClient();
    const readmeLimit = options.fetchReadmeLimit ?? 25;
    let updated = 0;

    for (const [index, item] of filtered.entries()) {
      const readme = await maybeFetchReadme(client, item, index < readmeLimit);
      const repository = await upsertRepositoryFromGitHub(item, readme, now);
      await snapshotAndScoreRepository(repository.id, readme?.text ?? null, now);
      updated += 1;
    }

    if (options.generateSummaries !== false) {
      await maybeGenerateSummaries();
    }

    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        reposFound: filtered.length,
        reposUpdated: updated
      }
    });

    await createDailyReport(scanRun.id);

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
    throw error;
  }
}
