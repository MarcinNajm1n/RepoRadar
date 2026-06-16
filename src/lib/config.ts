export type AppConfig = {
  githubToken?: string;
  openAiApiKey?: string;
  openAiModel: string;
  databaseUrl: string;
  scanScheduleCron: string;
  minStars: number;
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

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
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
    minStars: readNumber("MIN_STARS", 1000),
    newRepoMaxAgeMonths: readNumber("NEW_REPO_MAX_AGE_MONTHS", 7),
    oldRepoAgeMonths: readNumber("OLD_REPO_AGE_MONTHS", 7),
    minWeeklyStarGrowthAbsolute: readNumber("MIN_WEEKLY_STAR_GROWTH_ABSOLUTE", 200),
    minWeeklyStarGrowthPercent: readNumber("MIN_WEEKLY_STAR_GROWTH_PERCENT", 20),
    openAiDailyAnalysisLimit: readNumber("OPENAI_DAILY_ANALYSIS_LIMIT", 20),
    enableRedditSource: readBoolean("ENABLE_REDDIT_SOURCE", false),
    enableHnSource: readBoolean("ENABLE_HN_SOURCE", false),
    enableProductHuntSource: readBoolean("ENABLE_PRODUCT_HUNT_SOURCE", false),
    enableXSource: readBoolean("ENABLE_X_SOURCE", false),
    enableNotifications: readBoolean("ENABLE_NOTIFICATIONS", true),
    enableWindowsNotifications: readBoolean("ENABLE_WINDOWS_NOTIFICATIONS", true),
    enableEmailReports: readBoolean("ENABLE_EMAIL_REPORTS", false),
    discordWebhookUrl: readString("DISCORD_WEBHOOK_URL") || undefined,
    notificationMinTrendScore: readNumber("NOTIFICATION_MIN_TREND_SCORE", 80),
    notificationMinWeeklyGrowth: readNumber("NOTIFICATION_MIN_WEEKLY_GROWTH", 200),
    marketResearchEnabled: readBoolean("MARKET_RESEARCH_ENABLED", true),
    marketResearchProvider: readMarketResearchProvider(),
    marketResearchMode: readMarketResearchMode(),
    marketResearchDailyLimit: readNumber("MARKET_RESEARCH_DAILY_LIMIT", 5),
    marketResearchMaxSources: readNumber("MARKET_RESEARCH_MAX_SOURCES", 8),
    enableOpenAiWebSearchSource: readBoolean("ENABLE_OPENAI_WEB_SEARCH_SOURCE", true),
    enableRssSource: readBoolean("ENABLE_RSS_SOURCE", true),
    enableBlueskySource: readBoolean("ENABLE_BLUESKY_SOURCE", false),
    blueskyPublicApiBase: readString("BLUESKY_PUBLIC_API_BASE", "https://public.api.bsky.app"),
    marketResearchRssFeeds: readStringList("MARKET_RESEARCH_RSS_FEEDS", []),
    enableAutoOpportunityResearch: readBoolean("ENABLE_AUTO_OPPORTUNITY_RESEARCH", false),
    autoOpportunityResearchTopRepos: readNumber("AUTO_OPPORTUNITY_RESEARCH_TOP_REPOS", 3),
    opportunityCandidateMinScore: readNumber("OPPORTUNITY_CANDIDATE_MIN_SCORE", 65),
    opportunityNotificationMinScore: readNumber("OPPORTUNITY_NOTIFICATION_MIN_SCORE", 85),
    opportunityMinConfidence: readNumber("OPPORTUNITY_MIN_CONFIDENCE", 4),
    opportunityMinSources: readNumber("OPPORTUNITY_MIN_SOURCES", 3),
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
