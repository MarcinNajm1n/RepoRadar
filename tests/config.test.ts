import { afterEach, describe, expect, it } from "vitest";
import { getConfig } from "../src/lib/config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getConfig", () => {
  it("clamps GitHub discovery profile ranges from env", () => {
    process.env.FRESH_REPO_MIN_STARS = "-10";
    process.env.FRESH_REPO_MAX_AGE_DAYS = "99999";
    process.env.OLD_REACTIVATED_MIN_AGE_MONTHS = "0";
    process.env.NICHE_REPO_PUSHED_WITHIN_DAYS = "99999";

    const config = getConfig();

    expect(config.freshRepoMinStars).toBe(1);
    expect(config.freshRepoMaxAgeDays).toBe(730);
    expect(config.oldReactivatedMinAgeMonths).toBe(1);
    expect(config.nicheRepoPushedWithinDays).toBe(365);
  });
});
