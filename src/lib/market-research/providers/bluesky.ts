import { getConfig } from "@/lib/config";
import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import { buildResearchQueries, estimateBasicSentiment } from "../query";
import type { MarketResearchContext, MarketResearchProvider, MarketResearchSourceInput } from "../types";
import { fetchJsonWithTimeout } from "./http";

type BlueskySearchResponse = {
  posts?: Array<{
    uri?: string;
    cid?: string;
    author?: {
      handle?: string;
      displayName?: string;
    };
    record?: {
      text?: string;
      createdAt?: string;
    };
    replyCount?: number;
    repostCount?: number;
    likeCount?: number;
    quoteCount?: number;
  }>;
};

function blueskyPostUrl(uri: string | undefined, handle: string | undefined) {
  const match = uri?.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
  if (!match) {
    return null;
  }

  return sanitizeExternalUrl(`https://bsky.app/profile/${encodeURIComponent(handle || match[1])}/post/${match[2]}`);
}

export const blueskyProvider: MarketResearchProvider = {
  name: "bluesky",
  async research(context: MarketResearchContext) {
    const config = getConfig();
    if (!config.enableBlueskySource) {
      throw new Error("Bluesky source is disabled");
    }

    const baseUrl = sanitizeExternalUrl(config.blueskyPublicApiBase);
    if (!baseUrl || !baseUrl.startsWith("https://")) {
      throw new Error("BLUESKY_PUBLIC_API_BASE must be an https URL");
    }

    const limit = Math.min(config.marketResearchMaxSources, context.mode === "light" ? 4 : 8);
    const sources: MarketResearchSourceInput[] = [];
    const queries = buildResearchQueries(context).slice(0, context.mode === "light" ? 1 : 3);

    for (const query of queries) {
      const url = new URL("/xrpc/app.bsky.feed.searchPosts", baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("sort", "top");
      url.searchParams.set("limit", String(Math.min(limit, 25)));
      const data = await fetchJsonWithTimeout<BlueskySearchResponse>(url.toString(), { timeoutMs: 10000, maxBytes: 300_000 });

      for (const post of data.posts ?? []) {
        const text = sanitizeExternalText(post.record?.text, 700);
        const handle = sanitizeExternalText(post.author?.handle, 120);
        const postUrl = blueskyPostUrl(post.uri, handle ?? undefined);
        if (!text || !postUrl) {
          continue;
        }

        const engagement = (post.replyCount ?? 0) + (post.repostCount ?? 0) + (post.likeCount ?? 0) + (post.quoteCount ?? 0);
        sources.push({
          sourceType: "bluesky",
          title: sanitizeExternalText(`Bluesky: ${handle ?? "public post"}`, 240) ?? "Bluesky public post",
          url: postUrl,
          publisher: handle ? `@${handle}` : "Bluesky",
          publishedAt: post.record?.createdAt ? new Date(post.record.createdAt).toISOString().slice(0, 10) : null,
          snippet: text,
          sentiment: estimateBasicSentiment(text),
          relevanceScore: Math.round(Math.min(92, 45 + Math.min(engagement, 180) / 4))
        });

        if (sources.length >= limit) {
          break;
        }
      }

      if (sources.length >= limit) {
        break;
      }
    }

    return {
      provider: this.name,
      summary: sources.length
        ? `Bluesky zwrocil ${sources.length} publicznych postow dotyczacych repo/problemu.`
        : "Bluesky nie zwrocil publicznych postow dla tego zapytania.",
      signals: sources.map((source) => source.snippet).slice(0, 5),
      userProblems: sources
        .filter((source) => source.sentiment === "negative" || source.sentiment === "mixed")
        .map((source) => source.snippet)
        .slice(0, 5),
      sentiment: sources.some((source) => source.sentiment === "negative") ? "mixed" : "neutral",
      demandEvidence: sources.map((source) => source.snippet).slice(0, 5),
      validationRisks: ["Bluesky jest sygnalem social, czesto anegdotycznym; wymaga potwierdzenia rozmowami lub danymi zakupowymi."],
      confidenceScore: sources.length >= 3 ? 3 : sources.length ? 2 : 1,
      sources
    };
  }
};
