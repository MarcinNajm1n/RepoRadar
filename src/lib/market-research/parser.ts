import { clamp, safeJsonParse, sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import type { MarketResearchResult, MarketResearchSourceInput } from "./types";

function extractJsonObject(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return "{}";
}

function stringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeExternalText(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function numberOrNull(value: unknown, min: number, max: number) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  if (typeof value === "string" && !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(clamp(parsed, min, max)) : null;
}

function sanitizeSource(value: unknown): MarketResearchSourceInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const url = sanitizeExternalUrl(record.url);
  const title = sanitizeExternalText(record.title, 240);
  const snippet = sanitizeExternalText(record.snippet, 1200);

  if (!url || !title || !snippet) {
    return null;
  }

  const publishedAt = sanitizeExternalText(record.publishedAt, 64);

  return {
    sourceType: sanitizeExternalText(record.sourceType, 60) || "web",
    title,
    url,
    publisher: sanitizeExternalText(record.publisher, 160),
    publishedAt: publishedAt || null,
    snippet,
    sentiment: sanitizeExternalText(record.sentiment, 40),
    relevanceScore: numberOrNull(record.relevanceScore, 0, 100),
    canonicalUrl: sanitizeExternalUrl(record.canonicalUrl),
    sourceKey: sanitizeExternalText(record.sourceKey, 240),
    evidenceKind: sanitizeExternalText(record.evidenceKind, 80),
    whatItProves: sanitizeExternalText(record.whatItProves, 400),
    sourceConfidence: numberOrNull(record.sourceConfidence, 0, 100),
    sourceRank: numberOrNull(record.sourceRank, 0, 200),
    providerItemId: sanitizeExternalText(record.providerItemId, 240)
  };
}

export function parseMarketResearchResult(provider: string, content: string, maxSources: number): MarketResearchResult {
  const parsed = safeJsonParse<Record<string, unknown>>(extractJsonObject(content), {});
  const fallbackSummary = sanitizeExternalText(content.replace(/\s+/g, " ").trim(), 1200) ?? "";
  const sources = Array.isArray(parsed.sources)
    ? parsed.sources.map(sanitizeSource).filter((source): source is MarketResearchSourceInput => Boolean(source)).slice(0, maxSources)
    : [];

  return {
    provider,
    summary: sanitizeExternalText(parsed.summary, 2000) || fallbackSummary,
    signals: stringArray(parsed.signals, 8, 300),
    userProblems: stringArray(parsed.userProblems, 8, 300),
    sentiment: sanitizeExternalText(parsed.sentiment, 120) || "neutral",
    demandEvidence: stringArray(parsed.demandEvidence, 8, 300),
    validationRisks: stringArray(parsed.validationRisks, 8, 300),
    confidenceScore: numberOrNull(parsed.confidenceScore, 1, 5),
    sources,
    queries: stringArray(parsed.queries, 12, 180),
    providers: stringArray(parsed.providers, 8, 80),
    independentSourceCount: numberOrNull(parsed.independentSourceCount, 0, 100) ?? undefined,
    evidenceSummary: sanitizeExternalText(parsed.evidenceSummary, 1200),
    conflictSummary: sanitizeExternalText(parsed.conflictSummary, 1200)
  };
}

export function emptyMarketResearch(status: "DISABLED" | "UNAVAILABLE", error?: string) {
  return {
    provider: "none",
    summary: "",
    signals: [],
    userProblems: [],
    sentiment: "brak danych",
    demandEvidence: [],
    validationRisks: [],
    confidenceScore: null,
    sources: [],
    sourceIds: [],
    runIds: [],
    status,
    error
  };
}
