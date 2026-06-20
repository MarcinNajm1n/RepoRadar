"use client";

import { Brain, Star, Trash2 } from "lucide-react";
import type { IdeaListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { Badge, Button, MetricPill, ScoreChip, TextClamp } from "./ui";

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
  const nextAction = idea.confidenceScore !== null && idea.confidenceScore >= 4 ? "Rozwin pelny pomysl" : "Sprawdz evidence";

  return (
    <article className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold">{cleanDisplayText(idea.title, { maxLength: 140 })}</h3>
            <Badge variant="source">{cleanDisplayText(idea.sourceRepoName, { maxLength: 80 })}</Badge>
            {idea.evidenceSources.length ? <Badge variant="score">{idea.evidenceSources.length} sources</Badge> : null}
          </div>
          <TextClamp lines={2} className="mt-2">
            {cleanDisplayText(idea.applicationSummary ?? idea.problem, { maxLength: 280 })}
          </TextClamp>
          {idea.businessRationale ? (
            <TextClamp lines={2} className="mt-2">
              {cleanDisplayText(idea.businessRationale, { maxLength: 280 })}
            </TextClamp>
          ) : null}
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
            <Info label="Target user" value={idea.targetUser} />
            <Info label="Problem" value={idea.problem} />
            <Info label="Monetyzacja" value={idea.monetizationPotential} />
          </div>
        </div>

        <aside className="rounded-md border border-border-subtle bg-surface-inset p-3">
          <div className="grid gap-2">
            <ScoreChip label="Opportunity" score={idea.opportunityScore} />
            <ScoreChip label="Confidence" score={idea.confidenceScore} suffix="/5" />
            <MetricPill label="Evidence" value={`${idea.evidenceSources.length} zrodel`} />
          </div>
          <div className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Next action</div>
            <div className="mt-1 text-sm font-semibold">{nextAction}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={onPromote} disabled={isPending}>
              <Brain className="h-4 w-4" /> Rozwin
            </Button>
            <Button variant="secondary" size="sm" onClick={onSave} disabled={isPending}>
              <Star className="h-4 w-4" /> Zapisz
            </Button>
            <Button variant="danger" size="sm" onClick={onDismiss} disabled={isPending}>
              <Trash2 className="h-4 w-4" /> Odrzuc
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenDetail}>
              Szczegoly
            </Button>
          </div>
        </aside>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-surface-inset px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 line-clamp-2 text-sm font-semibold">{cleanDisplayText(value, { maxLength: 150 })}</div>
    </div>
  );
}
