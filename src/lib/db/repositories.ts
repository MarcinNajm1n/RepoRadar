import { prisma } from "./client";
import { getConfig } from "@/lib/config";
import { getGraphifyMaintenanceSummary } from "@/lib/graphify/status";
import { isRepositoryStatus } from "@/types/status";
import type { RepositoryStatus } from "@/types/status";
import { FULL_IDEA_STATUSES, IDEA_STATUS, isIdeaStatus } from "@/types/idea-status";
import type { IdeaStatus } from "@/types/idea-status";
import { getActionItems, getActiveActionItems } from "./action-items";
import { getAiCostSummary } from "./ai-costs";
import { getAiJobSummary } from "./ai-jobs";
import { getStoredGitHubRateLimitSnapshot } from "./github-rate-limit";
import { getObservabilitySummary } from "./observability";
import { recordRepositoryStatusAudit } from "./repository-audit";
import { getAllSettings, parseBooleanSetting } from "./settings";
import type { ActionItemListItem } from "@/types/action-item";
import type {
  DashboardData,
  DashboardLastScan,
  DashboardNotificationStatus,
  DashboardSettingsStatus,
  EvidenceSourceItem,
  IdeaListItem,
  IdeasPanelData,
  NotificationLogItem,
  NotificationSummary,
  RadarNextAction,
  RepositoryFilterOptions,
  RadarTodayData,
  ReportListItem,
  RepositoryPage,
  RepositoryPageInput,
  RepositoryListItem,
  SettingsPanelData,
  SettingsSummary,
  TasksPanelData,
  WeeklyReportsPanelData
} from "@/types/repository";
import { safeJsonParse } from "@/lib/utils";
import type { Prisma, Repository } from "@prisma/client";

const DEFAULT_REPOSITORY_PAGE = 1;
const DEFAULT_REPOSITORY_PAGE_SIZE = 100;
const MAX_REPOSITORY_PAGE_SIZE = 200;
const latestSnapshotInclude = {
  snapshots: {
    orderBy: { capturedAt: "desc" as const },
    take: 1,
    select: {
      capturedAt: true,
      growth24h: true,
      growth7d: true,
      growthPercent7d: true
    }
  }
};

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

const ideaListInclude = {
  repository: { select: { fullName: true } },
  marketResearchSources: {
    orderBy: [{ sourceRank: "desc" }, { sourceConfidence: "desc" }, { relevanceScore: "desc" }, { retrievedAt: "desc" }],
    take: 10
  }
} satisfies Prisma.IdeaInclude;

const ideaOpportunityOrderBy = [
  { opportunityScore: "desc" },
  { confidenceScore: "desc" },
  { usefulnessScore: "desc" },
  { createdAt: "desc" }
] satisfies Prisma.IdeaOrderByWithRelationInput[];

