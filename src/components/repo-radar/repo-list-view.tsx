"use client";

import type React from "react";
import { useMemo } from "react";
import type { RepositoryDecisionContext, RepositoryListItem, RepositoryTimelineItem } from "@/types/repository";
import { Button, EmptyState, SkeletonBlock, SkeletonText } from "./ui";
import { RepoRow } from "./repo-row";
import { RepoComparePanel } from "./repo-compare-panel";
import { RepoInboxStrip } from "./repo-inbox-strip";

export type RepoCardCallbacks = {
  onToggle: (repoId: string) => void;
  onOpenReport: (repoId: string) => void;
  onRegenerateReport: (repoId: string) => void;
  onSave: (repoId: string) => void;
  onMarkRead: (repoId: string) => void;
  onOpenQuickBrief: (repoId: string) => void;
  onGenerateIdea: (repoId: string) => void;
  onResearch: (repoId: string) => void;
  onAddInboxTask: (repo: RepositoryListItem) => void;
  onAddCloneTask: (repo: RepositoryListItem) => void;
  onAddDemoTask: (repo: RepositoryListItem) => void;
  onValidateMarket: (repo: RepositoryListItem) => void;
  onIgnore: (repoId: string) => void;
};

export function RepoListView({
  repositories,
  filterBar,
  totalCount,
  hasMore,
  onLoadMore,
  expandedRepoId,
  timelines,
  loadingTimelineRepoId,
  decisionContexts,
  loadingDecisionContextRepoId,
  decisionContextErrors,
  selectedCompareRepoIds,
  showInbox,
  hasActiveFilters,
  isLoading,
  isPending,
  onRunScan,
  onResetFilters,
  onToggleCompare,
  onRemoveCompare,
  onClearCompare,
  callbacks
}: {
  repositories: RepositoryListItem[];
  filterBar: React.ReactNode;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  expandedRepoId: string | null;
  timelines: Record<string, RepositoryTimelineItem[]>;
  loadingTimelineRepoId: string | null;
  decisionContexts: Record<string, RepositoryDecisionContext>;
  loadingDecisionContextRepoId: string | null;
  decisionContextErrors: Record<string, string>;
  selectedCompareRepoIds: string[];
  showInbox: boolean;
  hasActiveFilters: boolean;
  isLoading: boolean;
  isPending: boolean;
  onRunScan: () => void;
  onResetFilters: () => void;
  onToggleCompare: (repoId: string) => void;
  onRemoveCompare: (repoId: string) => void;
  onClearCompare: () => void;
  callbacks: RepoCardCallbacks;
}) {
  const compareRepos = useMemo(
    () => selectedCompareRepoIds.map((repoId) => repositories.find((repo) => repo.id === repoId)).filter((repo): repo is RepositoryListItem => Boolean(repo)),
    [selectedCompareRepoIds, repositories]
  );

  return (
    <section className="space-y-3">
      {filterBar}

      {showInbox ? (
        <RepoInboxStrip
          repositories={repositories}
          isPending={isPending}
          onOpen={callbacks.onToggle}
          onSave={callbacks.onSave}
          onMarkRead={callbacks.onMarkRead}
          onIgnore={callbacks.onIgnore}
          onCreateTask={callbacks.onAddInboxTask}
        />
      ) : null}

      <RepoComparePanel
        repositories={compareRepos}
        selectedCount={selectedCompareRepoIds.length}
        onOpen={callbacks.onToggle}
        onRemove={onRemoveCompare}
        onClear={onClearCompare}
      />

      {isLoading && !repositories.length ? (
        <RepoListSkeleton />
      ) : repositories.length ? (
        <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-panel">
          <div className="hidden border-b border-border-subtle bg-surface-inset px-3 py-2 text-xs font-semibold uppercase text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_92px_92px_92px_112px_150px]">
            <span>Repozytorium</span>
            <span>Trend</span>
            <span>Stars</span>
            <span>Growth 7d</span>
            <span>Push</span>
            <span className="text-right">Akcje</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {repositories.map((repo) => (
              <RepoRow
                key={repo.id}
                repo={repo}
                isExpanded={expandedRepoId === repo.id}
                timeline={timelines[repo.id] ?? []}
                isTimelineLoading={loadingTimelineRepoId === repo.id}
                decisionContext={decisionContexts[repo.id] ?? null}
                isDecisionContextLoading={loadingDecisionContextRepoId === repo.id}
                decisionContextError={decisionContextErrors[repo.id] ?? null}
                isCompareSelected={selectedCompareRepoIds.includes(repo.id)}
                isPending={isPending}
                onToggle={() => callbacks.onToggle(repo.id)}
                onToggleCompare={() => onToggleCompare(repo.id)}
                onOpenReport={() => callbacks.onOpenReport(repo.id)}
                onRegenerateReport={() => callbacks.onRegenerateReport(repo.id)}
                onSave={() => callbacks.onSave(repo.id)}
                onMarkRead={() => callbacks.onMarkRead(repo.id)}
                onOpenQuickBrief={() => callbacks.onOpenQuickBrief(repo.id)}
                onGenerateIdea={() => callbacks.onGenerateIdea(repo.id)}
                onResearch={() => callbacks.onResearch(repo.id)}
                onAddCloneTask={() => callbacks.onAddCloneTask(repo)}
                onAddDemoTask={() => callbacks.onAddDemoTask(repo)}
                onValidateMarket={() => callbacks.onValidateMarket(repo)}
                onIgnore={() => callbacks.onIgnore(repo.id)}
              />
            ))}
          </div>
          {isLoading ? <RepoListLoadingFooter /> : null}
          {hasMore ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-surface-inset px-3 py-3">
              <p className="text-sm text-muted-foreground">
                Pokazano <span className="font-semibold text-foreground">{repositories.length}</span> z{" "}
                <span className="font-semibold text-foreground">{totalCount}</span> repozytoriow.
              </p>
              <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={isPending}>
                Pokaz kolejne
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title={hasActiveFilters ? "Filtry nie znalazly repozytoriow" : "Brak repozytoriow w tym widoku"}
          text={
            hasActiveFilters
              ? "Zmien query, status, jezyk lub preset. Jesli baza jest pusta, uruchom scan GitHuba."
              : "Uruchom scan, zeby RepoRadar pobral pierwsze repozytoria do lokalnej bazy."
          }
          primaryAction={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={onResetFilters}>
                Reset filtrow
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onRunScan} disabled={isPending}>
                Uruchom scan
              </Button>
            )
          }
          secondaryAction={
            hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={onRunScan} disabled={isPending}>
                Uruchom scan
              </Button>
            ) : null
          }
        />
      )}
    </section>
  );
}

function RepoListSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-panel" aria-label="Ladowanie listy repozytoriow">
      <div className="hidden border-b border-border-subtle bg-surface-inset px-3 py-2 lg:grid lg:grid-cols-[minmax(0,1fr)_92px_92px_92px_112px_150px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-3" />
        ))}
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_150px] lg:items-center">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_92px_92px_92px_112px] lg:items-center">
              <div className="min-w-0">
                <SkeletonBlock className="h-4 w-64 max-w-full" />
                <SkeletonText lines={2} className="mt-3" />
                <div className="mt-3 flex gap-2">
                  <SkeletonBlock className="h-5 w-20" />
                  <SkeletonBlock className="h-5 w-24" />
                  <SkeletonBlock className="h-5 w-16" />
                </div>
              </div>
              <SkeletonBlock className="h-7" />
              <SkeletonBlock className="h-4" />
              <SkeletonBlock className="h-4" />
              <SkeletonBlock className="h-4" />
            </div>
            <div className="flex justify-end gap-2">
              <SkeletonBlock className="h-8 w-20" />
              <SkeletonBlock className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RepoListLoadingFooter() {
  return (
    <div className="border-t border-border-subtle bg-surface-inset px-3 py-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Odswiezam liste repozytoriow...</span>
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
