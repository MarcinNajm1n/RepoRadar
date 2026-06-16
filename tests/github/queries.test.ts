import { describe, expect, it, vi } from "vitest";
import { buildGitHubSearchQueries } from "../../src/lib/github/queries";

vi.mock("@/lib/config", () => ({
  getConfig: () => ({
    minStars: 1000,
    freshRepoMinStars: 50,
    freshRepoMaxAgeDays: 90,
    freshRepoPushedWithinDays: 30,
    fastMomentumMinStars: 100,
    fastMomentumPushedWithinDays: 30,
    establishedPushedWithinDays: 30,
    oldReactivatedMinStars: 500,
    oldReactivatedMinAgeMonths: 12,
    oldReactivatedPushedWithinDays: 30,
    nicheRepoMinStars: 100,
    nicheRepoPushedWithinDays: 90,
    enableScanProfileFreshRepos: true,
    enableScanProfileFastMomentum: true,
    enableScanProfileEstablishedHot: true,
    enableScanProfileOldReactivated: true,
    enableScanProfileNicheAiTools: true
  })
}));

describe("buildGitHubSearchQueries", () => {
  it("builds profile query specs with per-profile minStars and sort", () => {
    const specs = buildGitHubSearchQueries(new Date("2026-06-16T12:00:00Z"));

    expect(specs.length).toBeGreaterThan(0);
    expect(new Set(specs.map((spec) => spec.profile))).toEqual(
      new Set(["fresh_repos", "fast_momentum", "established_hot", "old_reactivated", "niche_ai_tools"])
    );
    expect(specs.every((spec) => spec.order === "desc")).toBe(true);
    expect(specs.find((spec) => spec.profile === "fresh_repos")?.minStars).toBe(50);
    expect(specs.find((spec) => spec.profile === "established_hot")?.minStars).toBe(1000);
    expect(specs.some((spec) => spec.query.includes("created:>=2026-03-18"))).toBe(true);
    expect(specs.some((spec) => spec.query.includes("created:<=2025-06-16"))).toBe(true);
    expect(specs.some((spec) => spec.sort === "updated")).toBe(true);
  });
});
