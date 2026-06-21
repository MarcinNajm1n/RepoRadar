import type { ActionItemListItem } from "./action-item";

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
  ideas: IdeaListItem[];
  actionItems: ActionItemListItem[];
  weeklyReports: ReportListItem[];
  radarToday: RadarTodayData;
  settingsSummary: SettingsSummary;
  notificationSummary: NotificationSummary;
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
