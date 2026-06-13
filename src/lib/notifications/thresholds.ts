import { getConfig } from "@/lib/config";

export function isHighValueRepository(input: {
  trendScore: number;
  growth7d: number | null;
  relevanceScore: number;
}) {
  const config = getConfig();
  return (
    input.trendScore >= 80 ||
    (input.growth7d ?? 0) >= config.minWeeklyStarGrowthAbsolute ||
    (input.relevanceScore >= 80 && input.trendScore >= 60)
  );
}
