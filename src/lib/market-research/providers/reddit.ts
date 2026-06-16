import { getConfig } from "@/lib/config";
import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import type { MarketResearchContext, MarketResearchProvider, MarketResearchSourceInput } from "../types";

type RedditTokenResponse = {
  access_token?: string;
  error?: string;
};

type RedditSearchResponse = {
  data?: {
    children?: Array<{
      data?: {
        title?: string;
        permalink?: string;
        url?: string;
        subreddit_name_prefixed?: string;
        selftext?: string;
        created_utc?: number;
        score?: number;
        num_comments?: number;
      };
    }>;
  };
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

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.redditClientId}:${config.redditClientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": config.redditUserAgent
    },
    body: "grant_type=client_credentials"
  });

  const data = (await response.json()) as RedditTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(`Reddit OAuth failed: ${data.error ?? response.status}`);
  }

  return data.access_token;
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
    const limit = Math.min(config.marketResearchMaxSources, 8);
    const response = await fetch(`https://oauth.reddit.com/search?q=${query}&sort=relevance&limit=${limit}&type=link`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": config.redditUserAgent
      }
    });

    const data = (await response.json()) as RedditSearchResponse;
    if (!response.ok) {
      throw new Error(`Reddit search failed with HTTP ${response.status}`);
    }

    const sources: MarketResearchSourceInput[] =
      data.data?.children
        ?.map((child) => child.data)
        .filter(Boolean)
        .map((item) => {
          const snippetParts = [
            sanitizeExternalText(item!.selftext, 500),
            item!.score === undefined ? null : `score: ${item!.score}`,
            item!.num_comments === undefined ? null : `comments: ${item!.num_comments}`
          ].filter(Boolean);
          const permalink = item!.permalink ? `https://www.reddit.com${item!.permalink}` : item!.url;
          return {
            sourceType: "reddit",
            title: sanitizeExternalText(item!.title, 240) ?? "Reddit discussion",
            url: sanitizeExternalUrl(permalink) ?? "https://www.reddit.com/",
            publisher: item!.subreddit_name_prefixed ?? "Reddit",
            publishedAt: item!.created_utc ? new Date(item!.created_utc * 1000).toISOString().slice(0, 10) : null,
            snippet: snippetParts.join(" | ") || "Public Reddit search result.",
            sentiment: "mixed",
            relevanceScore: 60
          };
        })
        .slice(0, limit) ?? [];

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
