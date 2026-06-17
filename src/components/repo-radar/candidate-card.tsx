import { Brain, Star, Trash2 } from "lucide-react";
import type { IdeaListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { Badge, Button, ScoreChip, TextClamp } from "./ui";

export function CandidateCard({
  idea,
  isPending,
  onPromote,
  onSave,
  onDismiss,
  onOpenDetail
}: {
  idea: IdeaListItem;
  isPending: boolean;
  onPromote: () => void;
  onSave: () => void;
  onDismiss: () => void;
  onOpenDetail: () => void;
}) {
  const nextAction = idea.confidenceScore !== null && idea.confidenceScore >= 4 ? "Rozwin pelny pomysl" : "Sprawdz evidence i doprecyzuj";

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="break-words text-lg font-semibold">{cleanDisplayText(idea.title, { maxLength: 140 })}</h3>
        <Badge>{cleanDisplayText(idea.sourceRepoName, { maxLength: 80 })}</Badge>
        <ScoreChip label="Opportunity" score={idea.opportunityScore} />
        <ScoreChip label="Confidence" score={idea.confidenceScore} suffix="/5" />
        {idea.evidenceSources.length ? <Badge>{idea.evidenceSources.length} sources</Badge> : null}
      </div>
      <div className="rounded-md border border-border bg-muted p-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Next action</div>
        <div className="mt-1 text-sm font-medium">{nextAction}</div>
      </div>
      <TextClamp lines={2} className="mt-3">
        {cleanDisplayText(idea.applicationSummary ?? idea.problem, { maxLength: 260 })}
      </TextClamp>
      {idea.businessRationale ? (
        <TextClamp lines={2} className="mt-2">
          {cleanDisplayText(idea.businessRationale, { maxLength: 260 })}
        </TextClamp>
      ) : null}
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <Info label="Target user" value={idea.targetUser} />
        <Info label="Problem" value={idea.problem} />
        <Info label="Sources" value={`${idea.evidenceSources.length} zrodel`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onPromote} disabled={isPending}>
          <Brain className="h-4 w-4" /> Rozwin
        </Button>
        <Button variant="secondary" onClick={onSave} disabled={isPending}>
          <Star className="h-4 w-4" /> Zapisz
        </Button>
        <Button variant="danger" onClick={onDismiss} disabled={isPending}>
          <Trash2 className="h-4 w-4" /> Odrzuc
        </Button>
        <Button variant="ghost" onClick={onOpenDetail}>
          Szczegoly
        </Button>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="line-clamp-2 font-medium">{cleanDisplayText(value, { maxLength: 140 })}</div>
    </div>
  );
}
