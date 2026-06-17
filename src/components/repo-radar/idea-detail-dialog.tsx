import type React from "react";
import { Brain, Star, Trash2 } from "lucide-react";
import type { IdeaListItem } from "@/types/repository";
import { IDEA_STATUS } from "@/types/idea-status";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { Badge, Button, MetricPill, TextClamp } from "./ui";

export function IdeaDetailDialog({
  idea,
  isPending,
  evidence,
  onClose,
  onPromote,
  onSave,
  onDismiss
}: {
  idea: IdeaListItem;
  isPending: boolean;
  evidence: React.ReactNode;
  onClose: () => void;
  onPromote: () => void;
  onSave: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto max-h-[92vh] max-w-4xl overflow-auto rounded-lg border border-border bg-card p-5 shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-border bg-card pb-4">
          <div>
            <h2 className="text-xl font-semibold">{cleanDisplayText(idea.title, { maxLength: 180 })}</h2>
            <p className="text-sm text-muted-foreground">{cleanDisplayText(idea.sourceRepoName, { maxLength: 120 })}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
        </div>

        <section className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Decision box</h3>
            <Badge>{idea.status}</Badge>
          </div>
          <TextClamp lines={2} className="text-foreground">
            {cleanDisplayText(idea.problem, { maxLength: 260 })}
          </TextClamp>
        </section>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <MetricPill label="Opportunity" value={idea.opportunityScore === null ? "brak" : `${idea.opportunityScore}/100`} />
          <MetricPill label="Confidence" value={idea.confidenceScore === null ? "brak" : `${idea.confidenceScore}/5`} />
          <MetricPill label="Status" value={idea.status} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-3 text-sm leading-6">
            <h3 className="font-semibold">Executive summary</h3>
            <p>{cleanDisplayText(idea.proposedSolution, { maxLength: 420 })}</p>
            {idea.businessRationale ? <p>{cleanDisplayText(idea.businessRationale, { maxLength: 420 })}</p> : null}
            {idea.marketSummary ? <p className="rounded-md border border-border bg-muted p-3">{cleanDisplayText(idea.marketSummary, { maxLength: 520 })}</p> : null}
          </section>
          <section className="grid gap-3 text-sm">
            <Info label="Target user" value={idea.targetUser} />
            <Info label="MVP" value={idea.mvpScope} />
            <Info label="Monetyzacja" value={idea.monetizationPotential} />
            <Info label="Stack" value={idea.suggestedStack} />
          </section>
        </div>

        {idea.firstSteps.length ? (
          <section className="mt-4">
            <h3 className="text-sm font-semibold">First steps</h3>
            <ol className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              {idea.firstSteps.slice(0, 5).map((step, index) => (
                <li key={`${idea.id}-detail-step-${index}`} className="rounded-md border border-border bg-muted p-2">
                  {index + 1}. {cleanDisplayText(step, { maxLength: 180 })}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {idea.status !== IDEA_STATUS.DISMISSED ? (
            <Button variant="secondary" onClick={onPromote} disabled={isPending || idea.status === IDEA_STATUS.FULL}>
              <Brain className="h-4 w-4" /> Rozwin pelny pomysl
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onSave} disabled={isPending}>
            <Star className="h-4 w-4" /> Zapisz
          </Button>
          <Button variant="danger" onClick={onDismiss} disabled={isPending}>
            <Trash2 className="h-4 w-4" /> Odrzuc
          </Button>
        </div>

        <div className="mt-4">{evidence}</div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{cleanDisplayText(value, { maxLength: 220 })}</div>
    </div>
  );
}