type RepositoryRecord = Awaited<ReturnType<typeof prisma.repository.findMany>>[number] & {
  growth24h?: number | null;
  growth7d?: number | null;
  growthPercent7d?: number | null;
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

type NotificationLogRecord = {
  id: string;
  channel: string;
  eventType: string;
  status: string;
  maskedTarget: string | null;
  error: string | null;
  createdAt: Date;
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
    growth24h: repository.growth24h ?? latestSnapshot?.growth24h ?? null,
    growth7d: repository.growth7d ?? latestSnapshot?.growth7d ?? null,
    growthPercent7d: repository.growthPercent7d ?? latestSnapshot?.growthPercent7d ?? null
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

function mapNotificationLog(log: NotificationLogRecord): NotificationLogItem {
  return {
    id: log.id,
    channel: log.channel,
    eventType: log.eventType,
    status: log.status,
    maskedTarget: log.maskedTarget,
    error: log.error,
    createdAt: log.createdAt.toISOString()
  };
}

function mapLastScan(scan: Awaited<ReturnType<typeof prisma.scanRun.findFirst>>): DashboardLastScan {
  return scan
    ? {
        startedAt: scan.startedAt.toISOString(),
        finishedAt: scan.finishedAt?.toISOString() ?? null,
        status: scan.status,
        reposFound: scan.reposFound,
        reposUpdated: scan.reposUpdated,
        errorMessage: scan.errorMessage
      }
    : null;
}

function sortRepositoriesByStrength(a: RepositoryListItem, b: RepositoryListItem) {
  return (
    b.trendScore - a.trendScore ||
    b.initialMomentumScore - a.initialMomentumScore ||
    b.relevanceScore - a.relevanceScore ||
    b.starsCurrent - a.starsCurrent
  );
}

function sortIdeasByOpportunity(a: IdeaListItem, b: IdeaListItem) {
  return (
    (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0) ||
    (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0) ||
    b.usefulnessScore - a.usefulnessScore ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function isActionItemVisibleNow(item: ActionItemListItem, now: Date) {
  if (item.status === "DONE" || item.status === "DISMISSED") {
    return false;
  }

  if (item.status !== "SNOOZED") {
    return true;
  }

  return !item.snoozedUntil || new Date(item.snoozedUntil).getTime() <= now.getTime();
}

function buildNextAction(input: {
  alerts: RadarTodayData["alerts"];
  actionItems: ActionItemListItem[];
  topRepositories: RepositoryListItem[];
  businessCandidates: IdeaListItem[];
  latestRepositories: RepositoryListItem[];
  lastScan: DashboardLastScan;
}): RadarNextAction {
  const blockingAlert = input.alerts.find((alert) => alert.level === "critical") ?? input.alerts.find((alert) => alert.level === "warning");
  if (blockingAlert) {
    return {
      id: `alert:${blockingAlert.id}`,
      kind: "alert",
      title: blockingAlert.title,
      description: blockingAlert.message,
      reason: "Najpierw usun blokery operacyjne, bo moga falszowac jakosc radaru.",
      actionLabel: "Sprawdz alert",
      repoId: null,
      ideaId: null,
      taskId: null
    };
  }

  const topTask = input.actionItems[0];
  if (topTask) {
    return {
      id: `task:${topTask.id}`,
      kind: "task",
      title: topTask.title,
      description: topTask.description ?? topTask.repoFullName ?? topTask.ideaTitle ?? "Zadanie bez dodatkowego opisu.",
      reason: "To najwyzej ocenione aktywne zadanie w kolejce.",
      actionLabel: "Przejdz do kolejki",
      repoId: topTask.repoId,
      ideaId: topTask.ideaId,
      taskId: topTask.id
    };
  }

  const topIdea = input.businessCandidates[0];
  if (topIdea) {
    return {
      id: `idea:${topIdea.id}`,
      kind: "idea",
      title: topIdea.title,
      description: topIdea.applicationSummary ?? topIdea.problem,
      reason: "Najmocniejszy kandydat biznesowy czeka na decyzje: rozwinac, zapisac albo odrzucic.",
      actionLabel: "Otworz kandydata",
      repoId: topIdea.sourceRepoId,
      ideaId: topIdea.id,
      taskId: null
    };
  }

  const topRepo = input.topRepositories[0] ?? input.latestRepositories[0];
  if (topRepo) {
    return {
      id: `repo:${topRepo.id}`,
      kind: "repo",
      title: topRepo.fullName,
      description: topRepo.shortSummaryPl ?? topRepo.description ?? "Repo wymaga szybkiego briefu przed pelnym raportem.",
      reason: topRepo.growth7d === null ? "Brak historii 7d, wiec zacznij od szybkiego briefu i README." : "Najmocniejszy aktualny sygnal repozytorium.",
      actionLabel: "Otworz brief",
      repoId: topRepo.id,
      ideaId: null,
      taskId: null
    };
  }

  return {
    id: "scan:run",
    kind: "scan",
    title: input.lastScan ? "Odswiez radar" : "Uruchom pierwszy scan",
    description: input.lastScan ? "Brak aktywnych decyzji. Nowy scan moze dostarczyc swieze sygnaly." : "Radar nie ma jeszcze danych skanu.",
    reason: "Bez swiezych danych nie ma wiarygodnej nastepnej decyzji.",
    actionLabel: "Uruchom scan",
    repoId: null,
    ideaId: null,
    taskId: null
  };
}

export function buildRadarToday(
  input: {
    repositories: RepositoryListItem[];
    ideas: IdeaListItem[];
    actionItems: ActionItemListItem[];
    lastScan: DashboardLastScan;
    settingsStatus: DashboardSettingsStatus;
    notificationStatus: DashboardNotificationStatus;
  },
  limit = 5,
  now = new Date()
): RadarTodayData {
  const activeRepositories = input.repositories.filter((repo) => repo.status !== "IGNORED" && !repo.isDeletedFromView);
  const topRepositories = [...activeRepositories].sort(sortRepositoriesByStrength).slice(0, limit);
  const newGems = [...activeRepositories]
    .filter((repo) => repo.status === "NEW")
    .sort(sortRepositoriesByStrength)
    .slice(0, limit);
  const highInitialMomentum = [...activeRepositories]
    .filter((repo) => repo.initialMomentumScore > 0)
    .sort((a, b) => b.initialMomentumScore - a.initialMomentumScore || sortRepositoriesByStrength(a, b))
    .slice(0, limit);
  const businessCandidates = input.ideas
    .filter((idea) => idea.status === IDEA_STATUS.CANDIDATE)
    .sort(sortIdeasByOpportunity)
    .slice(0, limit);
  const ideasToDevelop = input.ideas
    .filter((idea) => FULL_IDEA_STATUSES.includes(idea.status) || idea.status === IDEA_STATUS.SAVED)
    .sort(sortIdeasByOpportunity)
    .slice(0, limit);
  const latestRepositories = [...activeRepositories]
    .sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime())
    .slice(0, limit);
  const actionItems = input.actionItems
    .filter((item) => isActionItemVisibleNow(item, now))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        new Date(a.dueAt ?? "9999-12-31T00:00:00.000Z").getTime() -
          new Date(b.dueAt ?? "9999-12-31T00:00:00.000Z").getTime() ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
  const alerts: RadarTodayData["alerts"] = [];

  if (input.lastScan?.status === "FAILED") {
    alerts.push({
      id: "last-scan-failed",
      level: "critical",
      title: "Ostatni scan nie powiodl sie",
      message: input.lastScan.errorMessage ?? "Sprawdz logi skanu i konfiguracje GitHub."
    });
  }
  if (!input.settingsStatus.githubTokenConfigured) {
    alerts.push({
      id: "github-token-missing",
      level: "warning",
      title: "Brak GitHub token",
      message: "Skan moze szybciej trafic w rate limit bez lokalnego GITHUB_TOKEN."
    });
  }
  if (!input.settingsStatus.openAiConfigured) {
    alerts.push({
      id: "openai-missing",
      level: "info",
      title: "OpenAI nie jest skonfigurowane",
      message: "Raporty AI i pelne pomysly beda niedostepne do czasu ustawienia OPENAI_API_KEY."
    });
  }
  if (input.settingsStatus.autoOpportunityResearchEnabled) {
    alerts.push({
      id: "auto-research-enabled",
      level: "warning",
      title: "Auto research jest wlaczony",
      message: "Kontroluj dzienne limity, bo automatyczny research moze uzywac platnych API."
    });
  }
  if (input.notificationStatus.failed24h > 0) {
    alerts.push({
      id: "notification-failures",
      level: "warning",
      title: "Nieudane powiadomienia",
      message: `${input.notificationStatus.failed24h} powiadomien nie powiodlo sie w ostatnich 24h.`
    });
  }
  const limitedAlerts = alerts.slice(0, limit);
  const nextAction = buildNextAction({
    alerts: limitedAlerts,
    actionItems,
    topRepositories,
    businessCandidates,
    latestRepositories,
    lastScan: input.lastScan
  });

  return {
    generatedAt: now.toISOString(),
    nextAction,
    topRepositories,
    newGems,
    highInitialMomentum,
    businessCandidates,
    ideasToDevelop,
    actionItems,
    scanChanges: {
      lastScan: input.lastScan,
      latestRepositories
    },
    alerts: limitedAlerts
  };
}

async function getSettingsSummary(): Promise<SettingsSummary> {
  const config = getConfig();
  const [persistedSettings, githubRateLimit, aiJobSummary, aiCostSummary, observability, graphify] = await Promise.all([
    getAllSettings(),
    getStoredGitHubRateLimitSnapshot(),
    getAiJobSummary(),
    getAiCostSummary(),
    getObservabilitySummary(),
    getGraphifyMaintenanceSummary()
  ]);

  return {
    githubTokenConfigured: Boolean(config.githubToken),
    openAiConfigured: Boolean(config.openAiApiKey),
    discordWebhookConfigured: Boolean(config.discordWebhookUrl),
    autoGenerateWeeklyIdeas: parseBooleanSetting(persistedSettings.auto_generate_weekly_ideas, false),
    notificationsEnabled: parseBooleanSetting(persistedSettings.enable_local_notifications, config.enableNotifications),
    windowsNotificationsEnabled: config.enableWindowsNotifications,
    marketResearchEnabled: config.marketResearchEnabled,
    marketResearchMode: config.marketResearchMode,
    autoOpportunityResearchEnabled: config.enableAutoOpportunityResearch,
    openAiDailyAnalysisLimit: config.openAiDailyAnalysisLimit,
    marketResearchDailyLimit: config.marketResearchDailyLimit,
    externalResearchCacheTtlHours: config.externalResearchCacheTtlHours,
    reportsDir: config.reportsDir,
    persistedSettingCount: Object.keys(persistedSettings).length,
    aiJobSummary,
    aiCostSummary,
    observability,
    graphify,
    githubRateLimit
  };
}

function getDashboardSettingsStatus(): DashboardSettingsStatus {
  const config = getConfig();

  return {
    githubTokenConfigured: Boolean(config.githubToken),
    openAiConfigured: Boolean(config.openAiApiKey),
    autoOpportunityResearchEnabled: config.enableAutoOpportunityResearch
  };
}

async function getNotificationSummary(): Promise<NotificationSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [sent24h, failed24h, skipped24h, lastResults] = await Promise.all([
    prisma.notificationLog.count({ where: { status: "SENT", createdAt: { gte: since } } }),
    prisma.notificationLog.count({ where: { status: "FAILED", createdAt: { gte: since } } }),
    prisma.notificationLog.count({ where: { status: "SKIPPED", createdAt: { gte: since } } }),
    prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        channel: true,
        eventType: true,
        status: true,
        maskedTarget: true,
        error: true,
        createdAt: true
      }
    })
  ]);

  return {
    sent24h,
    failed24h,
    skipped24h,
    lastResults: lastResults.map(mapNotificationLog)
  };
}

