export type MarketResearchSourceInput = {
  sourceType: string;
  title: string;
  url: string;
  publisher?: string | null;
  publishedAt?: string | null;
  snippet: string;
  sentiment?: string | null;
  relevanceScore?: number | null;
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
};

export type StoredMarketResearch = MarketResearchResult & {
  runId?: string;
  sourceIds: string[];
  status: "DISABLED" | "CACHED" | "SUCCESS" | "UNAVAILABLE";
  error?: string;
};

export type MarketResearchContext = {
  kind: "repo-report" | "idea";
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
  research(context: MarketResearchContext): Promise<MarketResearchResult>;
}
