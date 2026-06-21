"use client";

import type React from "react";
import { useMemo } from "react";
import type { RepositoryListItem } from "@/types/repository";
import { Button, EmptyState } from "./ui";
import type { RepoSortKey } from "./repo-filter-bar";
import { RepoRow } from "./repo-row";

export type RepoCardCallbacks = {
  onToggle: (repoId: string) => void;
  onOpenReport: (repoId: string) => void;
  onRegenerateReport: (repoId: string) => void;
  onSave: (repoId: string) => void;
  onMarkRead: (repoId: string) => void;
  onGenerateIdea: (repoId: string) => void;
  onResearch: (repoId: string) => void;
  onAddCloneTask: (repo: RepositoryListItem) => void;
  onAddDemoTask: (repo: RepositoryListItem) => void;
  onValidateMarket: (repo: RepositoryListItem) => void;
  onIgnore: (repoId: string) => void;
};

export function RepoListView({
  repositories,
  filterBar,
  sortKey,
  totalCount,
  hasMore,
  onLoadMore,
  expandedRepoId,
  isPending,
  callbacks
}: {
  repositories: RepositoryListItem[];
  filterBar: React.ReactNode;
  sortKey: RepoSortKey;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  expandedRepoId: string | null;
  isPending: boolean;
  callbacks: RepoCardCallbacks;
}) {
  const sortedRepositories = useMemo(() => sortRepositories(repositories, sortKey), [repositories, sortKey]);

  return (
    <section className="space-y-3">
      {filterBar}

      {sortedRepositories.length ? (
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
            {sortedRepositories.map((repo) => (
              <RepoRow
                key={repo.id}
                repo={repo}
                isExpanded={expandedRepoId === repo.id}
                isPending={isPending}
                onToggle={() => callbacks.onToggle(repo.id)}
                onOpenReport={() => callbacks.onOpenReport(repo.id)}
                onRegenerateReport={() => callbacks.onRegenerateReport(repo.id)}
                onSave={() => callbacks.onSave(repo.id)}
                onMarkRead={() => callbacks.onMarkRead(repo.id)}
                onGenerateIdea={() => callbacks.onGenerateIdea(repo.id)}
                onResearch={() => callbacks.onResearch(repo.id)}
                onAddCloneTask={() => callbacks.onAddCloneTask(repo)}
                onAddDemoTask={() => callbacks.onAddDemoTask(repo)}
                onValidateMarket={() => callbacks.onValidateMarket(repo)}
                onIgnore={() => callbacks.onIgnore(repo.id)}
              />
            ))}
          </div>
          {hasMore ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-surface-inset px-3 py-3">
              <p className="text-sm text-muted-foreground">
                Pokazano <span className="font-semibold text-foreground">{sortedRepositories.length}</span> z{" "}
                <span className="font-semibold text-foreground">{totalCount}</span> repozytoriów.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={onLoadMore}
                disabled={isPending}
              >
                Pokaż kolejne
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState title="Brak repozytoriów w tym widoku" text="Uruchom scan albo zmień filtry." />
      )}
    </section>
  );
}

function sortRepositories(repositories: RepositoryListItem[], sortKey: RepoSortKey) {
  return repositories
    .map((repo, index) => ({ repo, index }))
    .sort((left, right) => {
      const result = compareRepositories(left.repo, right.repo, sortKey);
      return result === 0 ? left.index - right.index : result;
    })
    .map(({ repo }) => repo);
}

function compareRepositories(a: RepositoryListItem, b: RepositoryListItem, sortKey: RepoSortKey) {
  switch (sortKey) {
    case "stars_desc":
      return descending(a.starsCurrent, b.starsCurrent) || descending(a.trendScore, b.trendScore);
    case "growth7d_desc":
      return descending(nullableNumber(a.growth7d), nullableNumber(b.growth7d)) || descending(a.trendScore, b.trendScore);
    case "pushed_desc":
      return descending(dateValue(a.pushedAt), dateValue(b.pushedAt)) || descending(a.trendScore, b.trendScore);
    case "first_seen_desc":
      return descending(dateValue(a.firstSeenAt), dateValue(b.firstSeenAt)) || descending(a.trendScore, b.trendScore);
    case "name_asc":
      return a.fullName.localeCompare(b.fullName, "pl");
    case "trend_desc":
    default:
      return descending(a.trendScore, b.trendScore) || descending(a.initialMomentumScore, b.initialMomentumScore);
  }
}

function descending(a: number, b: number) {
  if (a === b) {
    return 0;
  }
  return b > a ? 1 : -1;
}

function nullableNumber(value: number | null | undefined) {
  return value ?? Number.NEGATIVE_INFINITY;
}

function dateValue(value: string | null | undefined) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}
