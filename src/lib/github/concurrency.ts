import type { GitHubRateLimitSnapshot } from "./rate-limit";

export function getAdaptiveGitHubConcurrency(snapshot: GitHubRateLimitSnapshot | null, maxConcurrency = 4) {
  if (!snapshot || snapshot.remaining === null || snapshot.limit === null || snapshot.limit <= 0) {
    return Math.min(2, maxConcurrency);
  }

  const ratio = snapshot.remaining / snapshot.limit;
  if (snapshot.remaining < 100 || ratio < 0.1) {
    return 1;
  }

  if (snapshot.remaining >= 1000 && ratio >= 0.5) {
    return maxConcurrency;
  }

  if (snapshot.remaining >= 300 && ratio >= 0.2) {
    return Math.min(2, maxConcurrency);
  }

  return 1;
}

export async function runWithAdaptiveConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<void>
) {
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await handler(items[currentIndex], currentIndex);
      }
    })
  );
}
