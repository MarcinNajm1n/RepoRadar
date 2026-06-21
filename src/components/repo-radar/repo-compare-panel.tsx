"use client";

import { GitCompare, X } from "lucide-react";
import type React from "react";
import type { RepositoryListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDisplayDate, formatGrowth, formatStars } from "@/lib/display/formatters";
import { Badge, Button, ScoreChip } from "./ui";

export function RepoComparePanel({
  repositories,
  selectedCount,
  onOpen,
  onRemove,
  onClear
}: {
  repositories: RepositoryListItem[];
  selectedCount: number;
  onOpen: (repoId: string) => void;
  onRemove: (repoId: string) => void;
  onClear: () => void;
}) {
  if (!selectedCount) {
    return null;
  }

  return (
    <section className="rounded-md border border-primary/25 bg-accent/55 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Porownanie repozytoriow</h3>
            <Badge tone="accent">{selectedCount}/3</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Wybierz 2-3 repo, zeby szybko zestawic trend, wzrost i ryzyko decyzji.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
          Wyczysc
        </Button>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-3">
        {repositories.map((repo) => (
          <article key={repo.id} className="min-w-0 rounded-md border border-border-subtle bg-surface-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="min-w-0 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-focus"
                onClick={() => onOpen(repo.id)}
              >
                <h4 className="truncate text-sm font-semibold text-foreground">{repo.fullName}</h4>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {cleanDisplayText(repo.shortSummaryPl ?? repo.description, { maxLength: 120, fallback: "Brak opisu." })}
                </p>
              </button>
              <Button variant="ghost" size="icon" onClick={() => onRemove(repo.id)} aria-label={`Usun z porownania ${repo.fullName}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Metric label="Trend">
                <ScoreChip label="Trend" score={repo.trendScore} className="justify-center" />
              </Metric>
              <Metric label="Stars" value={formatStars(repo.starsCurrent)} />
              <Metric label="24h" value={formatGrowth(repo.growth24h)} muted={repo.growth24h === null} />
              <Metric label="7d" value={formatGrowth(repo.growth7d)} muted={repo.growth7d === null} />
              <Metric label="Push" value={repo.pushedAt ? formatDisplayDate(repo.pushedAt) : "brak"} />
              <Metric label="Jezyk" value={repo.primaryLanguage ?? "brak"} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {repo.topics.slice(0, 4).map((topic) => (
                <Badge key={topic}>{cleanDisplayText(topic, { maxLength: 24 })}</Badge>
              ))}
              {repo.isArchived ? <Badge tone="warning">archived</Badge> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  muted = false,
  children
}: {
  label: string;
  value?: string;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-surface-inset px-2 py-2">
      <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className={muted ? "mt-1 truncate font-semibold text-muted-foreground" : "mt-1 truncate font-semibold text-foreground"}>
        {children ?? value}
      </div>
    </div>
  );
}
