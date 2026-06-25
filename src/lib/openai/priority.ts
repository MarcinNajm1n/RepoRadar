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
  return getAiPriorityReasons(repo).length > 0;
}

export type AiPriorityReason = {
  id: "trend" | "manual_status" | "growth_24h" | "growth_7d";
  label: string;
  detail: string;
};

export function getAiPriorityReasons(repo: AiPriorityRepositoryInput): AiPriorityReason[] {
  const reasons: AiPriorityReason[] = [];

  if (repo.trendScore >= AI_PRIORITY_MIN_TREND_SCORE) {
    reasons.push({
      id: "trend",
      label: "Mocny trend",
      detail: `Trend score ${repo.trendScore}/100 przekracza prog automatycznej analizy (${AI_PRIORITY_MIN_TREND_SCORE}/100).`
    });
  }

  if (AI_PRIORITY_MANUAL_STATUSES.includes(repo.status as (typeof AI_PRIORITY_MANUAL_STATUSES)[number])) {
    reasons.push({
      id: "manual_status",
      label: "Status reczny",
      detail: `Repo ma status ${formatManualStatus(repo.status)}, wiec trafia do kolejki AI.`
    });
  }

  if ((repo.growth24h ?? 0) >= AI_PRIORITY_MIN_GROWTH_24H) {
    reasons.push({
      id: "growth_24h",
      label: "Szybki wzrost 24h",
      detail: `Repo zyskalo ${repo.growth24h} stars w 24h, czyli przekracza prog ${AI_PRIORITY_MIN_GROWTH_24H}.`
    });
  }

  if ((repo.growth7d ?? 0) >= AI_PRIORITY_MIN_GROWTH_7D) {
    reasons.push({
      id: "growth_7d",
      label: "Szybki wzrost 7d",
      detail: `Repo zyskalo ${repo.growth7d} stars w 7d, czyli przekracza prog ${AI_PRIORITY_MIN_GROWTH_7D}.`
    });
  }

  return reasons;
}

function formatManualStatus(status: string) {
  const labels: Record<string, string> = {
    SAVED: "zapisane",
    IDEA: "pomysl",
    ANALYZED: "przeanalizowane"
  };

  return labels[status] ?? status;
}

export function buildAiPriorityRepositoryWhere() {
  return {
    OR: [
      { trendScore: { gte: AI_PRIORITY_MIN_TREND_SCORE } },
      { status: { in: [...AI_PRIORITY_MANUAL_STATUSES] } },
      { growth24h: { gte: AI_PRIORITY_MIN_GROWTH_24H } },
      { growth7d: { gte: AI_PRIORITY_MIN_GROWTH_7D } }
    ]
  };
}
