import type { EvidenceSourceItem } from "@/types/repository";
import { cleanDisplayText } from "./clean-display-text";

export type EvidenceGroupKey = "demand" | "pain_points" | "alternatives" | "risks" | "launch_signals" | "other";

export type EvidenceDisplaySource = EvidenceSourceItem & {
  displayTitle: string;
  displayPublisher: string | null;
  displaySnippet: string;
  displayWhatItProves: string;
};

export type EvidenceDisplayGroup = {
  key: EvidenceGroupKey;
  label: string;
  sources: EvidenceDisplaySource[];
  visibleSources: EvidenceDisplaySource[];
  hiddenCount: number;
};

export type EvidenceSummary = {
  sourceCount: number;
  independentSourceCount: number;
  averageConfidence: number | null;
  evidenceKinds: string[];
  hasMixedSentiment: boolean;
};

const GROUP_ORDER: EvidenceGroupKey[] = ["demand", "pain_points", "alternatives", "risks", "launch_signals", "other"];

const GROUP_LABELS: Record<EvidenceGroupKey, string> = {
  demand: "Demand",
  pain_points: "Pain points",
  alternatives: "Alternatives",
  risks: "Risks",
  launch_signals: "Launch signals",
  other: "Other"
};

export function evidenceKindLabel(kind: string | null | undefined) {
  const labels: Record<string, string> = {
    demand_signal: "Demand",
    pain_point: "Pain points",
    alternative: "Alternatives",
    competitor: "Competitors",
    pricing: "Pricing",
    manual_workflow: "Manual workflow",
    automation_request: "Automation",
    risk: "Risks",
    technical_context: "Technical context",
    launch_signal: "Launch signal",
    other: "Other"
  };

  return kind ? labels[kind] ?? cleanDisplayText(kind, { fallback: "Other" }) : "Other";
}

export function evidenceGroupKey(kind: string | null | undefined): EvidenceGroupKey {
  if (kind === "demand_signal") {
    return "demand";
  }
  if (kind === "pain_point" || kind === "manual_workflow" || kind === "automation_request") {
    return "pain_points";
  }
  if (kind === "alternative" || kind === "competitor" || kind === "pricing") {
    return "alternatives";
  }
  if (kind === "risk") {
    return "risks";
  }
  if (kind === "launch_signal") {
    return "launch_signals";
  }
  return "other";
}

export function fallbackWhatItProves(kind: string | null | undefined) {
  switch (evidenceGroupKey(kind)) {
    case "demand":
      return "Zrodlo sugeruje popyt lub zainteresowanie.";
    case "pain_points":
      return "Zrodlo wskazuje problem uzytkownikow.";
    case "risks":
      return "Zrodlo wskazuje ryzyko lub ograniczenie.";
    case "launch_signals":
      return "Zrodlo pokazuje sygnal zainteresowania lub launch.";
    case "alternatives":
      return "Zrodlo pokazuje alternatywe, konkurencje albo kontekst rynku.";
    default:
      return "Zrodlo dostarcza kontekstu do oceny pomyslu.";
  }
}

export function sortEvidenceSources<T extends EvidenceSourceItem>(sources: T[]) {
  return [...sources].sort((left, right) => {
    const rankDelta = (right.sourceRank ?? 0) - (left.sourceRank ?? 0);
    if (rankDelta !== 0) {
      return rankDelta;
    }

    const confidenceDelta = (right.sourceConfidence ?? 0) - (left.sourceConfidence ?? 0);
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    const relevanceDelta = (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0);
    if (relevanceDelta !== 0) {
      return relevanceDelta;
    }

    return new Date(right.retrievedAt).getTime() - new Date(left.retrievedAt).getTime();
  });
}

export function toEvidenceDisplaySource(source: EvidenceSourceItem): EvidenceDisplaySource {
  return {
    ...source,
    displayTitle: cleanDisplayText(source.title, { maxLength: 160, fallback: "Untitled source" }),
    displayPublisher: cleanDisplayText(source.publisher, { maxLength: 80 }) || null,
    displaySnippet: cleanDisplayText(source.snippet, { maxLength: 280, fallback: "Brak krotkiego opisu zrodla." }),
    displayWhatItProves: cleanDisplayText(source.whatItProves, {
      maxLength: 220,
      fallback: fallbackWhatItProves(source.evidenceKind)
    })
  };
}

export function groupEvidenceSourcesForDisplay(sources: EvidenceSourceItem[], visiblePerGroup = 2): EvidenceDisplayGroup[] {
  const sorted = sortEvidenceSources(sources).map(toEvidenceDisplaySource);

  return GROUP_ORDER.map((key) => {
    const groupSources = sorted.filter((source) => evidenceGroupKey(source.evidenceKind) === key);
    return {
      key,
      label: GROUP_LABELS[key],
      sources: groupSources,
      visibleSources: groupSources.slice(0, visiblePerGroup),
      hiddenCount: Math.max(0, groupSources.length - visiblePerGroup)
    };
  }).filter((group) => group.sources.length > 0);
}

export function getEvidenceSummary(sources: EvidenceSourceItem[]): EvidenceSummary {
  const confidenceValues = sources
    .map((source) => source.sourceConfidence)
    .filter((score): score is number => typeof score === "number");
  const sentiments = new Set(sources.map((source) => source.sentiment?.toLowerCase()).filter(Boolean));

  return {
    sourceCount: sources.length,
    independentSourceCount: new Set(
      sources.map((source) => source.publisher || source.sourceType || source.canonicalUrl || source.sourceKey).filter(Boolean)
    ).size,
    averageConfidence: confidenceValues.length
      ? Math.round(confidenceValues.reduce((sum, score) => sum + score, 0) / confidenceValues.length)
      : null,
    evidenceKinds: [...new Set(sources.map((source) => evidenceKindLabel(source.evidenceKind)))],
    hasMixedSentiment: sentiments.has("positive") && (sentiments.has("negative") || sentiments.has("mixed"))
  };
}