async function getDashboardNotificationStatus(): Promise<DashboardNotificationStatus> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const failed24h = await prisma.notificationLog.count({ where: { status: "FAILED", createdAt: { gte: since } } });

  return { failed24h };
}

export async function getSettingsPanelData(): Promise<SettingsPanelData> {
  const [settingsSummary, notificationSummary] = await Promise.all([getSettingsSummary(), getNotificationSummary()]);

  return {
    settingsSummary,
    notificationSummary
  };
}

export async function getIdeasPanelData(): Promise<IdeasPanelData> {
  const ideas = await prisma.idea.findMany({
    orderBy: { createdAt: "desc" },
    include: ideaListInclude
  });

  return {
    ideas: ideas.map(mapIdea)
  };
}

export async function getTasksPanelData(): Promise<TasksPanelData> {
  const actionItems = await getActionItems(null);

  return {
    actionItems
  };
}

export async function getWeeklyReportsPanelData(): Promise<WeeklyReportsPanelData> {
  const weeklyReports = await prisma.report.findMany({
    where: { type: "weekly" },
    orderBy: { createdAt: "desc" }
  });

  return {
    weeklyReports: weeklyReports.map(mapReport)
  };
}

function buildRepositoryPage(items: RepositoryListItem[], total: number, page = DEFAULT_REPOSITORY_PAGE, pageSize = DEFAULT_REPOSITORY_PAGE_SIZE): RepositoryPage {
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total
  };
}

