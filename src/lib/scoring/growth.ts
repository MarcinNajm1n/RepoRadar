export type SnapshotInput = {
  capturedAt: Date;
  stars: number;
};

export type GrowthResult = {
  growth24h: number | null;
  growth7d: number | null;
  growthPercent7d: number | null;
  starsBefore7d: number | null;
  hasSevenDayHistory: boolean;
};

function findSnapshotAtOrBefore(snapshots: SnapshotInput[], target: Date) {
  return snapshots
    .filter((snapshot) => snapshot.capturedAt.getTime() <= target.getTime())
    .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0];
}

export function calculateGrowth(
  current: SnapshotInput,
  previousSnapshots: SnapshotInput[],
  now = current.capturedAt
): GrowthResult {
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const snapshot24h = findSnapshotAtOrBefore(previousSnapshots, oneDayAgo);
  const snapshot7d = findSnapshotAtOrBefore(previousSnapshots, sevenDaysAgo);

  const growth24h = snapshot24h ? current.stars - snapshot24h.stars : null;
  const growth7d = snapshot7d ? current.stars - snapshot7d.stars : null;
  const growthPercent7d =
    snapshot7d && snapshot7d.stars > 0 ? ((current.stars - snapshot7d.stars) / snapshot7d.stars) * 100 : null;

  return {
    growth24h,
    growth7d,
    growthPercent7d,
    starsBefore7d: snapshot7d?.stars ?? null,
    hasSevenDayHistory: Boolean(snapshot7d)
  };
}
