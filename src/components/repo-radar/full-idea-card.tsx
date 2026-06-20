"use client";

import type React from "react";
import type { IdeaListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { Badge, Button, MetricPill, ScoreChip, TextClamp } from "./ui";

export function FullIdeaCard({
  idea,
  evidence,
  onOpenDetail
}: {
  idea: IdeaListItem;
  evidence?: React.ReactNode;
  onOpenDetail: () => void;
}) {
  return (
    <article className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold">{cleanDisplayText(idea.title, { maxLength: 150 })}</h3>
            <Badge variant="source">{cleanDisplayText(idea.sourceRepoName, { maxLength: 80 })}</Badge>
            <ScoreChip label="Confidence" score={idea.confidenceScore} suffix="/5" />
            {idea.evidenceSources.length ? <Badge variant="score">{idea.evidenceSources.length} sources</Badge> : null}
          </div>
          <TextClamp lines={2} className="mt-2 text-foreground">
            {cleanDisplayText(idea.problem, { maxLength: 260 })}
          </TextClamp>
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenDetail}>
          Szczegoly
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_18rem]">
        <InfoPanel label="Rozwiazanie" value={idea.proposedSolution} />
        <InfoPanel label="Rynek" value={idea.marketSummary ?? idea.businessRationale ?? idea.monetizationPotential} />
        <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
          <div className="grid gap-2">
            <MetricPill label="Risk" value={`${idea.riskScore}/5`} />
            <MetricPill label="Difficulty" value={`${idea.difficulty}/5`} />
            <MetricPill label="Usefulness" value={`${idea.usefulnessScore}/5`} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <Info label="Dla kogo" value={idea.targetUser} />
        <Info label="MVP" value={idea.mvpScope} />
        <Info label="Monetyzacja" value={idea.monetizationPotential} />
      </div>

      <p className="mt-3 break-words text-sm text-muted-foreground">Stack: {cleanDisplayText(idea.suggestedStack, { maxLength: 220 })}</p>

      {idea.firstSteps.length ? (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Pierwsze kroki</h4>
          <ol className="mt-2 grid gap-2 text-sm md:grid-cols-2">
            {idea.firstSteps.slice(0, 5).map((step, index) => (
              <li key={`${idea.id}-step-${index}`} className="rounded-md border border-border-subtle bg-surface-inset p-2">
                <span className="font-semibold tabular-nums">{index + 1}.</span> {cleanDisplayText(step, { maxLength: 180 })}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {evidence ? <div className="mt-4">{evidence}</div> : null}
    </article>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <TextClamp lines={4} className="mt-1">
        {cleanDisplayText(value, { maxLength: 420 })}
      </TextClamp>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-surface-inset px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 line-clamp-2 text-sm font-semibold">{cleanDisplayText(value, { maxLength: 160 })}</div>
    </div>
  );
}
