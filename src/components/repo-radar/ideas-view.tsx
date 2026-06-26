"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RotateCcw, Search } from "lucide-react";
import type { IdeaListItem } from "@/types/repository";
import { cn } from "@/lib/utils";
import { Badge, Button, EmptyState, MetricPill } from "./ui";
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

type IdeaFilterState = {
  query: string;
  minOpportunity: number;
  minConfidence: number;
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
  renderEvidence?: (idea: IdeaListItem) => ReactNode;
}) {
  const copy = modeCopy[mode];
  const [query, setQuery] = useState("");
  const [minOpportunity, setMinOpportunity] = useState(0);
  const [minConfidence, setMinConfidence] = useState(0);
  const filters = useMemo(() => ({ query, minOpportunity, minConfidence }), [query, minOpportunity, minConfidence]);
  const hasActiveFilters = hasActiveIdeaFilters(filters);
  const activeFilterLabels = buildIdeaFilterLabels(filters);
  const filteredIdeas = useMemo(() => filterIdeas(ideas, filters), [ideas, filters]);
  const averageOpportunity = averageScore(filteredIdeas.map((idea) => idea.opportunityScore));
  const evidenceCount = filteredIdeas.reduce((sum, idea) => sum + idea.evidenceSources.length, 0);
  const resetFilters = () => {
    setQuery("");
    setMinOpportunity(0);
    setMinConfidence(0);
  };

  if (!ideas.length) {
    return (
      <section className="space-y-3">
        <IdeaListHeader copy={copy} count={0} totalCount={0} averageOpportunity={null} evidenceCount={0} />
        <EmptyState title={emptyTitle} text={emptyText} />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <IdeaListHeader
        copy={copy}
        count={filteredIdeas.length}
        totalCount={ideas.length}
        averageOpportunity={averageOpportunity}
        evidenceCount={evidenceCount}
      />
      <IdeaFilterPanel
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        activeFilterLabels={activeFilterLabels}
        visibleCount={filteredIdeas.length}
        totalCount={ideas.length}
        onQueryChange={setQuery}
        onMinOpportunityChange={setMinOpportunity}
        onMinConfidenceChange={setMinConfidence}
        onReset={resetFilters}
      />
      {filteredIdeas.length ? (
        filteredIdeas.map((idea) => {
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
        })
      ) : (
        <EmptyState
          title="Brak pomyslow dla tych filtrow"
          text="Zmien tekst, opportunity albo confidence, zeby zobaczyc wiecej pomyslow w tej zakladce."
          primaryAction={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Resetuj filtry
            </Button>
          }
        />
      )}
    </section>
  );
}

function IdeaListHeader({
  copy,
  count,
  totalCount,
  averageOpportunity,
  evidenceCount
}: {
  copy: { title: string; description: string; metric: string };
  count: number;
  totalCount: number;
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
          <MetricPill label={copy.metric} value={count === totalCount ? count : `${count}/${totalCount}`} />
          <MetricPill label="Avg opportunity" value={averageOpportunity === null ? "brak" : `${averageOpportunity}/100`} />
          <MetricPill label="Evidence" value={evidenceCount} />
        </div>
      </div>
    </section>
  );
}

function IdeaFilterPanel({
  filters,
  hasActiveFilters,
  activeFilterLabels,
  visibleCount,
  totalCount,
  onQueryChange,
  onMinOpportunityChange,
  onMinConfidenceChange,
  onReset
}: {
  filters: IdeaFilterState;
  hasActiveFilters: boolean;
  activeFilterLabels: string[];
  visibleCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onMinOpportunityChange: (value: number) => void;
  onMinConfidenceChange: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-panel p-3 shadow-soft">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_140px_140px_auto]">
        <label className="relative min-w-0">
          <span className="sr-only">Szukaj pomyslow</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className={controlClassName("pl-9")}
            value={filters.query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Szukaj tytulu, repo, problemu..."
          />
        </label>

        <label className="flex h-9 items-center gap-2 rounded-md border border-control-border bg-control px-3 text-xs font-medium text-muted-foreground">
          Opportunity
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none"
            type="number"
            min={0}
            max={100}
            value={filters.minOpportunity}
            onChange={(event) => onMinOpportunityChange(clampScore(event.target.value, 100))}
          />
        </label>

        <label className="flex h-9 items-center gap-2 rounded-md border border-control-border bg-control px-3 text-xs font-medium text-muted-foreground">
          Confidence
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none"
            type="number"
            min={0}
            max={5}
            value={filters.minConfidence}
            onChange={(event) => onMinConfidenceChange(clampScore(event.target.value, 5))}
          />
        </label>

        <Button variant="ghost" size="sm" onClick={onReset} disabled={!hasActiveFilters} className="h-9">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold uppercase text-muted-foreground">Filtry pomyslow</span>
        {hasActiveFilters ? (
          <>
            <span className="tabular-nums text-foreground">
              Pokazano {visibleCount} z {totalCount}
            </span>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {activeFilterLabels.map((filter) => (
                <Badge key={filter} tone="info" className="max-w-full truncate">
                  {filter}
                </Badge>
              ))}
            </div>
          </>
        ) : (
          <span>Brak aktywnych filtrow</span>
        )}
      </div>
    </section>
  );
}

export function filterIdeas(ideas: IdeaListItem[], filters: IdeaFilterState) {
  const normalizedQuery = normalizeFilterText(filters.query);

  return ideas.filter((idea) => {
    if (filters.minOpportunity > 0 && (idea.opportunityScore === null || idea.opportunityScore < filters.minOpportunity)) {
      return false;
    }

    if (filters.minConfidence > 0 && (idea.confidenceScore === null || idea.confidenceScore < filters.minConfidence)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      idea.title,
      idea.problem,
      idea.proposedSolution,
      idea.targetUser,
      idea.mvpScope,
      idea.monetizationPotential,
      idea.suggestedStack,
      idea.applicationSummary,
      idea.businessRationale,
      idea.marketSummary,
      idea.sourceRepoName,
      idea.status
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeFilterText(value).includes(normalizedQuery));
  });
}

function averageScore(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (!present.length) {
    return null;
  }
  return Math.round(present.reduce((sum, value) => sum + value, 0) / present.length);
}

function hasActiveIdeaFilters(filters: IdeaFilterState) {
  return filters.query.trim().length > 0 || filters.minOpportunity > 0 || filters.minConfidence > 0;
}

function buildIdeaFilterLabels(filters: IdeaFilterState) {
  return [
    filters.query.trim() ? `Szukaj: ${filters.query.trim()}` : null,
    filters.minOpportunity > 0 ? `Opportunity >= ${filters.minOpportunity}` : null,
    filters.minConfidence > 0 ? `Confidence >= ${filters.minConfidence}` : null
  ].filter((value): value is string => Boolean(value));
}

function normalizeFilterText(value: string) {
  return value.trim().toLowerCase();
}

function clampScore(value: string, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(max, Math.max(0, Math.floor(parsed)));
}

function controlClassName(className?: string) {
  return cn(
    "h-9 w-full rounded-md border border-control-border bg-control px-3 text-sm text-foreground outline-none transition duration-fast ease-interface",
    "focus:border-primary focus:ring-2 focus:ring-focus/30",
    className
  );
}
