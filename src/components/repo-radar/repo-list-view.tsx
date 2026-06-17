import type React from "react";
import type { RepositoryListItem } from "@/types/repository";
import { EmptyState } from "./ui";
import { RepoCard } from "./repo-card";

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
  expandedRepoId,
  isPending,
  callbacks
}: {
  repositories: RepositoryListItem[];
  filterBar: React.ReactNode;
  expandedRepoId: string | null;
  isPending: boolean;
  callbacks: RepoCardCallbacks;
}) {
  return (
    <>
      {filterBar}
      <section className="space-y-3">
        {repositories.length ? (
          repositories.map((repo) => (
            <RepoCard
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
          ))
        ) : (
          <EmptyState title="Brak repozytoriow w tym widoku" text="Uruchom scan albo zmien filtry." />
        )}
      </section>
    </>
  );
}
