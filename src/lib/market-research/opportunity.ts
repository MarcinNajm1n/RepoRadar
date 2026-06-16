import { getConfig } from "@/lib/config";
import { clamp, sanitizeExternalText } from "@/lib/utils";
import type { MarketResearchResult } from "./types";

const BUSINESS_KEYWORDS = [
  "b2b",
  "devtools",
  "developer",
  "workflow",
  "automation",
  "saas",
  "team",
  "teams",
  "cost",
  "time",
  "productivity",
  "compliance",
  "ops",
  "it",
  "ci",
  "deployment"
];

const SAVINGS_KEYWORDS = ["save", "saving", "cost", "time", "hours", "manual", "automate", "faster", "reduce", "productivity"];

export type OpportunityScoreInput = {
  trendScore: number;
  relevanceScore: number;
  starsCurrent: number;
  research: Pick<
    MarketResearchResult,
    "sources" | "signals" | "userProblems" | "demandEvidence" | "validationRisks" | "confidenceScore" | "sentiment" | "summary"
  >;
};

export type OpportunityScoreBreakdown = {
  sourcePoints: number;
  confidencePoints: number;
  b2bFitPoints: number;
  problemClarityPoints: number;
  timeSavingPoints: number;
  mvpFeasibilityPoints: number;
  competitionPenalty: number;
  customerAcquisitionPenalty: number;
};

function keywordScore(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  const hits = keywords.filter((keyword) => normalized.includes(keyword)).length;
  return clamp(hits / 4, 0, 1);
}

function penaltyScore(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword)).length;
}

export function calculateOpportunityScoreWithBreakdown(input: OpportunityScoreInput) {
  const evidenceText = [
    input.research.summary,
    ...input.research.signals,
    ...input.research.userProblems,
    ...input.research.demandEvidence,
    ...input.research.sources.map((source) => `${source.title} ${source.snippet}`)
  ].join(" ");
  const sourceCountScore = clamp(input.research.sources.length / 5, 0, 1);
  const confidenceScore = clamp((input.research.confidenceScore ?? 1) / 5, 0, 1);
  const problemScore = clamp(input.research.userProblems.length / 4, 0, 1);
  const demandScore = clamp(input.research.demandEvidence.length / 4, 0, 1);
  const businessFitScore = keywordScore(evidenceText, BUSINESS_KEYWORDS);
  const savingsScore = keywordScore(evidenceText, SAVINGS_KEYWORDS);
  const mvpFeasibilityScore = keywordScore(evidenceText, [
    "mvp",
    "prototype",
    "internal",
    "simple",
    "workflow",
    "automation",
    "api",
    "dashboard"
  ]);
  const competitionPenalty = -Math.min(
    10,
    penaltyScore(evidenceText, ["crowded", "saturated", "competition", "competitor", "alternative", "alternatives"]) * 3
  );
  const customerAcquisitionPenalty = -Math.min(
    8,
    penaltyScore(evidenceText, ["unclear buyer", "hard to sell", "no budget", "consumer", "hobby"]) * 4
  );
  const breakdown: OpportunityScoreBreakdown = {
    sourcePoints: Math.round(18 * sourceCountScore),
    confidencePoints: Math.round(18 * confidenceScore),
    b2bFitPoints: Math.round(15 * businessFitScore),
    problemClarityPoints: Math.round(16 * problemScore),
    timeSavingPoints: Math.round(14 * savingsScore),
    mvpFeasibilityPoints: Math.round(12 * Math.max(mvpFeasibilityScore, demandScore * 0.6)),
    competitionPenalty,
    customerAcquisitionPenalty
  };
  const total =
    breakdown.sourcePoints +
    breakdown.confidencePoints +
    breakdown.b2bFitPoints +
    breakdown.problemClarityPoints +
    breakdown.timeSavingPoints +
    breakdown.mvpFeasibilityPoints +
    breakdown.competitionPenalty +
    breakdown.customerAcquisitionPenalty;

  return {
    score: Math.round(clamp(total, 0, 100)),
    breakdown
  };
}

export function calculateOpportunityScore(input: OpportunityScoreInput) {
  return calculateOpportunityScoreWithBreakdown(input).score;
}

export function isExcellentOpportunity(input: { opportunityScore: number | null; confidenceScore: number | null; sourceCount: number; text: string }) {
  const config = getConfig();
  return (
    (input.opportunityScore ?? 0) >= config.opportunityNotificationMinScore &&
    (input.confidenceScore ?? 0) >= config.opportunityMinConfidence &&
    input.sourceCount >= config.opportunityMinSources &&
    keywordScore(input.text, BUSINESS_KEYWORDS) > 0 &&
    keywordScore(input.text, SAVINGS_KEYWORDS) > 0
  );
}

export function buildOpportunityFallback(input: { fullName: string; research: MarketResearchResult }) {
  const firstProblem = input.research.userProblems[0] ?? input.research.signals[0] ?? "Problem wymaga recznej walidacji.";
  const title = sanitizeExternalText(`Kandydat: ${input.fullName}`, 180) ?? `Kandydat: ${input.fullName}`;
  const applicationSummary =
    sanitizeExternalText(firstProblem, 500) ?? "Potencjalne zastosowanie wymaga sprawdzenia na podstawie zrodel.";
  const businessRationale =
    sanitizeExternalText(input.research.demandEvidence[0] ?? input.research.summary, 700) ??
    "Za malo danych, aby mocno uzasadnic potencjal biznesowy.";

  return {
    title,
    applicationSummary,
    businessRationale
  };
}
