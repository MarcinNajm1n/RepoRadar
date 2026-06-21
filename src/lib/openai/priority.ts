export const AI_PRIORITY_MIN_TREND_SCORE = 70;
export const AI_PRIORITY_MIN_GROWTH_24H = 10;
export const AI_PRIORITY_MIN_GROWTH_7D = 25;
export const AI_PRIORITY_MANUAL_STATUSES = ["SAVED", "IDEA", "ANALYZED"] as const;

export type AiPriorityRepositoryInput = {
  trendScore: number;
  status: string;
  growth24h?: number | null;
  growth7d?: number | null;
};

export function isAiPriorityRepository(repo: AiPriorityRepositoryInput) {
  return (
    repo.trendScore >= AI_PRIORITY_MIN_TREND_SCORE ||
    AI_PRIORITY_MANUAL_STATUSES.includes(repo.status as (typeof AI_PRIORITY_MANUAL_STATUSES)[number]) ||
    (repo.growth24h ?? 0) >= AI_PRIORITY_MIN_GROWTH_24H ||
    (repo.growth7d ?? 0) >= AI_PRIORITY_MIN_GROWTH_7D
  );
}

export function buildAiPriorityRepositoryWhere() {
  return {
    OR: [
      { trendScore: { gte: AI_PRIORITY_MIN_TREND_SCORE } },
      { status: { in: [...AI_PRIORITY_MANUAL_STATUSES] } },
      { snapshots: { some: { growth24h: { gte: AI_PRIORITY_MIN_GROWTH_24H } } } },
      { snapshots: { some: { growth7d: { gte: AI_PRIORITY_MIN_GROWTH_7D } } } }
    ]
  };
}
