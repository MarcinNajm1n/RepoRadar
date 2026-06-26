import { getConfig } from "@/lib/config";
import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import {
  buildResearchQueries,
  decodeHtmlEntities,
  estimateBasicSentiment,
  stripHtml
} from "../query";
import type { MarketResearchContext, MarketResearchProvider, MarketResearchSourceInput } from "../types";
import { fetchWithTimeout } from "./http";

export const DEFAULT_MARKET_RESEARCH_RSS_FEEDS = [
  "https://hnrss.org/frontpage",
  "https://simonwillison.net/atom/everything/",
  "https://blog.langchain.com/rss/",
  "https://www.latent.space/feed",
  "https://martinfowler.com/feed.atom"
];

type FeedEntry = {
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  snippet: string;
};

function extractTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeHtmlEntities(stripHtml(match[1])).trim() : "";
}

function extractAtomLink(block: string) {
  const href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return href ? decodeHtmlEntities(href) : "";
}

function feedHost(feedUrl: string) {
  try {
    return new URL(feedUrl).hostname;
  } catch {
    return "RSS";
  }
}

function publishedDate(value: string) {
  const cleanValue = sanitizeExternalText(value, 80);
  if (!cleanValue) {
    return null;
  }

  const date = new Date(cleanValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function parseFeedEntries(xml: string, feedUrl: string): FeedEntry[] {
  const publisher = extractTag(xml, "title") || feedHost(feedUrl);
  const rssBlocks = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).map((match) => match[0]);
  const atomBlocks = Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map((match) => match[0]);
  const blocks = rssBlocks.length ? rssBlocks : atomBlocks;

  const entries: Array<FeedEntry | null> = blocks
    .map((block) => {
      const title = sanitizeExternalText(extractTag(block, "title"), 240);
      const url = sanitizeExternalUrl(extractTag(block, "link") || extractAtomLink(block));
      const snippet = sanitizeExternalText(
        extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content"),
        900
      );
      if (!title || !url || !snippet) {
        return null;
      }

      return {
        title,
        url,
        publisher: sanitizeExternalText(publisher, 160),
        publishedAt: publishedDate(extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated")),
        snippet
      };
    });

  return entries.filter((entry): entry is FeedEntry => Boolean(entry));
}

function matchesResearchTerms(entry: FeedEntry, terms: string[]) {
  const text = `${entry.title} ${entry.snippet}`.toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
}

export const rssProvider: MarketResearchProvider = {
  name: "rss",
  async research(context: MarketResearchContext) {
    const config = getConfig();
    if (!config.enableRssSource) {
      throw new Error("RSS source is disabled");
    }

    const feeds = config.marketResearchRssFeeds.length ? config.marketResearchRssFeeds : DEFAULT_MARKET_RESEARCH_RSS_FEEDS;
    const maxSources = Math.min(config.marketResearchMaxSources, context.mode === "light" ? 5 : 8);
    const terms = buildResearchQueries(context)
      .flatMap((query) => query.split(/\s+/))
      .map((term) => term.replace(/[^a-z0-9+#.\-]/gi, ""))
      .filter((term) => term.length >= 3)
      .slice(0, 12);
    const sources: MarketResearchSourceInput[] = [];

    for (const feed of feeds.slice(0, context.mode === "light" ? 5 : 10)) {
      const safeFeed = sanitizeExternalUrl(feed);
      if (!safeFeed) {
        continue;
      }
      const feedHost = new URL(safeFeed).hostname;

      try {
        const xml = await fetchWithTimeout(safeFeed, { timeoutMs: 10000, maxBytes: 500_000, allowedHosts: [feedHost] });
        const entries = parseFeedEntries(xml, safeFeed);
        for (const entry of entries) {
          if (terms.length && !matchesResearchTerms(entry, terms)) {
            continue;
          }

          sources.push({
            sourceType: "rss",
            title: entry.title,
            url: entry.url,
            publisher: entry.publisher,
            publishedAt: entry.publishedAt,
            snippet: entry.snippet,
            sentiment: estimateBasicSentiment(`${entry.title} ${entry.snippet}`),
            relevanceScore: 65
          });
          if (sources.length >= maxSources) {
            break;
          }
        }
      } catch {
        continue;
      }

      if (sources.length >= maxSources) {
        break;
      }
    }

    return {
      provider: this.name,
      summary: sources.length
        ? `RSS znalazl ${sources.length} publicznych wpisow z feedow AI/devtools/SaaS pasujacych do tematu.`
        : "RSS nie znalazl wpisow pasujacych do repo/problemu w skonfigurowanych feedach.",
      signals: sources.map((source) => source.title).slice(0, 5),
      userProblems: sources
        .filter((source) => source.sentiment === "negative" || source.sentiment === "mixed")
        .map((source) => source.snippet)
        .slice(0, 4),
      sentiment: sources.some((source) => source.sentiment === "negative") ? "mixed" : "neutral",
      demandEvidence: sources.map((source) => source.snippet).slice(0, 5),
      validationRisks: ["RSS pokazuje tematy redakcyjne i blogowe; nie jest bezposrednim dowodem popytu zakupowego."],
      confidenceScore: sources.length >= 3 ? 3 : sources.length ? 2 : 1,
      sources
    };
  }
};

export const rssProviderInternals = {
  parseFeedEntries
};
