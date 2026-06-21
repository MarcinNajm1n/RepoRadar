import { getJsonSetting, setSetting } from "./settings";
import type { GitHubRateLimitSnapshot } from "@/lib/github/rate-limit";

const GITHUB_RATE_LIMIT_SETTING_KEY = "github_rate_limit_snapshot";

export async function getStoredGitHubRateLimitSnapshot() {
  return getJsonSetting<GitHubRateLimitSnapshot | null>(GITHUB_RATE_LIMIT_SETTING_KEY, null);
}

export async function saveGitHubRateLimitSnapshot(snapshot: GitHubRateLimitSnapshot | null) {
  if (!snapshot) {
    return null;
  }

  await setSetting(GITHUB_RATE_LIMIT_SETTING_KEY, JSON.stringify(snapshot));
  return snapshot;
}
