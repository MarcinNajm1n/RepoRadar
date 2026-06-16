import { getConfig } from "@/lib/config";
import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import { buildResearchQueries, estimateBasicSentiment } from "../query";
import type { MarketResearchContext, MarketResearchProvider, MarketResearchSourceInput } from "../types";
import { fetchJsonWithTimeout } from "./http";

type HnAlgoliaHit = {
  objectID?: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  author?: string;
  created_at?: string;
  points?: number;
  num_comments?: number;
  story_text?: string;
  comment_text?: string;
};

type HnAlgoliaResponse = {
  hits?: HnAlgoliaHit[];
};

function hitUrl(hit: HnAlgoliaHit) {
  return sanitizeExternalUrl(hit.url ?? hit.story_url) ?? `https://news.ycombinator.com/item?id=${hit.objectID ?? ""}`;
}

function hitSnippet(hit: HnAlgoliaHit) {
  return [
    sanitizeExternalText(hit.story_text ?? hit.comment_text, 500),
    hit.points === undefined ? null : `${hit.points} points`,
    hit.num_comments === undefined ? null : `${hit.num_comments} comments`
  ]
    .filter(Boolean)
    .join(" | ");
}

export const hackerNewsProvider: MarketResearchProvider = {
  name: "hn",
  async research(context: MarketResearchContext) {
    const config = getConfig();
    if (!config.enableHnSource) {
      throw new Error("HN source is disabled");
    }

    const perQueryLimit = context.mode === "light" ? 4 : 6;
    const maxSources = Math.min(config.marketResearchMaxSources, context.mode === "light" ? 5 : 8);
    const sources: MarketResearchSourceInput[] = [];

    for (const query of buildResearchQueries(context).slice(0, context.mode === "light" ? 2 : 4)) {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${perQueryLimit}`;
      const data = await fetchJsonWithTimeout<HnAlgoliaResponse>(url, { timeoutMs: 10000, maxBytes: 250_000 });
      for (const hit of data.hits ?? []) {
        const title = sanitizeExternalText(hit.title ?? hit.story_title, 240);
        const url = hitUrl(hit);
        if (!title || !url) {
          continue;
        }
        const snippet = sanitizeExternalText(hitSnippet(hit), 900) ?? "Public Hacker News search result.";
        sources.push({
          sourceType: "hn",
          title,
          url,
          publisher: hit.author ? `HN: ${hit.author}` : "Hacker News",
          publishedAt: hit.created_at ? new Date(hit.created_at).toISOString().slice(0, 10) : null,
          snippet,
          sentiment: estimateBasicSentiment(`${title} ${snippet}`),
          relevanceScore: Math.round(
            Math.min(95, 45 + Math.min(hit.points ?? 0, 150) / 3 + Math.min(hit.num_comments ?? 0, 120) / 4)
          )
        });
      }

      if (sources.length >= maxSources) {
        break;
      }
    }

    const limitedSources = sources.slice(0, maxSources);
    return {
      provider: this.name,
      summary: limitedSources.length
        ? `HN zwrocil ${limitedSources.length} publicznych dyskusji lub linkow powiazanych z repo/problematyka.`
        : "HN nie zwrocil silnych publicznych sygnalow dla tego repo/problemu.",
      signals: limitedSources.map((source) => source.title).slice(0, 5),
      userProblems: limitedSources
        .filter((source) => source.sentiment === "negative" || source.sentiment === "mixed")
        .map((source) => source.snippet)
        .slice(0, 4),
      sentiment: limitedSources.some((source) => source.sentiment === "negative") ? "mixed" : "neutral",
      demandEvidence: limitedSources.map((source) => source.snippet).slice(0, 5),
      validationRisks: ["HN jest sygnalem wczesnej adopcji, ale nie dowodzi gotowosci do platnosci."],
      confidenceScore: limitedSources.length >= 3 ? 3 : limitedSources.length ? 2 : 1,
      sources: limitedSources
    };
  }
};
