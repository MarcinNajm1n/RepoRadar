import { stableHash } from "@/lib/hash";
import { clamp, sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";
import type { EvidenceKind, MarketResearchContext, MarketResearchSourceInput } from "./types";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref"
];

const HIGH_VALUE_EVIDENCE_KINDS = new Set<EvidenceKind>([
  "demand_signal",
  "pain_point",
  "automation_request",
  "manual_workflow",
  "pricing",
  "alternative"
]);

const EVIDENCE_GROUP_LABELS: Record<EvidenceKind, string> = {
  demand_signal: "popyt",
  pain_point: "problem uzytkownika",
  alternative: "alternatywy",
  competitor: "konkurencja",
  pricing: "gotowosc do placenia lub koszt",
  manual_workflow: "reczny workflow",
  automation_request: "potrzeba automatyzacji",
  risk: "ryzyko walidacji",
  technical_context: "kontekst techniczny",
  launch_signal: "sygnal launchu",
  other: "slabszy sygnal"
};

export type EvidenceQualitySummary = {
  sourceCount: number;
  independentSourceCount: number;
  averageSourceConfidence: number | null;
  evidenceKinds: string[];
  evidenceSummary: string | null;
  conflictSummary: string | null;
};

export function canonicalizeUrl(url: string | null | undefined) {
  const safeUrl = sanitizeExternalUrl(url);
  if (!safeUrl) {
    return null;
  }

  try {
    const parsed = new URL(safeUrl);
    parsed.hostname = parsed.hostname.toLowerCase();
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    let normalized = parsed.toString();
    normalized = normalized.replace(/#$/, "");
    if (!parsed.search && !parsed.hash && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return null;
  }
}

function normalizedText(value: string | null | undefined, maxLength = 240) {
  return sanitizeExternalText(value, maxLength)?.toLowerCase() ?? "";
}

function sourceText(source: MarketResearchSourceInput) {
  return `${source.title} ${source.snippet}`.toLowerCase();
}

function providerKey(providerName: string) {
  const normalized = providerName.toLowerCase();
  if (normalized.includes("hacker") || normalized === "hn") {
    return "hn";
  }
  if (normalized.includes("reddit")) {
    return "reddit";
  }
  if (normalized.includes("bluesky")) {
    return "bluesky";
  }
  return normalized;
}

function snippetFingerprint(snippet: string | null | undefined) {
  return stableHash(normalizedText(snippet, 500)).slice(0, 16);
}

export function buildSourceKey(source: MarketResearchSourceInput, providerName = source.sourceType) {
  const provider = providerKey(providerName);
  const itemId = sanitizeExternalText(source.providerItemId ?? source.sourceKey ?? "", 240);
  if (itemId) {
    if (provider === "hn") {
      return `hn:${itemId}`;
    }
    if (provider === "reddit") {
      return `reddit:${itemId}`;
    }
    if (provider === "bluesky") {
      return `bluesky:${itemId}`;
    }
  }

  const canonicalUrl = source.canonicalUrl ?? canonicalizeUrl(source.url);
  if (canonicalUrl) {
    return `url:${canonicalUrl}`;
  }

  return `fingerprint:${normalizedText(source.title)}:${snippetFingerprint(source.snippet)}`;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function classifyEvidenceKind(source: MarketResearchSourceInput, _context?: MarketResearchContext): EvidenceKind {
  void _context;
  const text = sourceText(source);
  if (includesAny(text, ["security", "privacy", "unreliable", "vendor lock-in", "legal", "compliance"])) {
    return "risk";
  }
  if (includesAny(text, ["launch", "show hn", "product hunt", "release"])) {
    return "launch_signal";
  }
  if (includesAny(text, ["pricing", "expensive", "cost", "paid", "subscription"])) {
    return "pricing";
  }
  if (includesAny(text, ["competitor", "competition", "vs ", " versus "])) {
    return "competitor";
  }
  if (includesAny(text, ["alternative", "replace", "pricing"])) {
    return "alternative";
  }
  if (includesAny(text, ["looking for", "need tool", "recommendation", "request", "how do i", "how to"])) {
    return "demand_signal";
  }
  if (includesAny(text, ["manual", "spreadsheet", "copy paste", "copy-paste", "repetitive", "process"])) {
    return "manual_workflow";
  }
  if (includesAny(text, ["automate", "automation", "script", "workflow", "repetitive"])) {
    return "automation_request";
  }
  if (includesAny(text, ["problem", "pain", "struggle", "hard", "broken", "annoying", "expensive", "slow", "missing"])) {
    return "pain_point";
  }
  if (includesAny(text, ["github", "api", "docs", "technical", "framework"])) {
    return "technical_context";
  }
  return "other";
}

function sourceTypeWeight(sourceType: string) {
  const normalized = sourceType.toLowerCase();
  if (normalized === "hn") {
    return 18;
  }
  if (normalized === "reddit") {
    return 14;
  }
  if (normalized === "rss" || normalized === "article") {
    return 13;
  }
  if (normalized === "openai-web-search" || normalized === "web") {
    return 9;
  }
  if (normalized === "bluesky") {
    return 7;
  }
  if (normalized === "docs" || normalized === "github") {
    return 8;
  }
  return 5;
}

function freshnessPoints(publishedAt: string | null | undefined) {
  if (!publishedAt) {
    return 5;
  }
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) {
    return 5;
  }
  const ageDays = Math.max(0, (Date.now() - published.getTime()) / 86_400_000);
  if (ageDays <= 30) {
    return 15;
  }
  if (ageDays <= 180) {
    return 10;
  }
  if (ageDays <= 365) {
    return 6;
  }
  return 2;
}

export function estimateSourceConfidence(source: MarketResearchSourceInput, context?: MarketResearchContext) {
  const kind = (source.evidenceKind as EvidenceKind | undefined) ?? classifyEvidenceKind(source, context);
  const text = sourceText(source);
  const relevancePoints = clamp(source.relevanceScore ?? 50, 0, 100) * 0.4;
  const providerPoints = sourceTypeWeight(source.sourceType);
  const snippetLength = sanitizeExternalText(source.snippet, 1400)?.length ?? 0;
  const snippetPoints = snippetLength >= 120 ? 10 : snippetLength >= 40 ? 6 : 2;
  const kindPoints = HIGH_VALUE_EVIDENCE_KINDS.has(kind) ? 10 : kind === "risk" || kind === "launch_signal" ? 6 : 3;
  const metadataPoints = source.publisher || source.publishedAt ? 5 : 0;
  const hypePenalty =
    includesAny(text, ["hype", "viral", "buzz", "everyone talks"]) && !HIGH_VALUE_EVIDENCE_KINDS.has(kind) ? 10 : 0;
  const confidence = relevancePoints + providerPoints + freshnessPoints(source.publishedAt) + snippetPoints + kindPoints + metadataPoints - hypePenalty;
  return Math.round(clamp(confidence, 0, 100));
}

export function rankEvidenceSource(source: MarketResearchSourceInput) {
  return Math.round(
    clamp(source.sourceConfidence ?? 0, 0, 100) +
      clamp(source.relevanceScore ?? 50, 0, 100) * 0.25 +
      sourceTypeWeight(source.sourceType)
  );
}

export function buildWhatItProves(source: MarketResearchSourceInput, context?: MarketResearchContext) {
  const kind = (source.evidenceKind as EvidenceKind | undefined) ?? classifyEvidenceKind(source, context);
  const subject = context?.topics?.[0] ? `obszarze ${context.topics[0]}` : "tym workflow";
  const textByKind: Record<EvidenceKind, string> = {
    demand_signal: `To zrodlo sugeruje, ze uzytkownicy aktywnie szukaja narzedzia w ${subject}.`,
    pain_point: `To zrodlo wskazuje realny bol uzytkownika, ktory moze uzasadniac produkt.`,
    alternative: `To zrodlo pokazuje, ze istnieja alternatywy lub porownania, czyli rynek jest juz rozpoznany.`,
    competitor: `To zrodlo wskazuje konkurencje, ktora trzeba uwzglednic przy walidacji.`,
    pricing: `To zrodlo sugeruje rozmowe o kosztach lub gotowosci do placenia.`,
    manual_workflow: `To zrodlo pokazuje reczny albo powtarzalny proces mozliwy do usprawnienia.`,
    automation_request: `To zrodlo sugeruje potrzebe automatyzacji pracy uzytkownika.`,
    risk: `To zrodlo wskazuje ryzyko, ktore trzeba sprawdzic przed budowa produktu.`,
    technical_context: `To zrodlo daje kontekst techniczny, ale samo nie dowodzi popytu.`,
    launch_signal: `To zrodlo pokazuje sygnal launchu lub zainteresowania early adopters.`,
    other: `To zrodlo jest pomocniczym sygnalem wymagajacym recznej weryfikacji.`
  };
  return textByKind[kind];
}

export function normalizeSource(source: MarketResearchSourceInput, providerName: string, context?: MarketResearchContext) {
  const canonicalUrl = canonicalizeUrl(source.url);
  const title = sanitizeExternalText(source.title, 240);
  const snippet = sanitizeExternalText(source.snippet, 1200);
  if (!canonicalUrl || !title || !snippet) {
    return null;
  }

  const evidenceKind = (source.evidenceKind as EvidenceKind | undefined) ?? classifyEvidenceKind(source, context);
  const normalized: MarketResearchSourceInput = {
    ...source,
    sourceType: sanitizeExternalText(source.sourceType || providerName, 80) ?? providerName,
    title,
    url: canonicalUrl,
    canonicalUrl,
    sourceKey: buildSourceKey({ ...source, title, snippet, canonicalUrl }, providerName),
    publisher: sanitizeExternalText(source.publisher, 180),
    publishedAt: sanitizeExternalText(source.publishedAt, 80),
    snippet,
    sentiment: sanitizeExternalText(source.sentiment, 60),
    relevanceScore:
      source.relevanceScore === null || source.relevanceScore === undefined
        ? null
        : Math.round(clamp(Number(source.relevanceScore), 0, 100)),
    evidenceKind,
    providerItemId: sanitizeExternalText(source.providerItemId, 240)
  };
  normalized.sourceConfidence = estimateSourceConfidence(normalized, context);
  normalized.sourceRank = rankEvidenceSource(normalized);
  normalized.whatItProves = sanitizeExternalText(source.whatItProves, 400) ?? buildWhatItProves(normalized, context);
  return normalized;
}

function titleKey(source: MarketResearchSourceInput) {
  return normalizedText(source.title)
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprintKey(source: MarketResearchSourceInput) {
  return `${titleKey(source)}:${snippetFingerprint(source.snippet)}`;
}

function strongerSource(a: MarketResearchSourceInput, b: MarketResearchSourceInput) {
  return (a.sourceRank ?? 0) > (b.sourceRank ?? 0) ? a : b;
}

export function dedupeEvidenceSources(
  sources: MarketResearchSourceInput[],
  options: { maxSources: number; maxPerProvider: number; context?: MarketResearchContext }
) {
  const candidates = sources
    .map((source) => normalizeSource(source, source.sourceType, options.context))
    .filter((source): source is MarketResearchSourceInput => Boolean(source))
    .sort((a, b) => (b.sourceRank ?? 0) - (a.sourceRank ?? 0));
  const byKey = new Map<string, MarketResearchSourceInput>();

  for (const source of candidates) {
    const keys = [
      source.sourceKey ? `key:${source.sourceKey}` : null,
      source.canonicalUrl ? `url:${source.canonicalUrl}` : null,
      titleKey(source) ? `title:${titleKey(source)}` : null,
      fingerprintKey(source)
    ].filter((key): key is string => Boolean(key));
    const existing = keys.map((key) => byKey.get(key)).find(Boolean);
    const selected = existing ? strongerSource(source, existing) : source;

    for (const key of keys) {
      byKey.set(key, selected);
    }
  }

  const unique = [...new Set(byKey.values())].sort((a, b) => (b.sourceRank ?? 0) - (a.sourceRank ?? 0));
  const providerCounts = new Map<string, number>();
  const selected: MarketResearchSourceInput[] = [];

  for (const source of unique) {
    const provider = source.sourceType;
    const count = providerCounts.get(provider) ?? 0;
    if (count >= options.maxPerProvider) {
      continue;
    }
    providerCounts.set(provider, count + 1);
    selected.push(source);
    if (selected.length >= options.maxSources) {
      break;
    }
  }

  return selected;
}

export function summarizeEvidenceQuality(sources: MarketResearchSourceInput[]): EvidenceQualitySummary {
  const independentKeys = new Set(
    sources.map((source) => source.publisher || source.sourceType || source.canonicalUrl || source.sourceKey).filter(Boolean)
  );
  const confidenceValues = sources
    .map((source) => source.sourceConfidence)
    .filter((score): score is number => typeof score === "number");
  const averageSourceConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, score) => sum + score, 0) / confidenceValues.length)
    : null;
  const evidenceKinds = [...new Set(sources.map((source) => source.evidenceKind).filter((kind): kind is string => Boolean(kind)))];
  const sentiments = new Set(sources.map((source) => source.sentiment?.toLowerCase()).filter(Boolean));
  const conflictSummary =
    sentiments.has("positive") && (sentiments.has("negative") || sentiments.has("mixed"))
      ? "Zrodla maja mieszany sentyment: czesc wskazuje zainteresowanie, a czesc problemy lub ryzyka."
      : null;
  const evidenceSummary = sources.length
    ? `${sources.length} zrodel, ${independentKeys.size} niezaleznych, srednia jakosc ${averageSourceConfidence ?? "brak"}/100. Glowne typy: ${
        evidenceKinds.map((kind) => EVIDENCE_GROUP_LABELS[kind as EvidenceKind] ?? kind).join(", ") || "brak"
      }.`
    : null;

  return {
    sourceCount: sources.length,
    independentSourceCount: independentKeys.size,
    averageSourceConfidence,
    evidenceKinds,
    evidenceSummary,
    conflictSummary
  };
}
