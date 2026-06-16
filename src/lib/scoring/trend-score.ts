import type { RepositoryStatus } from "@/types/status";
import { getConfig } from "@/lib/config";
import { clamp, monthsBetween } from "@/lib/utils";
import { TEXT_KEYWORDS, TOPIC_KEYWORDS } from "./keywords";

export type ScoreInput = {
  starsCurrent: number;
  forksCurrent: number;
  createdAt: Date;
  pushedAt: Date | null;
  topics: string[];
  description?: string | null;
  readmeText?: string | null;
  readmeExcerpt?: string | null;
  primaryLanguage?: string | null;
  growth7d: number | null;
  growthPercent7d: number | null;
  starsBefore7d: number | null;
};

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

export type ScoreResult = {
  trendScore: number;
  relevanceScore: number;
  initialMomentumScore: number;
  scoreBreakdown: ScoreBreakdown;
  ageMonths: number;
  isOldRepo: boolean;
  status: RepositoryStatus;
  components: {
    absoluteGrowthScore: number;
    percentageGrowthScore: number;
    ageScore: number;
    totalStarsScore: number;
    forksScore: number;
    pushFreshnessScore: number;
    topicRelevanceScore: number;
    readmeQualityScore: number;
    keywordRelevanceScore: number;
  };
};

function normalizedKeywordHits(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  const hits = keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
  return clamp(hits / 6, 0, 1);
}

function scoreReadmeQuality(readmeText?: string | null) {
  if (!readmeText) {
    return 0;
  }

  const text = readmeText.toLowerCase();
  const lengthScore = clamp(readmeText.length / 6000, 0, 1);
  const structureHits = ["install", "usage", "example", "quickstart", "demo", "api"].filter((term) =>
    text.includes(term)
  ).length;
  return clamp(lengthScore * 0.6 + clamp(structureHits / 4, 0, 1) * 0.4, 0, 1);
}

function scorePushFreshness(pushedAt: Date | null) {
  if (!pushedAt) {
    return 0;
  }

  const days = Math.max(0, (Date.now() - pushedAt.getTime()) / 86400000);
  if (days <= 14) {
    return 1;
  }

  return clamp(1 - (days - 14) / 166, 0, 1);
}

function calculateInitialMomentumScore(input: ScoreInput, scores: {
  pushFreshnessScore: number;
  forksScore: number;
  topicRelevanceScore: number;
  readmeQualityScore: number;
  keywordRelevanceScore: number;
  totalStarsScore: number;
}) {
  const ageDays = Math.max(1, (Date.now() - input.createdAt.getTime()) / 86400000);
  const starsPerDay = input.starsCurrent / ageDays;
  const forksPerDay = input.forksCurrent / ageDays;
  const starsPerAgeScore = clamp(Math.log1p(starsPerDay) / Math.log1p(250), 0, 1);
  const forksPerAgeScore = clamp(Math.log1p(forksPerDay) / Math.log1p(40), 0, 1);

  return Math.round(
    clamp(
      25 * starsPerAgeScore +
        20 * scores.pushFreshnessScore +
        15 * forksPerAgeScore +
        15 * scores.topicRelevanceScore +
        10 * scores.keywordRelevanceScore +
        10 * scores.readmeQualityScore +
        5 * scores.totalStarsScore,
      0,
      100
    )
  );
}

