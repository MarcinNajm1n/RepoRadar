"use client";

import type React from "react";
import type { IdeaListItem } from "@/types/repository";
import { Badge, EmptyState, MetricPill } from "./ui";
import { CandidateCard } from "./candidate-card";
import { FullIdeaCard } from "./full-idea-card";
import { IdeaCard } from "./idea-card";

export type IdeasViewMode = "candidates" | "full" | "saved" | "dismissed";

const modeCopy: Record<IdeasViewMode, { title: string; description: string; metric: string }> = {
  candidates: {
    title: "Kandydaci",
    description: "Szybka ocena okazji przed pelnym pomyslem.",
    metric: "Do oceny"
  },
  full: {
    title: "Pelne pomysly",
    description: "Pomysly gotowe do dalszej walidacji.",
    metric: "Pelne"
  },
  saved: {
    title: "Zapisane pomysly",
    description: "Kandydaci i pomysly zostawione do powrotu.",
    metric: "Zapisane"
  },
  dismissed: {
    title: "Odrzucone pomysly",
    description: "Decyzje do ewentualnego przywrocenia.",
    metric: "Odrzucone"
  }
};

export function IdeasView({
  mode,
  ideas,
  isPending,
  emptyTitle,
  emptyText,
  onPromote,
  onSave,
  onDismiss,
  onRestore,
  onOpenDetail,
  renderEvidence
}: {
  mode: IdeasViewMode;
  ideas: IdeaListItem[];
  isPending: boolean;
  emptyTitle: string;
  emptyText: string;
  onPromote: (ideaId: string) => void;
  onSave: (ideaId: string) => void;
  onDismiss: (ideaId: string) => void;
  onRestore: (ideaId: string) => void;
  onOpenDetail: (idea: IdeaListItem) => void;
  renderEvidence?: (idea: IdeaListItem) => React.ReactNode;
}) {
  const copy = modeCopy[mode];
  const averageOpportunity = averageScore(ideas.map((idea) => idea.opportunityScore));
  const evidenceCount = ideas.reduce((sum, idea) => sum + idea.evidenceSources.length, 0);

  if (!ideas.length) {
    return (
      <section className="space-y-3">
        <IdeaListHeader copy={copy} count={0} averageOpportunity={null} evidenceCount={0} />
        <EmptyState title={emptyTitle} text={emptyText} />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <IdeaListHeader copy={copy} count={ideas.length} averageOpportunity={averageOpportunity} evidenceCount={evidenceCount} />
      {ideas.map((idea) => {
        if (mode === "candidates") {
          return (
            <CandidateCard
              key={idea.id}
              idea={idea}
              isPending={isPending}
              onPromote={() => onPromote(idea.id)}
              onSave={() => onSave(idea.id)}
              onDismiss={() => onDismiss(idea.id)}
              onOpenDetail={() => onOpenDetail(idea)}
            />
          );
        }

        if (mode === "full") {
          return (
            <FullIdeaCard
              key={idea.id}
              idea={idea}
              evidence={renderEvidence?.(idea)}
              onOpenDetail={() => onOpenDetail(idea)}
            />
          );
        }

        return (
          <IdeaCard
            key={idea.id}
            idea={idea}
            isPending={isPending}
            muted={mode === "dismissed"}
            onOpenDetail={() => onOpenDetail(idea)}
            onDismiss={mode === "saved" ? () => onDismiss(idea.id) : undefined}
            onRestore={mode === "dismissed" ? () => onRestore(idea.id) : undefined}
          />
        );
      })}
    </section>
  );
}

function IdeaListHeader({
  copy,
  count,
  averageOpportunity,
  evidenceCount
}: {
  copy: { title: string; description: string; metric: string };
  count: number;
  averageOpportunity: number | null;
  evidenceCount: number;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{copy.title}</h2>
            <Badge variant="score">{count}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[440px]">
          <MetricPill label={copy.metric} value={count} />
          <MetricPill label="Avg opportunity" value={averageOpportunity === null ? "brak" : `${averageOpportunity}/100`} />
          <MetricPill label="Evidence" value={evidenceCount} />
        </div>
      </div>
    </section>
  );
}

function averageScore(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (!present.length) {
    return null;
  }
  return Math.round(present.reduce((sum, value) => sum + value, 0) / present.length);
}