function normalizeRepositoryPageInput(input: RepositoryPageInput = {}) {
  const page = Math.max(1, Math.floor(input.page ?? DEFAULT_REPOSITORY_PAGE));
  const pageSize = Math.min(MAX_REPOSITORY_PAGE_SIZE, Math.max(1, Math.floor(input.pageSize ?? DEFAULT_REPOSITORY_PAGE_SIZE)));

  return {
    tab: input.tab ?? "library",
    query: input.query?.trim() ?? "",
    status: input.status ?? "ALL",
    language: input.language ?? "ALL",
    profile: input.profile ?? "ALL",
    minTrend: Math.min(100, Math.max(0, Math.floor(input.minTrend ?? 0))),
    sortKey: input.sortKey ?? "trend_desc",
    page,
    pageSize
  };
}

function buildRepositoryWhere(input: ReturnType<typeof normalizeRepositoryPageInput>): Prisma.RepositoryWhereInput {
  const filters: Prisma.RepositoryWhereInput[] = [];

  switch (input.tab) {
    case "new":
      filters.push({ status: "NEW", isDeletedFromView: false });
      break;
    case "saved":
      filters.push({ status: "SAVED", isDeletedFromView: false });
      break;
    case "read":
      filters.push({ status: "READ", isDeletedFromView: false });
      break;
    case "ignored":
      filters.push({ OR: [{ status: "IGNORED" }, { isDeletedFromView: true }] });
      break;
    case "old":
      filters.push({ isOldRepo: true, status: { not: "HOT" }, isDeletedFromView: false });
      break;
    default:
      filters.push({ isDeletedFromView: false });
      break;
  }

  if (input.status !== "ALL" && isRepositoryStatus(input.status)) {
    filters.push({ status: input.status });
  }

  if (input.language !== "ALL") {
    filters.push({ primaryLanguage: input.language });
  }

  if (input.profile !== "ALL") {
    filters.push({ discoveryProfilesJson: { contains: input.profile } });
  }

  if (input.minTrend > 0) {
    filters.push({ trendScore: { gte: input.minTrend } });
  }

  if (input.query) {
    filters.push({
      OR: [
        { fullName: { contains: input.query } },
        { owner: { contains: input.query } },
        { name: { contains: input.query } },
        { description: { contains: input.query } },
        { shortSummaryPl: { contains: input.query } },
        { primaryLanguage: { contains: input.query } },
        { topicsJson: { contains: input.query } }
      ]
    });
  }

  return { AND: filters };
}

