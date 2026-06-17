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
    <article className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="break-words text-lg font-semibold">{cleanDisplayText(idea.title, { maxLength: 140 })}</h3>
        <Badge>{cleanDisplayText(idea.sourceRepoName, { maxLength: 80 })}</Badge>
        <ScoreChip label="Confidence" score={idea.confidenceScore} suffix="/5" />
        {idea.evidenceSources.length ? <Badge>{idea.evidenceSources.length} sources</Badge> : null}
      </div>
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Decision box</div>
        <TextClamp lines={2} className="mt-1 text-foreground">
          {cleanDisplayText(idea.problem, { maxLength: 220 })}
        </TextClamp>
      </div>
      {idea.marketSummary ? (
        <TextClamp lines={3} className="mt-3 rounded-md border border-border bg-muted p-3">
          {cleanDisplayText(idea.marketSummary, { maxLength: 420 })}
        </TextClamp>
      ) : null}
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <MetricPill label="Risk" value={`${idea.riskScore}/5`} />
        <MetricPill label="Difficulty" value={`${idea.difficulty}/5`} />
        <MetricPill label="Usefulness" value={`${idea.usefulnessScore}/5`} />
      </div>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <Info label="Dla kogo" value={idea.targetUser} />
        <Info label="MVP" value={idea.mvpScope} />
        <Info label="Monetyzacja" value={idea.monetizationPotential} />
      </div>
      <TextClamp lines={2} className="mt-3">
        {cleanDisplayText(idea.proposedSolution, { maxLength: 260 })}
      </TextClamp>
      <p className="mt-2 text-sm text-muted-foreground">Stack: {cleanDisplayText(idea.suggestedStack, { maxLength: 220 })}</p>
      {idea.firstSteps.length ? (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Pierwsze kroki</h4>
          <ol className="mt-2 grid gap-2 text-sm md:grid-cols-2">
            {idea.firstSteps.slice(0, 5).map((step, index) => (
              <li key={`${idea.id}-step-${index}`} className="rounded-md border border-border bg-muted p-2">
                {index + 1}. {cleanDisplayText(step, { maxLength: 180 })}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onOpenDetail}>
          Szczegoly
        </Button>
      </div>
      {evidence ? <div className="mt-4">{evidence}</div> : null}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="line-clamp-2 font-medium">{cleanDisplayText(value, { maxLength: 160 })}</div>
    </div>
  );
}
