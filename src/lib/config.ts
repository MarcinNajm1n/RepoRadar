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
  enableEmailReports: boolean;
  discordWebhookUrl?: string;
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
    enableEmailReports: readBoolean("ENABLE_EMAIL_REPORTS", false),
    discordWebhookUrl: readString("DISCORD_WEBHOOK_URL") || undefined,
    excludeForks: readBoolean("EXCLUDE_FORKS", true),
    reportsDir: readString("REPORTS_DIR", "reports")
  };
}
