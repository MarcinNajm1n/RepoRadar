import type React from "react";
import { BookOpen, ClipboardList, FileText } from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import type { IdeaListItem, RadarTodayData, RepositoryListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatGrowth, formatStars } from "@/lib/display/formatters";
import { cn, sanitizeExternalUrl } from "@/lib/utils";
import { Badge, Button, EmptyState, MetricPill, ScoreChip, SectionCard, TextClamp } from "./ui";

export function RadarTodayView({
  radarToday,
  isPending,
  onOpenLibrary,
  onOpenReport,
  onCreateReadmeTask,
  onCreateManualTask,
  renderActionItem,
  renderBusinessCandidate
}: {
  radarToday: RadarTodayData;
  isPending: boolean;
  onOpenLibrary: () => void;
  onOpenReport: (repoId: string) => void;
  onCreateReadmeTask: (repo: RepositoryListItem) => void;
  onCreateManualTask: () => void;
  renderActionItem: (item: ActionItemListItem) => React.ReactNode;
  renderBusinessCandidate: (idea: IdeaListItem) => React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-4">
        <MetricPill label="Top repo" value={radarToday.topRepositories.length} className="bg-card" />
        <MetricPill label="Kandydaci" value={radarToday.businessCandidates.length} className="bg-card" />
        <MetricPill label="Zadania" value={radarToday.actionItems.length} className="bg-card" />
        <MetricPill label="Alerty" value={radarToday.alerts.length} className="bg-card" />
      </div>

      {radarToday.alerts.length ? (
        <section className="grid gap-3 md:grid-cols-2">
          {radarToday.alerts.map((alert) => (
            <article
              key={alert.id}
              className={cn(
                "rounded-lg border bg-card p-4 shadow-soft",
                alert.level === "critical" && "border-red-300 bg-red-50 text-red-950",
                alert.level === "warning" && "border-amber-300 bg-amber-50 text-amber-950",
                alert.level === "info" && "border-blue-200 bg-blue-50 text-blue-950"
              )}
            >
              <div className="font-semibold">{cleanDisplayText(alert.title, { maxLength: 120 })}</div>
              <p className="mt-1 text-sm">{cleanDisplayText(alert.message, { maxLength: 220 })}</p>
            </article>
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Repo do sprawdzenia"
          action={
            <Button variant="ghost" onClick={onOpenLibrary}>
              Biblioteka
            </Button>
          }
        >
          <div className="space-y-3">
            {radarToday.topRepositories.length ? (
              radarToday.topRepositories.map((repo) => (
                <RadarRepositoryCard
                  key={repo.id}
                  repo={repo}
                  isPending={isPending}
                  onOpenReport={() => onOpenReport(repo.id)}
                  onCreateReadmeTask={() => onCreateReadmeTask(repo)}
                />
              ))
            ) : (
              <EmptyState title="Brak repo na dzisiaj" text="Uruchom scan albo sprawdz filtry w Bibliotece." />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Zadania teraz"
          action={
            <Button variant="secondary" onClick={onCreateManualTask} disabled={isPending}>
              <ClipboardList className="h-4 w-4" /> Dodaj zadanie
            </Button>
          }
        >
          <div className="space-y-3">
            {radarToday.actionItems.length ? (
              radarToday.actionItems.map((item) => renderActionItem(item))
            ) : (
              <EmptyState title="Brak aktywnych zadan" text="Dodaj zadanie z repo albo utworz reczne zadanie." />
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Kandydaci biznesowi">
          <div className="space-y-3">
            {radarToday.businessCandidates.length ? (
              radarToday.businessCandidates.map((idea) => renderBusinessCandidate(idea))
            ) : (
              <EmptyState title="Brak kandydatow" text="Uzyj light research przy repo, ktore wyglada obiecujaco." />
            )}
          </div>
        </SectionCard>

        <RadarRepoCompactSection title="Nowe perelki" repositories={radarToday.newGems} empty="Brak nowych perelek." />
        <RadarRepoCompactSection
          title="High initial momentum"
          repositories={radarToday.highInitialMomentum}
          empty="Brak repo z mocnym initial momentum."
        />
      </div>
    </section>
  );
}

function RadarRepositoryCard({
  repo,
  isPending,
  onOpenReport,
  onCreateReadmeTask
}: {
  repo: RepositoryListItem;
  isPending: boolean;
  onOpenReport: () => void;
  onCreateReadmeTask: () => void;
}) {
  const safeUrl = sanitizeExternalUrl(repo.url);

  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words font-semibold">{repo.fullName}</h4>
            <Badge>{repo.status}</Badge>
            <ScoreChip label="Trend" score={repo.trendScore} />
            <ScoreChip label="Initial" score={repo.initialMomentumScore} />
          </div>
          <TextClamp lines={2} className="mt-2">
            {cleanDisplayText(repo.shortSummaryPl ?? repo.description ?? "Brak opisu.", { maxLength: 220 })}
          </TextClamp>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill label="Stars" value={formatStars(repo.starsCurrent)} />
            <MetricPill label="Growth 7d" value={formatGrowth(repo.growth7d)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onOpenReport} disabled={isPending}>
            <FileText className="h-4 w-4" /> Raport
          </Button>
          <Button variant="secondary" onClick={onCreateReadmeTask} disabled={isPending}>
            <BookOpen className="h-4 w-4" /> README
          </Button>
          {safeUrl && safeUrl.startsWith("https://github.com/") ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              GitHub
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RadarRepoCompactSection({
  title,
  repositories,
  empty
}: {
  title: string;
  repositories: RepositoryListItem[];
  empty: string;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-3">
        {repositories.length ? (
          repositories.map((repo) => (
            <article key={repo.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="break-words font-semibold">{repo.fullName}</h4>
                <ScoreChip label="Trend" score={repo.trendScore} />
                <Badge>{formatStars(repo.starsCurrent)} stars</Badge>
              </div>
              <TextClamp lines={3} className="mt-2">
                {cleanDisplayText(repo.shortSummaryPl ?? repo.description ?? "Brak opisu.", { maxLength: 260 })}
              </TextClamp>
            </article>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </SectionCard>
  );
}
