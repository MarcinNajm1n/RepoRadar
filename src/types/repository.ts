import type { ActionItemListItem } from "./action-item";
import type { AiCostSummary } from "./ai-cost";
import type { AiJobListItem, AiJobSummary } from "./ai-job";

export type ScoreBreakdown = {
  absoluteGrowthPoints: number;
  percentageGrowthPoints: number;
  agePoints: number;
  totalStarsPoints: number;
  forksPoints: number;
  pushFreshnessPoints: number;
  topicRelevancePoints: number;
  readmeQualityPoints: number;
  keywordRelevancePoints: number;
  initialMomentumPoints: number;
  usedInitialMomentumFallback: boolean;
};

export type RepositoryListItem = {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string | null;
  readmeExcerpt: string | null;
  primaryLanguage: string | null;
  topics: string[];
  license: string | null;
  createdAt: string;
  pushedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  starsCurrent: number;
  forksCurrent: number;
  watchersCurrent: number;
  openIssues: number;
  ageMonths: number;
  isOldRepo: boolean;
  isArchived: boolean;
  isFork: boolean;
  isDeletedFromView: boolean;
  status: string;
  shortSummaryPl: string | null;
  lastAnalyzedAt: string | null;
  trendScore: number;
  relevanceScore: number;
  initialMomentumScore: number;
  scoreBreakdown: ScoreBreakdown;
  discoveryProfiles: string[];
  source: string;
  growth24h: number | null;
  growth7d: number | null;
  growthPercent7d: number | null;
};