function buildRepositoryOrderBy(sortKey: string): Prisma.RepositoryOrderByWithRelationInput[] {
  switch (sortKey) {
    case "stars_desc":
      return [{ starsCurrent: "desc" }, { trendScore: "desc" }];
    case "pushed_desc":
      return [{ pushedAt: { sort: "desc", nulls: "last" } }, { trendScore: "desc" }];
    case "first_seen_desc":
      return [{ firstSeenAt: "desc" }, { trendScore: "desc" }];
    case "growth7d_desc":
      return [{ growth7d: "desc" }, { trendScore: "desc" }];
    case "name_asc":
      return [{ fullName: "asc" }];
    case "trend_desc":
    default:
      return [{ trendScore: "desc" }, { initialMomentumScore: "desc" }, { starsCurrent: "desc" }];
  }
}

async function getRadarRepositories(limit = 25): Promise<RepositoryListItem[]> {
  const [topRepositories, newRepositories, momentumRepositories, latestRepositories] = await Promise.all([
    prisma.repository.findMany({
      where: { status: { not: "IGNORED" }, isDeletedFromView: false },
      orderBy: [{ trendScore: "desc" }, { initialMomentumScore: "desc" }, { starsCurrent: "desc" }],
      take: limit,
      include: latestSnapshotInclude
    }),
    prisma.repository.findMany({
      where: { status: "NEW", isDeletedFromView: false },
      orderBy: [{ trendScore: "desc" }, { initialMomentumScore: "desc" }, { starsCurrent: "desc" }],
      take: limit,
      include: latestSnapshotInclude
    }),
    prisma.repository.findMany({
      where: { status: { not: "IGNORED" }, isDeletedFromView: false, initialMomentumScore: { gt: 0 } },
      orderBy: [{ initialMomentumScore: "desc" }, { trendScore: "desc" }],
      take: limit,
      include: latestSnapshotInclude
    }),
    prisma.repository.findMany({
      where: { status: { not: "IGNORED" }, isDeletedFromView: false },
      orderBy: [{ firstSeenAt: "desc" }],
      take: limit,
      include: latestSnapshotInclude
    })
  ]);
  const byId = new Map<string, RepositoryListItem>();

  for (const repository of [...topRepositories, ...newRepositories, ...momentumRepositories, ...latestRepositories]) {
    byId.set(repository.id, mapRepository(repository));
  }

  return [...byId.values()];
}

async function getRejectCandidates(limit = 3): Promise<RepositoryListItem[]> {
  const repositories = await prisma.repository.findMany({
    where: {
      isDeletedFromView: false,
      status: { not: "IGNORED" },
      OR: [{ isOldRepo: true }, { trendScore: { lt: 45 } }]
    },
    orderBy: [{ trendScore: "asc" }, { ageMonths: "desc" }],
    take: limit,
    include: latestSnapshotInclude
  });

  return repositories.map(mapRepository);
}

async function getRadarIdeas(limit = 5): Promise<IdeaListItem[]> {
  const [businessCandidates, ideasToDevelop] = await Promise.all([
    prisma.idea.findMany({
      where: { status: IDEA_STATUS.CANDIDATE },
      orderBy: ideaOpportunityOrderBy,
      take: limit,
      include: ideaListInclude
    }),
    prisma.idea.findMany({
      where: { status: { in: [...FULL_IDEA_STATUSES, IDEA_STATUS.SAVED] } },
      orderBy: ideaOpportunityOrderBy,
      take: limit,
      include: ideaListInclude
    })
  ]);
  const byId = new Map<string, IdeaListItem>();

  for (const idea of [...businessCandidates, ...ideasToDevelop]) {
    byId.set(idea.id, mapIdea(idea));
  }

  return [...byId.values()];
}

