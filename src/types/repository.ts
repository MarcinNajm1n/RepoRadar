import type { ActionItemListItem } from "./action-item";
import type { AiCostSummary } from "./ai-cost";
import type { AiJobListItem, AiJobQueueSummary, AiJobSummary } from "./ai-job";

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

export type WeeklyReportComparison = {
  currentNames: string[];
  previousNames: string[];
  retained: string[];
  added: string[];
  dropped: string[];
  currentRepoCount: number;
  previousRepoCount: number | null;
  repoCountDelta: number | null;
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

export type RepositoryDecisionNextAction = {
  id: string;
  kind: "quick_brief" | "full_report" | "open_task" | "research_evidence" | "status_decision" | "monitor";
  title: string;
  description: string;
  reason: string;
  actionLabel: string;
  tone: "neutral" | "info" | "success" | "warning";
  taskId: string | null;
};

export type RepositoryDecisionContext = {
  repoId: string;
  generatedAt: string;
  nextAction: RepositoryDecisionNextAction;
  signals: {
    id: string;
    label: string;
    value: string;
    tone: "neutral" | "info" | "success" | "warning";
  }[];
  reports: {
    totalCount: number;
    quickBriefCount: number;
    fullReportCount: number;
    decisionLogCount: number;
    scoringSnapshotCount: number;
    recent: {
      id: string;
      type: string;
      title: string;
      summary: string | null;
      createdAt: string;
    }[];
  };
  tasks: {
    openCount: number;
    recentOpen: {
      id: string;
      type: string;
      status: string;
      title: string;
      priority: number;
      dueAt: string | null;
      snoozedUntil: string | null;
      createdAt: string;
    }[];
  };
  evidence: {
    sourceCount: number;
    researchRunCount: number;
    lastResearchAt: string | null;
    sourceTypes: string[];
    summary: string;
    topSources: {
      id: string;
      sourceType: string;
      title: string;
      publisher: string | null;
      retrievedAt: string;
      evidenceKind: string | null;
      whatItProves: string | null;
      sourceConfidence: number | null;
    }[];
  };
  snapshots: {
    totalCount: number;
    latestCapturedAt: string | null;
    growth24h: number | null;
    growth7d: number | null;
    growthPercent7d: number | null;
  };
  status: {
    current: string;
    needsDecision: boolean;
    lastAnalyzedAt: string | null;
  };
};

export type RadarNextAction = {
  id: string;
  kind: "alert" | "task" | "repo" | "idea" | "scan";
  title: string;
  description: string;
  reason: string;
  signals: string[];
  actionLabel: string;
  repoId: string | null;
  ideaId: string | null;
  taskId: string | null;
};

export type RadarFirstRunStep = {
  id: "local_data" | "github_token" | "first_scan" | "decision_queue" | "openai" | "portfolio_screenshots";
  title: string;
  description: string;
  status: "done" | "todo" | "optional";
  priority: "required" | "optional";
  action: "open_library" | "open_settings" | "run_scan" | "open_tasks" | "none";
  command: string | null;
};

export type RadarFirstRunOnboarding = {
  visible: boolean;
  completedCount: number;
  totalCount: number;
  steps: RadarFirstRunStep[];
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

export type MaintenancePreviewSummary = {
  generatedAt: string;
  externalResearchCache: {
    expiredEntries: number;
  };
  notificationLogs: {
    daysToKeep: number;
    cutoff: string;
    oldEntries: number;
  };
  snapshots: {
    daysToKeep: number;
    cutoff: string;
    oldEntries: number;
    affectedRepositories: number;
    repositoriesLosingAllSnapshots: number;
  };
};

export type OpenAiCacheSummary = {
  totalEntries: number;
  byKind: {
    kind: string;
    count: number;
  }[];
  recentEntries: {
    id: string;
    kind: string;
    repoFullName: string | null;
    model: string;
    createdAt: string;
  }[];
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
  aiJobQueue: AiJobQueueSummary;
  recentAiJobs: AiJobListItem[];
  aiCostSummary: AiCostSummary;
  openAiCache: OpenAiCacheSummary;
  observability: ObservabilitySummary;
  graphify: GraphifyMaintenanceSummary;
  maintenancePreview: MaintenancePreviewSummary;
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
  comparison?: WeeklyReportComparison | null;
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
  firstRun: RadarFirstRunOnboarding;
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
