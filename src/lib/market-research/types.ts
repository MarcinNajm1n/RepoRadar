export type MarketResearchMode = "light" | "full";

export type EvidenceKind =
  | "demand_signal"
  | "pain_point"
  | "alternative"
  | "competitor"
  | "pricing"
  | "manual_workflow"
  | "automation_request"
  | "risk"
  | "technical_context"
  | "launch_signal"
  | "other";

export type MarketResearchSourceInput = {
  sourceType: string;
  title: string;
  url: string;
  publisher?: string | null;
  publishedAt?: string | null;
  snippet: string;
  sentiment?: string | null;
  relevanceScore?: number | null;
  canonicalUrl?: string | null;
  sourceKey?: string | null;
  evidenceKind?: EvidenceKind | string | null;
  whatItProves?: string | null;
  sourceConfidence?: number | null;
  sourceRank?: number | null;
  providerItemId?: string | null;
};

export type MarketResearchResult = {
  provider: string;
  summary: string;
  signals: string[];
  userProblems: string[];
  sentiment: string;
  demandEvidence: string[];
  validationRisks: string[];
  confidenceScore: number | null;
  sources: MarketResearchSourceInput[];
  queries?: string[];
  providers?: string[];
  independentSourceCount?: number;
  evidenceSummary?: string | null;
  conflictSummary?: string | null;
};

export type StoredMarketResearch = MarketResearchResult & {
  runId?: string;
  runIds?: string[];
  sourceIds: string[];
  status: "DISABLED" | "CACHED" | "SUCCESS" | "UNAVAILABLE";
  error?: string;
};

export type MarketResearchContext = {
  kind: "repo-report" | "idea" | "opportunity-candidate";
  mode?: MarketResearchMode;
  repoId: string;
  fullName: string;
  url: string;
  description?: string | null;
  primaryLanguage?: string | null;
  topics: string[];
  starsCurrent: number;
  forksCurrent: number;
  openIssues: number;
  trendScore: number;
  relevanceScore: number;
  readmeHash?: string | null;
  readmeExcerpt?: string | null;
  repositoryContext: string;
};

export interface MarketResearchProvider {
  name: string;
  usesOpenAi?: boolean;
  research(context: MarketResearchContext): Promise<MarketResearchResult>;
}
