import type { EvidenceSummary as EvidenceSummaryData } from "@/lib/display/evidence-display";
import { Badge } from "./ui";

export function EvidenceSummary({ summary }: { summary: EvidenceSummaryData }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>{summary.sourceCount} sources</Badge>
      <Badge>{summary.independentSourceCount} independent</Badge>
      {summary.averageConfidence !== null ? <Badge>Avg confidence {summary.averageConfidence}/100</Badge> : null}
      {summary.evidenceKinds.slice(0, 4).map((kind) => (
        <Badge key={kind}>{kind}</Badge>
      ))}
      {summary.hasMixedSentiment ? <Badge tone="warning">mixed sentiment</Badge> : null}
    </div>
  );
}
