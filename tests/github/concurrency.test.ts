import { describe, expect, it } from "vitest";
import { getAdaptiveGitHubConcurrency, runWithAdaptiveConcurrency } from "../../src/lib/github/concurrency";
import type { GitHubRateLimitSnapshot } from "../../src/lib/github/rate-limit";

function snapshot(overrides: Partial<GitHubRateLimitSnapshot>): GitHubRateLimitSnapshot {
  return {
    checkedAt: "2026-06-21T12:00:00.000Z",
    status: 200,
    resource: "core",
    limit: 5000,
    remaining: 2500,
    used: 2500,
    resetAt: "2026-06-21T13:00:00.000Z",
    ...overrides
  };
}

describe("getAdaptiveGitHubConcurrency", () => {
  it("uses conservative concurrency without rate-limit data", () => {
    expect(getAdaptiveGitHubConcurrency(null)).toBe(2);
  });

  it("slows down when remaining budget is low", () => {
    expect(getAdaptiveGitHubConcurrency(snapshot({ remaining: 50 }))).toBe(1);
  });

  it("uses max concurrency when rate-limit budget is healthy", () => {
    expect(getAdaptiveGitHubConcurrency(snapshot({ remaining: 4000 }))).toBe(4);
  });
});

describe("runWithAdaptiveConcurrency", () => {
  it("processes every item once", async () => {
    const processed: number[] = [];

    await runWithAdaptiveConcurrency([1, 2, 3, 4], 2, async (item) => {
      processed.push(item);
    });

    expect(processed.sort()).toEqual([1, 2, 3, 4]);
  });
});
