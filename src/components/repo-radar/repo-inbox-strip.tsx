"use client";

import { CheckCircle2, Eye, Inbox, Star, Trash2 } from "lucide-react";
import type { RepositoryListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatGrowth, formatStars } from "@/lib/display/formatters";
import { Badge, Button, ScoreChip } from "./ui";

export function RepoInboxStrip({
  repositories,
  isPending,
  onOpen,
  onSave,
  onMarkRead,
  onIgnore,
  onCreateTask
}: {
  repositories: RepositoryListItem[];
  isPending: boolean;
  onOpen: (repoId: string) => void;
  onSave: (repoId: string) => void;
  onMarkRead: (repoId: string) => void;
  onIgnore: (repoId: string) => void;
  onCreateTask: (repo: RepositoryListItem) => void;
}) {
  const inboxItems = repositories.slice(0, 5);

  if (!inboxItems.length) {
    return null;
  }

  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Inbox nowych repo</h3>
            <Badge tone="info">{inboxItems.length} do szybkiej decyzji</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Najpierw podejmij proste decyzje: zapisz, oznacz jako przeczytane, zignoruj albo dodaj zadanie.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {inboxItems.map((repo) => (
          <article
            key={repo.id}
            className="grid gap-3 rounded-md border border-border-subtle bg-surface-inset p-3 xl:grid-cols-[minmax(0,1fr)_auto]"
          >
            <button
              type="button"
              className="min-w-0 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-focus"
              onClick={() => onOpen(repo.id)}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{repo.fullName}</span>
                <ScoreChip label="Trend" score={repo.trendScore} />
                <Badge tone={repo.growth7d === null ? "warning" : "success"}>7d {formatGrowth(repo.growth7d)}</Badge>
                <Badge tone="neutral">{formatStars(repo.starsCurrent)} stars</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                {cleanDisplayText(repo.shortSummaryPl ?? repo.description, { maxLength: 180, fallback: "Brak opisu." })}
              </p>
            </button>
            <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
              <Button variant="secondary" size="sm" onClick={() => onSave(repo.id)} disabled={isPending}>
                <Star className="h-4 w-4" />
                Zapisz
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onMarkRead(repo.id)} disabled={isPending}>
                <Eye className="h-4 w-4" />
                Przeczytane
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onCreateTask(repo)} disabled={isPending}>
                <CheckCircle2 className="h-4 w-4" />
                Zadanie
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onIgnore(repo.id)} disabled={isPending}>
                <Trash2 className="h-4 w-4" />
                Ignoruj
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
