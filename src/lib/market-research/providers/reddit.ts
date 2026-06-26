import { getConfig } from "@/lib/config";
import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import type { MarketResearchContext, MarketResearchProvider, MarketResearchSourceInput } from "../types";

type RedditTokenResponse = {
  access_token?: unknown;
  error?: unknown;
};

type RedditSearchResponse = {
  data?: {
    children?: unknown;
  };
};

type RedditSearchItem = {
  title?: unknown;
  permalink?: unknown;
  url?: unknown;
  subreddit_name_prefixed?: unknown;
  selftext?: unknown;
  id?: unknown;
  created_utc?: unknown;
  score?: unknown;
  num_comments?: unknown;
};

function redditConfigured() {
  const config = getConfig();
  return Boolean(config.enableRedditSource && config.redditClientId && config.redditClientSecret);
}

async function getRedditAccessToken() {
  const config = getConfig();
  if (!config.redditClientId || !config.redditClientSecret) {
    throw new Error("Reddit OAuth credentials are not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.redditClientId}:${config.redditClientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": config.redditUserAgent
    },
    body: "grant_type=client_credentials",
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));

  const data = (await response.json()) as RedditTokenResponse;
  const accessToken = sanitizeExternalText(data.access_token, 2000);
  if (!response.ok || !accessToken) {
    throw new Error(`Reddit OAuth failed: ${sanitizeExternalText(data.error, 120) ?? response.status}`);
  }

  return accessToken;
}

function redditRateLimitError(response: Response) {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  const retryAfter = response.headers.get("retry-after");

  if (response.status !== 429 && response.status !== 403) {
    return null;
  }

  return [
    `Reddit rate limit or access error (${response.status})`,
    remaining ? `remaining=${remaining}` : null,
    reset ? `reset=${reset}s` : null,
    retryAfter ? `retry-after=${retryAfter}s` : null
  ]
    .filter(Boolean)
    .join(", ");
}

function redditCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function redditCountLabel(value: unknown, label: string) {
  const count = redditCount(value);
  return count > 0 ? `${label}: ${count}` : null;
}

function redditPublishedDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function redditSourceUrl(item: RedditSearchItem) {
  const permalink = sanitizeExternalText(item.permalink, 500);
  if (permalink?.startsWith("/")) {
    const url = sanitizeExternalUrl(`https://www.reddit.com${permalink}`);
    if (url) {
      return url;
    }
  }

  return sanitizeExternalUrl(item.url);
}

function redditSourceItem(value: unknown): RedditSearchItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = (value as { data?: unknown }).data;
  return data && typeof data === "object" ? (data as RedditSearchItem) : null;
}

function marketResearchSourceFromRedditItem(item: RedditSearchItem): MarketResearchSourceInput | null {
  const url = redditSourceUrl(item);
  if (!url) {
    return null;
  }

  const snippetParts = [
    sanitizeExternalText(item.selftext, 500),
    redditCountLabel(item.score, "score"),
    redditCountLabel(item.num_comments, "comments")
  ].filter(Boolean);

  return {
    sourceType: "reddit",
    title: sanitizeExternalText(item.title, 240) ?? "Reddit discussion",
    url,
    providerItemId: sanitizeExternalText(item.id, 120) ?? sanitizeExternalText(item.permalink, 500),
    publisher: sanitizeExternalText(item.subreddit_name_prefixed, 120) ?? "Reddit",
    publishedAt: redditPublishedDate(item.created_utc),
    snippet: snippetParts.join(" | ") || "Public Reddit search result.",
    sentiment: "mixed",
    relevanceScore: 60
  };
}

export const redditProvider: MarketResearchProvider = {
  name: "reddit",
  async research(context: MarketResearchContext) {
    if (!redditConfigured()) {
      throw new Error("Reddit source is disabled or missing OAuth credentials");
    }

    const config = getConfig();
    const token = await getRedditAccessToken();
    const query = encodeURIComponent(`${context.fullName} OR "${context.description ?? context.fullName}" AI devtools`);
    const limit = Math.min(config.marketResearchMaxSources, context.mode === "light" ? 4 : 8);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`https://oauth.reddit.com/search?q=${query}&sort=relevance&limit=${limit}&type=link`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": config.redditUserAgent
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    const rateLimitError = redditRateLimitError(response);
    if (rateLimitError) {
      throw new Error(rateLimitError);
    }
    const data = (await response.json()) as RedditSearchResponse;
    if (!response.ok) {
      throw new Error(`Reddit search failed with HTTP ${response.status}`);
    }

    const sources: MarketResearchSourceInput[] =
      (Array.isArray(data.data?.children) ? data.data.children : [])
        .map(redditSourceItem)
        .filter((item): item is RedditSearchItem => Boolean(item))
        .map(marketResearchSourceFromRedditItem)
        .filter((source): source is MarketResearchSourceInput => Boolean(source))
        .slice(0, limit);

    return {
      provider: this.name,
      summary: sources.length
        ? `Reddit zwrocil ${sources.length} publicznych dyskusji zwiazanych z repo lub problemem.`
        : "Reddit nie zwrocil publicznych dyskusji dla tego zapytania.",
      signals: sources.map((source) => source.title).slice(0, 5),
      userProblems: [],
      sentiment: "mixed",
      demandEvidence: sources.map((source) => source.snippet).slice(0, 5),
      validationRisks: ["Reddit search jest sygnalem pomocniczym i wymaga recznej weryfikacji kontekstu."],
      confidenceScore: sources.length ? 2 : 1,
      sources
    };
  }
};
