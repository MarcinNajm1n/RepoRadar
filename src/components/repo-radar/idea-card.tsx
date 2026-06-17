import { Trash2 } from "lucide-react";
import type { IdeaListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { Badge, Button, ScoreChip, TextClamp } from "./ui";

export function IdeaCard({
  idea,
  isPending,
  muted = false,
  onOpenDetail,
  onDismiss,
  onRestore
}: {
  idea: IdeaListItem;
  isPending: boolean;
  muted?: boolean;
  onOpenDetail: () => void;
  onDismiss?: () => void;
  onRestore?: () => void;
}) {
  return (
    <article className={`rounded-lg border border-border bg-card p-4 shadow-soft ${muted ? "opacity-80" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="break-words text-lg font-semibold">{cleanDisplayText(idea.title, { maxLength: 140 })}</h3>
        <Badge>{cleanDisplayText(idea.sourceRepoName, { maxLength: 80 })}</Badge>
        <ScoreChip label="Opportunity" score={idea.opportunityScore} />
        {muted ? <Badge>DISMISSED</Badge> : null}
        {idea.evidenceSources.length ? <Badge>{idea.evidenceSources.length} sources</Badge> : null}
      </div>
      <TextClamp lines={2}>{cleanDisplayText(idea.applicationSummary ?? idea.problem, { maxLength: 260 })}</TextClamp>
      {idea.businessRationale ? (
        <TextClamp lines={2} className="mt-2">
          {cleanDisplayText(idea.businessRationale, { maxLength: 260 })}
        </TextClamp>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {onRestore ? (
          <Button variant="secondary" onClick={onRestore} disabled={isPending}>
            Przywroc jako kandydat
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onOpenDetail}>
          Szczegoly
        </Button>
        {onDismiss ? (
          <Button variant="danger" onClick={onDismiss} disabled={isPending}>
            <Trash2 className="h-4 w-4" /> Odrzuc
          </Button>
        ) : null}
      </div>
    </article>
  );
}
