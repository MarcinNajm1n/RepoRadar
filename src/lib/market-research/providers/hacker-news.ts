import { getConfig } from "@/lib/config";
import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import { buildResearchQueries, estimateBasicSentiment } from "../query";
import type { MarketResearchContext, MarketResearchProvider, MarketResearchSourceInput } from "../types";
import { fetchJsonWithTimeout } from "./http";

type HnAlgoliaHit = {
  objectID?: unknown;
  title?: unknown;
  story_title?: unknown;
  url?: unknown;
  story_url?: unknown;
  author?: unknown;
  created_at?: unknown;
  points?: unknown;
  num_comments?: unknown;
  story_text?: unknown;
  comment_text?: unknown;
};

type HnAlgoliaResponse = {
  hits?: unknown;
};

function hitUrl(hit: HnAlgoliaHit) {
  const directUrl = sanitizeExternalUrl(hit.url ?? hit.story_url);
  if (directUrl) {
    return directUrl;
  }

  const objectId = sanitizeExternalText(hit.objectID, 80);
  return objectId ? `https://news.ycombinator.com/item?id=${encodeURIComponent(objectId)}` : null;
}

function countValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function countLabel(value: unknown, label: string) {
  const count = countValue(value);
  return count > 0 ? `${count} ${label}` : null;
}

function publishedDate(value: unknown) {
  const cleanValue = sanitizeExternalText(value, 80);
  if (!cleanValue) {
    return null;
  }

  const date = new Date(cleanValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function hitSnippet(hit: HnAlgoliaHit) {
  return [
    sanitizeExternalText(hit.story_text ?? hit.comment_text, 500),
    countLabel(hit.points, "points"),
    countLabel(hit.num_comments, "comments")
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
      const data = await fetchJsonWithTimeout<HnAlgoliaResponse>(url, {
        timeoutMs: 10000,
        maxBytes: 250_000,
        allowedHosts: ["hn.algolia.com"]
      });
      const hits = Array.isArray(data.hits) ? data.hits : [];
      for (const rawHit of hits) {
        if (!rawHit || typeof rawHit !== "object") {
          continue;
        }

        const hit = rawHit as HnAlgoliaHit;
        const title = sanitizeExternalText(hit.title ?? hit.story_title, 240);
        const url = hitUrl(hit);
        if (!title || !url) {
          continue;
        }
        const snippet = sanitizeExternalText(hitSnippet(hit), 900) ?? "Public Hacker News search result.";
        const points = countValue(hit.points);
        const comments = countValue(hit.num_comments);
        const author = sanitizeExternalText(hit.author, 120);
        sources.push({
          sourceType: "hn",
          title,
          url,
          providerItemId: sanitizeExternalText(hit.objectID, 80),
          publisher: author ? `HN: ${author}` : "Hacker News",
          publishedAt: publishedDate(hit.created_at),
          snippet,
          sentiment: estimateBasicSentiment(`${title} ${snippet}`),
          relevanceScore: Math.round(Math.min(95, 45 + Math.min(points, 150) / 3 + Math.min(comments, 120) / 4))
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
