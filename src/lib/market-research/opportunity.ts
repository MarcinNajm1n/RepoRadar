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

function keywordScore(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  const hits = keywords.filter((keyword) => normalized.includes(keyword)).length;
  return clamp(hits / 4, 0, 1);
}

export function calculateOpportunityScore(input: OpportunityScoreInput) {
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
  const repoScore = clamp((input.trendScore * 0.6 + input.relevanceScore * 0.4) / 100, 0, 1);
  const businessFitScore = keywordScore(evidenceText, BUSINESS_KEYWORDS);
  const savingsScore = keywordScore(evidenceText, SAVINGS_KEYWORDS);

  return Math.round(
    100 *
      (0.18 * repoScore +
        0.18 * sourceCountScore +
        0.18 * confidenceScore +
        0.16 * problemScore +
        0.14 * demandScore +
        0.1 * businessFitScore +
        0.06 * savingsScore)
  );
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
