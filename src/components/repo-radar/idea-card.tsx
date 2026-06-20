"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import type { IdeaListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { cn } from "@/lib/utils";
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
    <article className={cn("rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft", muted && "opacity-75")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold">{cleanDisplayText(idea.title, { maxLength: 140 })}</h3>
            <Badge variant="source">{cleanDisplayText(idea.sourceRepoName, { maxLength: 80 })}</Badge>
            <ScoreChip label="Opportunity" score={idea.opportunityScore} />
            <ScoreChip label="Confidence" score={idea.confidenceScore} suffix="/5" />
            {muted ? <Badge tone="danger">DISMISSED</Badge> : null}
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
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {onRestore ? (
            <Button variant="secondary" size="sm" onClick={onRestore} disabled={isPending}>
              <RotateCcw className="h-4 w-4" /> Przywroc
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onOpenDetail}>
            Szczegoly
          </Button>
          {onDismiss ? (
            <Button variant="danger" size="sm" onClick={onDismiss} disabled={isPending}>
              <Trash2 className="h-4 w-4" /> Odrzuc
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
