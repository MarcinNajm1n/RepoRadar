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
  applicationSummary: string | null;
  businessRationale: string | null;
  researchMode: string;
  marketSummary: string | null;
  suggestedStack: string;
  firstSteps: string[];
  evidenceIds: string[];
  evidenceSources: EvidenceSourceItem[];
  status: string;
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

export type DashboardData = {
  repositories: RepositoryListItem[];
  ideas: IdeaListItem[];
  weeklyReports: ReportListItem[];
  counts: {
    all: number;
    new: number;
    saved: number;
    read: number;
    ignored: number;
    ideas: number;
    candidates: number;
    fullIdeas: number;
    old: number;
    hot: number;
  };
  lastScan: {
    startedAt: string;
    finishedAt: string | null;
    status: string;
    reposFound: number;
    reposUpdated: number;
    errorMessage: string | null;
  } | null;
};

export type RepositoryFilters = {
  status?: string;
  query?: string;
  oldOnly?: boolean;
  includeIgnored?: boolean;
};
