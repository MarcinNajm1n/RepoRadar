import { clamp, safeJsonParse, sanitizeExternalText, sanitizeExternalUrl, truncateText } from "@/lib/utils";
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
    .map((item) => sanitizeExternalText(String(item), maxLength))
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
  const url = sanitizeExternalUrl(String(record.url ?? ""));
  const title = sanitizeExternalText(String(record.title ?? ""), 240);
  const snippet = sanitizeExternalText(String(record.snippet ?? ""), 1200);

  if (!url || !title || !snippet) {
    return null;
  }

  const publishedAt = sanitizeExternalText(String(record.publishedAt ?? ""), 64);

  return {
    sourceType: sanitizeExternalText(String(record.sourceType ?? "web"), 60) ?? "web",
    title,
    url,
    publisher: sanitizeExternalText(String(record.publisher ?? ""), 160),
    publishedAt: publishedAt || null,
    snippet,
    sentiment: sanitizeExternalText(String(record.sentiment ?? ""), 40),
    relevanceScore: numberOrNull(record.relevanceScore, 0, 100),
    canonicalUrl: sanitizeExternalUrl(String(record.canonicalUrl ?? "")),
    sourceKey: sanitizeExternalText(String(record.sourceKey ?? ""), 240),
    evidenceKind: sanitizeExternalText(String(record.evidenceKind ?? ""), 80),
    whatItProves: sanitizeExternalText(String(record.whatItProves ?? ""), 400),
    sourceConfidence: numberOrNull(record.sourceConfidence, 0, 100),
    sourceRank: numberOrNull(record.sourceRank, 0, 200),
    providerItemId: sanitizeExternalText(String(record.providerItemId ?? ""), 240)
  };
}

export function parseMarketResearchResult(provider: string, content: string, maxSources: number): MarketResearchResult {
  const parsed = safeJsonParse<Record<string, unknown>>(extractJsonObject(content), {});
  const sources = Array.isArray(parsed.sources)
    ? parsed.sources.map(sanitizeSource).filter((source): source is MarketResearchSourceInput => Boolean(source)).slice(0, maxSources)
    : [];

  return {
    provider,
    summary:
      sanitizeExternalText(String(parsed.summary ?? ""), 2000) ??
      truncateText(content.replace(/\s+/g, " ").trim(), 1200),
    signals: stringArray(parsed.signals, 8, 300),
    userProblems: stringArray(parsed.userProblems, 8, 300),
    sentiment: sanitizeExternalText(String(parsed.sentiment ?? "neutral"), 120) ?? "neutral",
    demandEvidence: stringArray(parsed.demandEvidence, 8, 300),
    validationRisks: stringArray(parsed.validationRisks, 8, 300),
    confidenceScore: numberOrNull(parsed.confidenceScore, 1, 5),
    sources,
    queries: stringArray(parsed.queries, 12, 180),
    providers: stringArray(parsed.providers, 8, 80),
    independentSourceCount: numberOrNull(parsed.independentSourceCount, 0, 100) ?? undefined,
    evidenceSummary: sanitizeExternalText(String(parsed.evidenceSummary ?? ""), 1200),
    conflictSummary: sanitizeExternalText(String(parsed.conflictSummary ?? ""), 1200)
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