export type EvidenceSourceItem = {
  id: string;
  sourceType: string;
  title: string;
  url: string;
  publisher: string | null;
  retrievedAt: string;
  publishedAt: string | null;
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

export type IdeaListItem = {
  id: string;
  sourceRepoId: string;
  sourceRepoName: string;
  title: string;
  problem: string;
  proposedSolution: string;
  targetUser: string;
  mvpScope: string;
  monetizationPotential: string;
  difficulty: number;
  usefulnessScore: number;
  riskScore: number;
  confidenceScore: number | null;
  opportunityScore: number | null;
  opportunityBreakdown: Record<string, number>;
  applicationSummary: string | null;
  businessRationale: string | null;
  researchMode: string;
  marketSummary: string | null;
  suggestedStack: string;
  firstSteps: string[];
  evidenceIds: string[];
  evidenceSources: EvidenceSourceItem[];
  status: string;
  lastResearchAt: string | null;
  createdAt: string;
};

export type ReportListItem = {
  id: string;
  type: string;
  repoId: string | null;
  title: string;
  markdownPath: string | null;
  contentMarkdown: string;
  summary: string | null;
  repoCount: number;
  topRepoIds: string[];
  createdAt: string;
};

export type DashboardAlert = {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
};

export type RepositoryTimelineItem = {
  id: string;
  type: "scan" | "snapshot" | "report" | "status" | "action";
  title: string;
  detail: string;
  timestamp: string;
  tone: "neutral" | "positive" | "warning";
};

export type RadarNextAction = {
  id: string;
  kind: "alert" | "task" | "repo" | "idea" | "scan";
  title: string;
  description: string;
  reason: string;
  actionLabel: string;
  repoId: string | null;
  ideaId: string | null;
  taskId: string | null;
};

export type ObservabilitySummary = {
  lastScan: {
    status: string;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    reposFound: number;
    reposUpdated: number;
    errorMessage: string | null;
  } | null;
  recentScanCount: number;
  failedScans24h: number;
  averageScanDurationMs: number | null;
  totalRepositories: number;
  openAiCacheEntries: number;
  externalResearchCacheEntries: number;
  expiredExternalResearchCacheEntries: number;
  marketResearchRuns24h: number;
  marketResearchSources24h: number;
  githubRuntime: {
    requests: number;
    cacheHits: number;
    notModifiedHits: number;
    cacheWrites: number;
    cacheEntries: number;
    maxEntries: number;
  };
};

export type GraphifyMaintenanceSummary = {
  status: "ready" | "partial" | "missing";
  graphExists: boolean;
  nodeCount: number;
  edgeCount: number;
  communityCount: number;
  manifestFileCount: number;
  graphSizeBytes: number;
  reportSizeBytes: number;
  lastUpdatedAt: string | null;
  packageVersion: string | null;
  skillVersion: string | null;
  skillPath: string | null;
  note: string;
};

export type SettingsSummary = {
  githubTokenConfigured: boolean;
  openAiConfigured: boolean;
  discordWebhookConfigured: boolean;
  autoGenerateWeeklyIdeas: boolean;
  notificationsEnabled: boolean;
  windowsNotificationsEnabled: boolean;
  marketResearchEnabled: boolean;
  marketResearchMode: "light" | "full";
  autoOpportunityResearchEnabled: boolean;
  openAiDailyAnalysisLimit: number;
  marketResearchDailyLimit: number;
  externalResearchCacheTtlHours: number;
  reportsDir: string;
  persistedSettingCount: number;
  aiJobSummary: AiJobSummary;
  recentAiJobs: AiJobListItem[];
  aiCostSummary: AiCostSummary;
  observability: ObservabilitySummary;
  graphify: GraphifyMaintenanceSummary;
  githubRateLimit: {
    checkedAt: string;
    status: number;
    resource: string | null;
    limit: number | null;
    remaining: number | null;
    used: number | null;
    resetAt: string | null;
  } | null;
};

export type NotificationLogItem = {
  id: string;
  channel: string;
  eventType: string;
  status: string;
  maskedTarget: string | null;
  error: string | null;
  createdAt: string;
};

export type NotificationSummary = {
  sent24h: number;
  failed24h: number;
  skipped24h: number;
  lastResults: NotificationLogItem[];
};

export type DashboardSettingsStatus = {
  githubTokenConfigured: boolean;
  openAiConfigured: boolean;
  autoOpportunityResearchEnabled: boolean;
};

export type DashboardNotificationStatus = {
  failed24h: number;
};

export type SettingsPanelData = {
  settingsSummary: SettingsSummary;
  notificationSummary: NotificationSummary;
};

export type IdeasPanelData = {
  ideas: IdeaListItem[];
};

export type TasksPanelData = {
  actionItems: ActionItemListItem[];
};

export type WeeklyReportsPanelData = {
  weeklyReports: ReportListItem[];
};

export type DashboardLastScan = {
  startedAt: string;
  finishedAt: string | null;
  status: string;
  reposFound: number;
  reposUpdated: number;
  errorMessage: string | null;
} | null;

export type RadarTodayData = {
  generatedAt: string;
  nextAction: RadarNextAction;
  topRepositories: RepositoryListItem[];
  newGems: RepositoryListItem[];
  highInitialMomentum: RepositoryListItem[];
  businessCandidates: IdeaListItem[];
  ideasToDevelop: IdeaListItem[];
  actionItems: ActionItemListItem[];
  scanChanges: {
    lastScan: DashboardLastScan;
    latestRepositories: RepositoryListItem[];
  };
  alerts: DashboardAlert[];
};

export type DashboardData = {
  repositories: RepositoryListItem[];
  rejectCandidates: RepositoryListItem[];
  repositoryPage: RepositoryPage;
  repositoryFilterOptions: RepositoryFilterOptions;
  radarToday: RadarTodayData;
  counts: {
    all: number;
    new: number;
    saved: number;
    read: number;
    ignored: number;
    ideas: number;
    candidates: number;
    fullIdeas: number;
    savedIdeas: number;
    dismissedIdeas: number;
    old: number;
    hot: number;
    actionItems: number;
  };
  lastScan: DashboardLastScan;
};

export type RepositoryPage = {
  items: RepositoryListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type RepositoryFilterOptions = {
  languages: string[];
  discoveryProfiles: string[];
};

export type RepositoryPageInput = {
  tab?: string;
  query?: string;
  status?: string;
  language?: string;
  profile?: string;
  minTrend?: number;
  sortKey?: string;
  page?: number;
  pageSize?: number;
};

export type RepositoryFilters = {
  status?: string;
  query?: string;
  oldOnly?: boolean;
  includeIgnored?: boolean;
};