export async function getRepositoryPage(input: RepositoryPageInput = {}): Promise<RepositoryPage> {
  const normalized = normalizeRepositoryPageInput(input);
  const where = buildRepositoryWhere(normalized);
  const skip = (normalized.page - 1) * normalized.pageSize;

  const [repositories, total] = await Promise.all([
    prisma.repository.findMany({
      where,
      orderBy: buildRepositoryOrderBy(normalized.sortKey),
      skip,
      take: normalized.pageSize,
      include: latestSnapshotInclude
    }),
    prisma.repository.count({ where })
  ]);

  return buildRepositoryPage(repositories.map(mapRepository), total, normalized.page, normalized.pageSize);
}

async function getRepositoryFilterOptions(): Promise<RepositoryFilterOptions> {
  const [languageRows, profileRows] = await Promise.all([
    prisma.repository.findMany({
      where: {
        isDeletedFromView: false,
        primaryLanguage: { not: null }
      },
      distinct: ["primaryLanguage"],
      select: { primaryLanguage: true },
      orderBy: { primaryLanguage: "asc" }
    }),
    prisma.repository.findMany({
      where: { isDeletedFromView: false },
      select: { discoveryProfilesJson: true }
    })
  ]);
  const discoveryProfiles = new Set<string>();

  for (const row of profileRows) {
    for (const profile of safeJsonParse<string[]>(row.discoveryProfilesJson, [])) {
      discoveryProfiles.add(profile);
    }
  }

  return {
    languages: languageRows.map((row) => row.primaryLanguage).filter((language): language is string => Boolean(language)),
    discoveryProfiles: [...discoveryProfiles].sort()
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    repositoryPage,
    repositoryFilterOptions,
    radarRepositories,
    rejectCandidates,
    radarIdeas,
    radarActionItems,
    lastScan,
    counts,
    settingsStatus,
    notificationStatus
  ] = await Promise.all([
    getRepositoryPage(),
    getRepositoryFilterOptions(),
    getRadarRepositories(),
    getRejectCandidates(),
    getRadarIdeas(),
    getActiveActionItems(25),
    prisma.scanRun.findFirst({
      orderBy: { startedAt: "desc" }
    }),
    getCounts(),
    getDashboardSettingsStatus(),
    getDashboardNotificationStatus()
  ]);
  const lastScanSummary = mapLastScan(lastScan);

  return {
    repositories: repositoryPage.items,
    rejectCandidates,
    repositoryPage,
    repositoryFilterOptions,
    radarToday: buildRadarToday({
      repositories: radarRepositories,
      ideas: radarIdeas,
      actionItems: radarActionItems,
      lastScan: lastScanSummary,
      settingsStatus,
      notificationStatus
    }),
    counts,
    lastScan: lastScanSummary
  };
}

async function getCounts() {
  const [all, newlyFound, saved, read, ignored, ideas, candidates, fullIdeas, savedIdeas, dismissedIdeas, old, hot, actionItems] = await Promise.all([
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
    prisma.repository.count({ where: { status: "HOT", isDeletedFromView: false } }),
    prisma.actionItem.count({ where: { status: { notIn: ["DONE", "DISMISSED"] } } })
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
    hot,
    actionItems
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

  const repository = await prisma.repository.findUniqueOrThrow({
    where: { id: repoId },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1
      }
    }
  });
  const nextStatus: RepositoryStatus = status;
  let updatedRepository: Repository;

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

    updatedRepository = await prisma.repository.update({
      where: { id: repoId },
      data: {
        status: nextStatus,
        isDeletedFromView: true
      }
    });
  } else {
    await prisma.ignoredRepository.deleteMany({
      where: {
        OR: [{ repoId }, { fullName: repository.fullName }]
      }
    });

    updatedRepository = await prisma.repository.update({
      where: { id: repoId },
      data: {
        status: nextStatus,
        isDeletedFromView: false
      }
    });
  }

  await recordRepositoryStatusAudit({
    repository: {
      ...repository,
      status: updatedRepository.status
    },
    previousStatus: repository.status,
    nextStatus,
    reason
  });

  return updatedRepository;
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
