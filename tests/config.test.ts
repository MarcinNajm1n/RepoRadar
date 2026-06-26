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

  it("clamps operational numeric env values to safe ranges", () => {
    process.env.MIN_STARS = "-1";
    process.env.NEW_REPO_MAX_AGE_MONTHS = "999";
    process.env.OLD_REPO_AGE_MONTHS = "0";
    process.env.MIN_WEEKLY_STAR_GROWTH_ABSOLUTE = "0";
    process.env.MIN_WEEKLY_STAR_GROWTH_PERCENT = "-10";
    process.env.OPENAI_DAILY_ANALYSIS_LIMIT = "99999";
    process.env.NOTIFICATION_MIN_TREND_SCORE = "250";
    process.env.NOTIFICATION_MIN_WEEKLY_GROWTH = "-5";
    process.env.MARKET_RESEARCH_DAILY_LIMIT = "-1";
    process.env.MARKET_RESEARCH_MAX_SOURCES = "999";
    process.env.EXTERNAL_RESEARCH_CACHE_TTL_HOURS = "99999";
    process.env.MARKET_RESEARCH_MAX_ITEMS_PER_PROVIDER = "0";
    process.env.MARKET_RESEARCH_MIN_INDEPENDENT_SOURCES = "999";
    process.env.MARKET_RESEARCH_MIN_SOURCE_CONFIDENCE = "-30";
    process.env.AUTO_OPPORTUNITY_RESEARCH_TOP_REPOS = "999";
    process.env.OPPORTUNITY_CANDIDATE_MIN_SCORE = "-5";
    process.env.OPPORTUNITY_NOTIFICATION_MIN_SCORE = "999";
    process.env.OPPORTUNITY_MIN_CONFIDENCE = "99";
    process.env.OPPORTUNITY_MIN_SOURCES = "0";

    const config = getConfig();

    expect(config.minStars).toBe(1);
    expect(config.newRepoMaxAgeMonths).toBe(120);
    expect(config.oldRepoAgeMonths).toBe(1);
    expect(config.minWeeklyStarGrowthAbsolute).toBe(1);
    expect(config.minWeeklyStarGrowthPercent).toBe(0);
    expect(config.openAiDailyAnalysisLimit).toBe(1000);
    expect(config.notificationMinTrendScore).toBe(100);
    expect(config.notificationMinWeeklyGrowth).toBe(0);
    expect(config.marketResearchDailyLimit).toBe(0);
    expect(config.marketResearchMaxSources).toBe(50);
    expect(config.externalResearchCacheTtlHours).toBe(720);
    expect(config.marketResearchMaxItemsPerProvider).toBe(1);
    expect(config.marketResearchMinIndependentSources).toBe(20);
    expect(config.marketResearchMinSourceConfidence).toBe(0);
    expect(config.autoOpportunityResearchTopRepos).toBe(50);
    expect(config.opportunityCandidateMinScore).toBe(0);
    expect(config.opportunityNotificationMinScore).toBe(100);
    expect(config.opportunityMinConfidence).toBe(5);
    expect(config.opportunityMinSources).toBe(1);
  });
});
