import type { EvidenceDisplaySource } from "@/lib/display/evidence-display";
import { evidenceKindLabel } from "@/lib/display/evidence-display";
import { formatDisplayDate } from "@/lib/display/formatters";
import { sanitizeExternalUrl } from "@/lib/utils";
import { Badge } from "./ui";

export function EvidenceCard({ source }: { source: EvidenceDisplaySource }) {
  const safeUrl = sanitizeExternalUrl(source.url);
  const content = (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge>{source.sourceType}</Badge>
        <Badge>{evidenceKindLabel(source.evidenceKind)}</Badge>
        {source.sourceConfidence !== null ? <Badge>Conf {source.sourceConfidence}/100</Badge> : null}
        {source.sentiment ? <Badge tone={sentimentTone(source.sentiment)}>{source.sentiment}</Badge> : null}
        {source.relevanceScore !== null ? <Badge>Rel {source.relevanceScore}/100</Badge> : null}
        {!safeUrl ? <Badge tone="warning">URL blocked</Badge> : null}
      </div>
      <div className="font-medium leading-5">{source.displayTitle}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        {[source.displayPublisher, source.publishedAt ? formatDisplayDate(source.publishedAt) : null].filter(Boolean).join(" | ")}
      </p>
      <p className="mt-2 rounded border border-border bg-muted px-2 py-1 text-xs">{source.displayWhatItProves}</p>
      <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{source.displaySnippet}</p>
    </>
  );

  if (!safeUrl) {
    return <div className="block rounded-md border border-border bg-background p-3 text-sm">{content}</div>;
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-md border border-border bg-background p-3 text-sm transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {content}
    </a>
  );
}

function sentimentTone(sentiment: string): "neutral" | "success" | "warning" | "danger" {
  const normalized = sentiment.toLowerCase();
  if (normalized.includes("positive")) {
    return "success";
  }
  if (normalized.includes("negative")) {
    return "danger";
  }
  if (normalized.includes("mixed")) {
    return "warning";
  }
  return "neutral";
}
