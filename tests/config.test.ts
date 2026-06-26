import { afterEach, describe, expect, it } from "vitest";
import { getConfig } from "../src/lib/config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getConfig", () => {
  it("uses stable market research defaults", () => {
    delete process.env.MARKET_RESEARCH_MODE;
    delete process.env.ENABLE_AUTO_OPPORTUNITY_RESEARCH;
    delete process.env.ENABLE_HN_SOURCE;
    delete process.env.ENABLE_RSS_SOURCE;
    delete process.env.ENABLE_OPENAI_WEB_SEARCH_SOURCE;
    delete process.env.ENABLE_REDDIT_SOURCE;
    delete process.env.ENABLE_BLUESKY_SOURCE;
    delete process.env.EXTERNAL_RESEARCH_CACHE_TTL_HOURS;
    delete process.env.MARKET_RESEARCH_MAX_ITEMS_PER_PROVIDER;
    delete process.env.MARKET_RESEARCH_MIN_INDEPENDENT_SOURCES;
    delete process.env.MARKET_RESEARCH_MIN_SOURCE_CONFIDENCE;
    delete process.env.MARKET_RESEARCH_ENABLE_EVIDENCE_RANKING;

    const config = getConfig();

    expect(config.marketResearchMode).toBe("light");
    expect(config.enableAutoOpportunityResearch).toBe(false);
    expect(config.enableHnSource).toBe(true);
    expect(config.enableRssSource).toBe(true);
    expect(config.enableOpenAiWebSearchSource).toBe(true);
    expect(config.enableRedditSource).toBe(false);
    expect(config.enableBlueskySource).toBe(false);
    expect(config.externalResearchCacheTtlHours).toBe(24);
    expect(config.marketResearchMaxItemsPerProvider).toBe(4);
    expect(config.marketResearchMinIndependentSources).toBe(2);
    expect(config.marketResearchMinSourceConfidence).toBe(50);
    expect(config.marketResearchEnableEvidenceRanking).toBe(true);
  });

  it("falls back unknown market research mode to light", () => {
    process.env.MARKET_RESEARCH_MODE = "expensive";

    expect(getConfig().marketResearchMode).toBe("light");
  });

  it("ignores blank numeric env values instead of treating whitespace as zero", () => {
    process.env.OPENAI_DAILY_ANALYSIS_LIMIT = "   ";
    process.env.MARKET_RESEARCH_MAX_SOURCES = "\t";

    const config = getConfig();

    expect(config.openAiDailyAnalysisLimit).toBe(20);
    expect(config.marketResearchMaxSources).toBe(8);
  });

  it("trims boolean env values before parsing", () => {
    process.env.ENABLE_HN_SOURCE = " true ";
    process.env.ENABLE_RSS_SOURCE = "\tfalse ";

    const config = getConfig();

    expect(config.enableHnSource).toBe(true);
    expect(config.enableRssSource).toBe(false);
  });

  it("uses boolean defaults for blank env values", () => {
    process.env.ENABLE_OPENAI_WEB_SEARCH_SOURCE = "   ";
    process.env.ENABLE_REDDIT_SOURCE = "\t";

    const config = getConfig();

    expect(config.enableOpenAiWebSearchSource).toBe(true);
    expect(config.enableRedditSource).toBe(false);
  });

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