export function calculateTrendScore(input: ScoreInput): ScoreResult {
  const config = getConfig();
  const ageMonths = monthsBetween(input.createdAt);
  const isOldRepo = ageMonths > config.oldRepoAgeMonths;

  const hasGrowth = input.growth7d !== null && input.growthPercent7d !== null;
  const highInitialTractionScore = clamp(Math.log1p(input.starsCurrent) / Math.log1p(10000), 0, 1) * 0.65;

  const absoluteGrowthScore = hasGrowth
    ? clamp(Math.log1p(Math.max(0, input.growth7d ?? 0)) / Math.log1p(1000), 0, 1)
    : highInitialTractionScore;

  const starsBefore7d = input.starsBefore7d ?? input.starsCurrent;
  const smallRepoGuard = clamp(starsBefore7d / config.minStars, 0.15, 1);
  const percentageGrowthScore = hasGrowth
    ? clamp(Math.max(0, input.growthPercent7d ?? 0) / 100, 0, 1) * smallRepoGuard
    : 0;

  const ageScore = isOldRepo
    ? clamp((input.growth7d ?? 0) / config.minWeeklyStarGrowthAbsolute, 0, 1) * 0.7
    : clamp(1 - ageMonths / Math.max(1, config.newRepoMaxAgeMonths), 0.25, 1);

  const totalStarsScore = clamp(Math.log1p(input.starsCurrent) / Math.log1p(50000), 0, 1);
  const forksScore = clamp(Math.log1p(input.forksCurrent) / Math.log1p(8000), 0, 1);
  const pushFreshnessScore = scorePushFreshness(input.pushedAt);
  const topicRelevanceScore = normalizedKeywordHits(input.topics.join(" "), TOPIC_KEYWORDS);
  const text = [input.description, input.readmeExcerpt, input.primaryLanguage].filter(Boolean).join(" ");
  const keywordRelevanceScore = normalizedKeywordHits(text, TEXT_KEYWORDS);
  const readmeQualityScore = scoreReadmeQuality(input.readmeText ?? input.readmeExcerpt);

  const weightedScore =
    35 * absoluteGrowthScore +
    20 * percentageGrowthScore +
    10 * ageScore +
    8 * totalStarsScore +
    5 * forksScore +
    8 * pushFreshnessScore +
    7 * topicRelevanceScore +
    4 * readmeQualityScore +
    3 * keywordRelevanceScore;

  const trendScore = Math.round(clamp(weightedScore, 0, 100));
  const relevanceScore = Math.round(clamp((topicRelevanceScore * 0.55 + keywordRelevanceScore * 0.45) * 100, 0, 100));
  const initialMomentumScore = calculateInitialMomentumScore(input, {
    pushFreshnessScore,
    forksScore,
    topicRelevanceScore,
    readmeQualityScore,
    keywordRelevanceScore,
    totalStarsScore
  });
  const scoreBreakdown: ScoreBreakdown = {
    absoluteGrowthPoints: hasGrowth ? Math.round(35 * absoluteGrowthScore) : 0,
    percentageGrowthPoints: hasGrowth ? Math.round(20 * percentageGrowthScore) : 0,
    agePoints: Math.round(10 * ageScore),
    totalStarsPoints: Math.round(8 * totalStarsScore),
    forksPoints: Math.round(5 * forksScore),
    pushFreshnessPoints: Math.round(8 * pushFreshnessScore),
    topicRelevancePoints: Math.round(7 * topicRelevanceScore),
    readmeQualityPoints: Math.round(4 * readmeQualityScore),
    keywordRelevancePoints: Math.round(3 * keywordRelevanceScore),
    initialMomentumPoints: hasGrowth ? 0 : initialMomentumScore,
    usedInitialMomentumFallback: !hasGrowth
  };

  let status: RepositoryStatus = "NEW";
  if (trendScore >= 80) {
    status = "HOT";
  } else if (isOldRepo) {
    status = (input.growth7d ?? 0) >= config.minWeeklyStarGrowthAbsolute ? "HOT" : "OLD";
  } else if (!hasGrowth) {
    status = "TO_REVIEW";
  }

  return {
    trendScore,
    relevanceScore,
    initialMomentumScore,
    scoreBreakdown,
    ageMonths,
    isOldRepo,
    status,
    components: {
      absoluteGrowthScore,
      percentageGrowthScore,
      ageScore,
      totalStarsScore,
      forksScore,
      pushFreshnessScore,
      topicRelevanceScore,
      readmeQualityScore,
      keywordRelevanceScore
    }
  };
}
