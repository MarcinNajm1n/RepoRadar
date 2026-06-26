export type AppConfig = {
  githubToken?: string;
  openAiApiKey?: string;
  openAiModel: string;
  databaseUrl: string;
  scanScheduleCron: string;
  minStars: number;
  freshRepoMinStars: number;
  freshRepoMaxAgeDays: number;
  freshRepoPushedWithinDays: number;
  fastMomentumMinStars: number;
  fastMomentumPushedWithinDays: number;
  establishedPushedWithinDays: number;
  oldReactivatedMinStars: number;
  oldReactivatedMinAgeMonths: number;
  oldReactivatedPushedWithinDays: number;
  nicheRepoMinStars: number;
  nicheRepoPushedWithinDays: number;
  enableScanProfileFreshRepos: boolean;
  enableScanProfileFastMomentum: boolean;
  enableScanProfileEstablishedHot: boolean;
  enableScanProfileOldReactivated: boolean;
  enableScanProfileNicheAiTools: boolean;
  newRepoMaxAgeMonths: number;
  oldRepoAgeMonths: number;
  minWeeklyStarGrowthAbsolute: number;
  minWeeklyStarGrowthPercent: number;
  openAiDailyAnalysisLimit: number;
  enableRedditSource: boolean;
  enableHnSource: boolean;
  enableProductHuntSource: boolean;
  enableXSource: boolean;
  enableNotifications: boolean;
  enableWindowsNotifications: boolean;
  enableEmailReports: boolean;
  discordWebhookUrl?: string;
  notificationMinTrendScore: number;
  notificationMinWeeklyGrowth: number;
  marketResearchEnabled: boolean;
  marketResearchProvider: "mcp" | "openai" | "hybrid" | "reddit" | "bluesky" | "none";
  marketResearchMode: "light" | "full";
  marketResearchDailyLimit: number;
  marketResearchMaxSources: number;
  externalResearchCacheTtlHours: number;
  marketResearchMaxItemsPerProvider: number;
  marketResearchMinIndependentSources: number;
  marketResearchMinSourceConfidence: number;
  marketResearchEnableEvidenceRanking: boolean;
  enableOpenAiWebSearchSource: boolean;
  enableRssSource: boolean;
  enableBlueskySource: boolean;
  blueskyPublicApiBase: string;
  marketResearchRssFeeds: string[];
  enableAutoOpportunityResearch: boolean;
  autoOpportunityResearchTopRepos: number;
  opportunityCandidateMinScore: number;
  opportunityNotificationMinScore: number;
  opportunityMinConfidence: number;
  opportunityMinSources: number;
  mcpWebResearchServerUrl?: string;
  mcpWebResearchServerLabel: string;
  mcpWebResearchAllowedTools: string[];
  redditClientId?: string;
  redditClientSecret?: string;
  redditUserAgent: string;
  excludeForks: boolean;
  reportsDir: string;
};

function readNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim();
  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readClampedNumber(name: string, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, readNumber(name, fallback)));
}

function readBoolean(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(normalized);
}

function readString(name: string, fallback = "") {
  const raw = process.env[name];
  return raw && raw.trim().length > 0 ? raw.trim() : fallback;
}

