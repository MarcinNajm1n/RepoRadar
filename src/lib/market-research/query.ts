import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import type { MarketResearchContext, MarketResearchMode, MarketResearchSourceInput } from "./types";

export type ResearchQueryIntent =
  | "base"
  | "pain"
  | "alternatives"
  | "pricing"
  | "manual_workflow"
  | "automation"
  | "competitors"
  | "risks";

export type ResearchQuerySpec = {
  query: string;
  intent: ResearchQueryIntent;
};

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "this",
  "that",
  "your",
  "repo",
  "tool",
  "tools",
  "open",
  "source",
  "framework",
  "library"
]);

export function getRepoShortName(fullName: string) {
  return fullName.split("/").pop() ?? fullName;
}

function tokenize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function buildResearchQuerySpecs(context: MarketResearchContext, mode: MarketResearchMode = context.mode ?? "light") {
  const repoName = getRepoShortName(context.fullName);
  const topicTerms = context.topics.slice(0, 4).join(" ");
  const descriptionTerms = tokenize(context.description).slice(0, 6).join(" ");
  const base = [repoName, topicTerms, descriptionTerms].filter(Boolean).join(" ");
  const topic = topicTerms || repoName;

  const specs: ResearchQuerySpec[] = [
    { intent: "base", query: base },
    { intent: "pain", query: `${repoName} problem pain looking for tool` },
    { intent: "alternatives", query: `${repoName} alternatives pricing replace` },
    { intent: "manual_workflow", query: `${topic} manual workflow repetitive process` },
    { intent: "automation", query: `${topic} SaaS automation time saving cost saving` },
    { intent: "pricing", query: `${repoName} pricing expensive cost paid subscription` },
    { intent: "competitors", query: `${repoName} competitor alternative vs replace` },
    { intent: "risks", query: `${topic} security privacy unreliable vendor lock-in risk` }
  ];
  const maxQueries = mode === "light" ? 4 : 8;
  const seen = new Set<string>();
  const deduped: ResearchQuerySpec[] = [];

  for (const spec of specs) {
    const query = sanitizeExternalText(spec.query, 180);
    if (!query) {
      continue;
    }
    const key = query.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push({ ...spec, query });
    if (deduped.length >= maxQueries) {
      break;
    }
  }

  return deduped;
}

export function buildResearchQueries(context: MarketResearchContext) {
  return buildResearchQuerySpecs(context, context.mode ?? "light").map((spec) => spec.query);
}

export function buildPrimaryResearchQuery(context: MarketResearchContext) {
  return buildResearchQueries(context)[0] ?? getRepoShortName(context.fullName);
}

export function stripHtml(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return decodeHtmlEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").replace(/<[^>]*>/g, " "));
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function estimateBasicSentiment(value: string) {
  const normalized = value.toLowerCase();
  const negativeHits = ["problem", "pain", "hate", "broken", "bug", "hard", "expensive", "slow", "missing"].filter(
    (word) => normalized.includes(word)
  ).length;
  const positiveHits = ["love", "useful", "great", "fast", "simple", "better", "solves", "helpful"].filter((word) =>
    normalized.includes(word)
  ).length;

  if (negativeHits > 0 && positiveHits > 0) {
    return "mixed";
  }
  if (negativeHits > 0) {
    return "negative";
  }
  if (positiveHits > 0) {
    return "positive";
  }
  return "neutral";
}

export function dedupeSources(sources: MarketResearchSourceInput[], maxSources: number) {
  const seen = new Set<string>();
  const deduped: MarketResearchSourceInput[] = [];
  const ranked = [...sources].sort((a, b) => sourceRank(b) - sourceRank(a));

  for (const source of ranked) {
    const url = sanitizeExternalUrl(source.url);
    const title = sanitizeExternalText(source.title, 240);
    const snippet = sanitizeExternalText(source.snippet, 1200);
    if (!url || !title || !snippet) {
      continue;
    }

    const key = url.toLowerCase().replace(/\/$/, "");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push({
      ...source,
      title,
      url,
      snippet
    });

    if (deduped.length >= maxSources) {
      break;
    }
  }

  return deduped;
}

function sourceRank(source: MarketResearchSourceInput) {
  const weights: Record<string, number> = {
    hn: 18,
    reddit: 16,
    bluesky: 12,
    rss: 10,
    article: 10,
    web: 8,
    docs: 6
  };
  return (source.relevanceScore ?? 50) + (weights[source.sourceType] ?? 5);
}