function readStringList(name: string, fallback: string[]) {
  const raw = readString(name);
  if (!raw) {
    return fallback;
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readMarketResearchProvider(): AppConfig["marketResearchProvider"] {
  const value = readString("MARKET_RESEARCH_PROVIDER", "hybrid").toLowerCase();
  if (value === "mcp" || value === "openai" || value === "hybrid" || value === "reddit" || value === "bluesky" || value === "none") {
    return value;
  }

  return "hybrid";
}

function readMarketResearchMode(): AppConfig["marketResearchMode"] {
  const value = readString("MARKET_RESEARCH_MODE", "light").toLowerCase();
  return value === "full" ? "full" : "light";
}

export function getConfig(): AppConfig {
  return {
    githubToken: readString("GITHUB_TOKEN") || undefined,
    openAiApiKey: readString("OPENAI_API_KEY") || undefined,
    openAiModel: readString("OPENAI_MODEL", "gpt-4.1-mini"),
    databaseUrl: readString("DATABASE_URL", "file:./dev.db"),
    scanScheduleCron: readString("SCAN_SCHEDULE_CRON", "0 9 * * *"),
    minStars: readClampedNumber("MIN_STARS", 1000, 1, 100000),
    freshRepoMinStars: readClampedNumber("FRESH_REPO_MIN_STARS", 50, 1, 100000),
    freshRepoMaxAgeDays: readClampedNumber("FRESH_REPO_MAX_AGE_DAYS", 90, 1, 730),
    freshRepoPushedWithinDays: readClampedNumber("FRESH_REPO_PUSHED_WITHIN_DAYS", 30, 1, 365),
    fastMomentumMinStars: readClampedNumber("FAST_MOMENTUM_MIN_STARS", 100, 1, 100000),
    fastMomentumPushedWithinDays: readClampedNumber("FAST_MOMENTUM_PUSHED_WITHIN_DAYS", 30, 1, 365),
    establishedPushedWithinDays: readClampedNumber("ESTABLISHED_PUSHED_WITHIN_DAYS", 30, 1, 365),
    oldReactivatedMinStars: readClampedNumber("OLD_REACTIVATED_MIN_STARS", 500, 1, 100000),
    oldReactivatedMinAgeMonths: readClampedNumber("OLD_REACTIVATED_MIN_AGE_MONTHS", 12, 1, 120),
    oldReactivatedPushedWithinDays: readClampedNumber("OLD_REACTIVATED_PUSHED_WITHIN_DAYS", 30, 1, 365),
    nicheRepoMinStars: readClampedNumber("NICHE_REPO_MIN_STARS", 100, 1, 100000),
    nicheRepoPushedWithinDays: readClampedNumber("NICHE_REPO_PUSHED_WITHIN_DAYS", 90, 1, 365),
    enableScanProfileFreshRepos: readBoolean("ENABLE_SCAN_PROFILE_FRESH_REPOS", true),
    enableScanProfileFastMomentum: readBoolean("ENABLE_SCAN_PROFILE_FAST_MOMENTUM", true),
    enableScanProfileEstablishedHot: readBoolean("ENABLE_SCAN_PROFILE_ESTABLISHED_HOT", true),
    enableScanProfileOldReactivated: readBoolean("ENABLE_SCAN_PROFILE_OLD_REACTIVATED", true),
    enableScanProfileNicheAiTools: readBoolean("ENABLE_SCAN_PROFILE_NICHE_AI_TOOLS", true),
    newRepoMaxAgeMonths: readClampedNumber("NEW_REPO_MAX_AGE_MONTHS", 7, 1, 120),
    oldRepoAgeMonths: readClampedNumber("OLD_REPO_AGE_MONTHS", 7, 1, 120),
    minWeeklyStarGrowthAbsolute: readClampedNumber("MIN_WEEKLY_STAR_GROWTH_ABSOLUTE", 200, 1, 1000000),
    minWeeklyStarGrowthPercent: readClampedNumber("MIN_WEEKLY_STAR_GROWTH_PERCENT", 20, 0, 10000),
    openAiDailyAnalysisLimit: readClampedNumber("OPENAI_DAILY_ANALYSIS_LIMIT", 20, 0, 1000),
    enableRedditSource: readBoolean("ENABLE_REDDIT_SOURCE", false),
    enableHnSource: readBoolean("ENABLE_HN_SOURCE", true),
    enableProductHuntSource: readBoolean("ENABLE_PRODUCT_HUNT_SOURCE", false),
    enableXSource: readBoolean("ENABLE_X_SOURCE", false),
    enableNotifications: readBoolean("ENABLE_NOTIFICATIONS", true),
    enableWindowsNotifications: readBoolean("ENABLE_WINDOWS_NOTIFICATIONS", true),
    enableEmailReports: readBoolean("ENABLE_EMAIL_REPORTS", false),
    discordWebhookUrl: readString("DISCORD_WEBHOOK_URL") || undefined,
    notificationMinTrendScore: readClampedNumber("NOTIFICATION_MIN_TREND_SCORE", 80, 0, 100),
    notificationMinWeeklyGrowth: readClampedNumber("NOTIFICATION_MIN_WEEKLY_GROWTH", 200, 0, 1000000),
    marketResearchEnabled: readBoolean("MARKET_RESEARCH_ENABLED", true),
    marketResearchProvider: readMarketResearchProvider(),
    marketResearchMode: readMarketResearchMode(),
    marketResearchDailyLimit: readClampedNumber("MARKET_RESEARCH_DAILY_LIMIT", 5, 0, 1000),
    marketResearchMaxSources: readClampedNumber("MARKET_RESEARCH_MAX_SOURCES", 8, 1, 50),
    externalResearchCacheTtlHours: readClampedNumber("EXTERNAL_RESEARCH_CACHE_TTL_HOURS", 24, 1, 720),
    marketResearchMaxItemsPerProvider: readClampedNumber("MARKET_RESEARCH_MAX_ITEMS_PER_PROVIDER", 4, 1, 50),
    marketResearchMinIndependentSources: readClampedNumber("MARKET_RESEARCH_MIN_INDEPENDENT_SOURCES", 2, 1, 20),
    marketResearchMinSourceConfidence: readClampedNumber("MARKET_RESEARCH_MIN_SOURCE_CONFIDENCE", 50, 0, 100),
    marketResearchEnableEvidenceRanking: readBoolean("MARKET_RESEARCH_ENABLE_EVIDENCE_RANKING", true),
    enableOpenAiWebSearchSource: readBoolean("ENABLE_OPENAI_WEB_SEARCH_SOURCE", true),
    enableRssSource: readBoolean("ENABLE_RSS_SOURCE", true),
    enableBlueskySource: readBoolean("ENABLE_BLUESKY_SOURCE", false),
    blueskyPublicApiBase: readString("BLUESKY_PUBLIC_API_BASE", "https://public.api.bsky.app"),
    marketResearchRssFeeds: readStringList("MARKET_RESEARCH_RSS_FEEDS", []),
    enableAutoOpportunityResearch: readBoolean("ENABLE_AUTO_OPPORTUNITY_RESEARCH", false),
    autoOpportunityResearchTopRepos: readClampedNumber("AUTO_OPPORTUNITY_RESEARCH_TOP_REPOS", 3, 1, 50),
    opportunityCandidateMinScore: readClampedNumber("OPPORTUNITY_CANDIDATE_MIN_SCORE", 65, 0, 100),
    opportunityNotificationMinScore: readClampedNumber("OPPORTUNITY_NOTIFICATION_MIN_SCORE", 85, 0, 100),
    opportunityMinConfidence: readClampedNumber("OPPORTUNITY_MIN_CONFIDENCE", 4, 1, 5),
    opportunityMinSources: readClampedNumber("OPPORTUNITY_MIN_SOURCES", 3, 1, 20),
    mcpWebResearchServerUrl: readString("MCP_WEB_RESEARCH_SERVER_URL") || undefined,
    mcpWebResearchServerLabel: readString("MCP_WEB_RESEARCH_SERVER_LABEL", "web-research"),
    mcpWebResearchAllowedTools: readStringList("MCP_WEB_RESEARCH_ALLOWED_TOOLS", ["search", "fetch"]),
    redditClientId: readString("REDDIT_CLIENT_ID") || undefined,
    redditClientSecret: readString("REDDIT_CLIENT_SECRET") || undefined,
    redditUserAgent: readString("REDDIT_USER_AGENT", "RepoRadar/0.1"),
    excludeForks: readBoolean("EXCLUDE_FORKS", true),
    reportsDir: readString("REPORTS_DIR", "reports")
  };
}
