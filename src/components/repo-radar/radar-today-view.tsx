"use client";

import type React from "react";
import { Activity, BookOpen, Brain, ClipboardList, ExternalLink, FileText, Radar, Sparkles } from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import type { IdeaListItem, RadarTodayData, RepositoryListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDisplayDate, formatGrowth, formatStars } from "@/lib/display/formatters";
import { cn, sanitizeExternalUrl } from "@/lib/utils";
import { Badge, Button, EmptyState, MetricPill, ScoreChip, SectionCard, TextClamp } from "./ui";

export function RadarTodayView({
  radarToday,
  isPending,
  onOpenLibrary,
  onOpenReport,
  onOpenQuickBrief,
  onCreateReadmeTask,
  onCreateManualTask,
  onOpenCandidate,
  onPromoteCandidate,
  onOpenTasks,
  onOpenSettings,
  onRunScan,
  renderActionItem
}: {
  radarToday: RadarTodayData;
  isPending: boolean;
  onOpenLibrary: () => void;
  onOpenReport: (repoId: string) => void;
  onOpenQuickBrief: (repoId: string) => void;
  onCreateReadmeTask: (repo: RepositoryListItem) => void;
  onCreateManualTask: () => void;
  onOpenCandidate: (idea: IdeaListItem) => void;
  onPromoteCandidate: (ideaId: string) => void;
  onOpenTasks: () => void;
  onOpenSettings: () => void;
  onRunScan: () => void;
  renderActionItem: (item: ActionItemListItem) => React.ReactNode;
}) {
  const latestScan = radarToday.scanChanges.lastScan;
  const nextActionIdea = [...radarToday.businessCandidates, ...radarToday.ideasToDevelop].find(
    (idea) => idea.id === radarToday.nextAction.ideaId
  );

  return (
    <section className="space-y-4">
      <section className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Radar className="h-4 w-4" />
              Radar dzisiaj
            </div>
            <h2 className="mt-2 text-xl font-semibold">Sygnaly do decyzji</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Wygenerowano: {formatDisplayDate(radarToday.generatedAt)}
              {latestScan ? ` | ostatni scan: ${formatDisplayDate(latestScan.startedAt)} | ${latestScan.reposUpdated} repo` : ""}
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[520px]">
            <MetricPill label="Top repo" value={radarToday.topRepositories.length} />
            <MetricPill label="Kandydaci" value={radarToday.businessCandidates.length} />
            <MetricPill label="Zadania" value={radarToday.actionItems.length} />
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <MetricPill label="Nowe perelki" value={radarToday.newGems.length} />
          <MetricPill label="Initial momentum" value={radarToday.highInitialMomentum.length} />
          <MetricPill label="Alerty" value={radarToday.alerts.length} />
        </div>
      </section>

      <section className="rounded-lg border border-primary/30 bg-primary/10 p-4 shadow-soft">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Najlepsza nastepna akcja
              <Badge tone="info">{radarToday.nextAction.kind}</Badge>
            </div>
            <h3 className="mt-2 break-words text-lg font-semibold text-foreground">
              {cleanDisplayText(radarToday.nextAction.title, { maxLength: 140 })}
            </h3>
            <p className="mt-1 text-sm leading-6 text-foreground">
              {cleanDisplayText(radarToday.nextAction.description, { maxLength: 260 })}
            </p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {cleanDisplayText(radarToday.nextAction.reason, { maxLength: 220 })}
            </p>
          </div>
          <NextActionButton
            radarToday={radarToday}
            nextActionIdea={nextActionIdea}
            isPending={isPending}
            onOpenQuickBrief={onOpenQuickBrief}
            onOpenCandidate={onOpenCandidate}
            onOpenTasks={onOpenTasks}
            onOpenSettings={onOpenSettings}
            onRunScan={onRunScan}
          />
        </div>
      </section>

      {radarToday.alerts.length ? (
        <section className="grid gap-3 md:grid-cols-2">
          {radarToday.alerts.map((alert) => (
            <article
              key={alert.id}
              className={cn(
                "rounded-lg border p-4 shadow-soft",
                alert.level === "critical" && "border-destructive/30 bg-destructive/10",
                alert.level === "warning" && "border-warning/40 bg-warning/10",
                alert.level === "info" && "border-info/30 bg-info/10"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{cleanDisplayText(alert.title, { maxLength: 120 })}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{cleanDisplayText(alert.message, { maxLength: 220 })}</p>
                </div>
                <Badge tone={alert.level === "critical" ? "danger" : alert.level === "warning" ? "warning" : "info"}>
                  {alert.level}
                </Badge>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <SectionCard
          title="Repo do sprawdzenia"
          description="Najmocniejsze sygnaly z lokalnych snapshotow."
          action={
            <Button variant="ghost" size="sm" onClick={onOpenLibrary}>
              Biblioteka
            </Button>
          }
        >
          <div className="space-y-3">
            {radarToday.topRepositories.length ? (
              radarToday.topRepositories.map((repo, index) => (
                <RadarRepositoryCard
                  key={repo.id}
                  repo={repo}
                  rank={index + 1}
                  isPending={isPending}
                  onOpenQuickBrief={() => onOpenQuickBrief(repo.id)}
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
          title="Kolejka teraz"
          description="Najblizsze decyzje i sprawdzenia."
          action={
            <Button variant="secondary" size="sm" onClick={onCreateManualTask} disabled={isPending}>
              <ClipboardList className="h-4 w-4" /> Dodaj
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

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <SectionCard title="Kandydaci biznesowi" description="Szybka ocena przed rozwinieciem.">
          <div className="space-y-3">
            {radarToday.businessCandidates.length ? (
              radarToday.businessCandidates.map((idea) => (
                <RadarBusinessCandidateCard
                  key={idea.id}
                  idea={idea}
                  isPending={isPending}
                  onOpenDetail={() => onOpenCandidate(idea)}
                  onPromote={() => onPromoteCandidate(idea.id)}
                />
              ))
            ) : (
              <EmptyState title="Brak kandydatow" text="Uzyj light research przy repo, ktore wyglada obiecujaco." />
            )}
          </div>
        </SectionCard>

        <RadarIdeaCompactSection title="Pomysly do rozwiniecia" ideas={radarToday.ideasToDevelop} onOpenDetail={onOpenCandidate} />
        <RadarRepoCompactSection title="Zmiany ze skanu" repositories={radarToday.scanChanges.latestRepositories} empty="Brak nowych zmian ze skanu." />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
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

function NextActionButton({
  radarToday,
  nextActionIdea,
  isPending,
  onOpenQuickBrief,
  onOpenCandidate,
  onOpenTasks,
  onOpenSettings,
  onRunScan
}: {
  radarToday: RadarTodayData;
  nextActionIdea?: IdeaListItem;
  isPending: boolean;
  onOpenQuickBrief: (repoId: string) => void;
  onOpenCandidate: (idea: IdeaListItem) => void;
  onOpenTasks: () => void;
  onOpenSettings: () => void;
  onRunScan: () => void;
}) {
  const action = radarToday.nextAction;

  if (action.kind === "repo" && action.repoId) {
    return (
      <Button variant="secondary" onClick={() => onOpenQuickBrief(action.repoId as string)} disabled={isPending}>
        <FileText className="h-4 w-4" /> {action.actionLabel}
      </Button>
    );
  }

  if (action.kind === "idea" && nextActionIdea) {
    return (
      <Button variant="secondary" onClick={() => onOpenCandidate(nextActionIdea)} disabled={isPending}>
        <Brain className="h-4 w-4" /> {action.actionLabel}
      </Button>
    );
  }

  if (action.kind === "task") {
    return (
      <Button variant="secondary" onClick={onOpenTasks} disabled={isPending}>
        <ClipboardList className="h-4 w-4" /> {action.actionLabel}
      </Button>
    );
  }

  if (action.kind === "alert") {
    return (
      <Button variant="secondary" onClick={onOpenSettings} disabled={isPending}>
        <Activity className="h-4 w-4" /> {action.actionLabel}
      </Button>
    );
  }

  return (
    <Button variant="secondary" onClick={onRunScan} disabled={isPending}>
      <Radar className="h-4 w-4" /> {action.actionLabel}
    </Button>
  );
}

function RadarRepositoryCard({
  repo,
  rank,
  isPending,
  onOpenReport,
  onOpenQuickBrief,
  onCreateReadmeTask
}: {
  repo: RepositoryListItem;
  rank: number;
  isPending: boolean;
  onOpenReport: () => void;
  onOpenQuickBrief: () => void;
  onCreateReadmeTask: () => void;
}) {
  const safeUrl = sanitizeExternalUrl(repo.url);

  return (
    <article className="rounded-lg border border-border-subtle bg-surface-raised p-3">
      <div className="grid gap-3 lg:grid-cols-[2rem_minmax(0,1fr)_auto]">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold tabular-nums text-primary">
          {rank}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words font-semibold">{cleanDisplayText(repo.fullName, { maxLength: 140 })}</h4>
            <Badge variant="status">{repo.status}</Badge>
            {repo.primaryLanguage ? <Badge variant="source">{repo.primaryLanguage}</Badge> : null}
            <ScoreChip label="Trend" score={repo.trendScore} />
            <ScoreChip label="Initial" score={repo.initialMomentumScore} />
          </div>
          <TextClamp lines={2} className="mt-2">
            {cleanDisplayText(repo.shortSummaryPl ?? repo.description ?? "Brak opisu.", { maxLength: 240 })}
          </TextClamp>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MetricPill label="Stars" value={formatStars(repo.starsCurrent)} />
            <MetricPill label="Growth 7d" value={formatGrowth(repo.growth7d)} />
            <MetricPill label="Freshness" value={repo.pushedAt ? formatDisplayDate(repo.pushedAt) : "brak"} />
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
          <Button variant="secondary" size="sm" onClick={onOpenQuickBrief} disabled={isPending}>
            <FileText className="h-4 w-4" /> Brief
          </Button>
          <Button variant="secondary" size="sm" onClick={onOpenReport} disabled={isPending}>
            <FileText className="h-4 w-4" /> Raport
          </Button>
          <Button variant="secondary" size="sm" onClick={onCreateReadmeTask} disabled={isPending}>
            <BookOpen className="h-4 w-4" /> README
          </Button>
          {safeUrl && safeUrl.startsWith("https://github.com/") ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-2.5 text-xs font-medium text-muted-foreground transition duration-fast ease-interface hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ExternalLink className="h-4 w-4" /> GitHub
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RadarBusinessCandidateCard({
  idea,
  isPending,
  onOpenDetail,
  onPromote
}: {
  idea: IdeaListItem;
  isPending: boolean;
  onOpenDetail: () => void;
  onPromote: () => void;
}) {
  return (
    <article className="rounded-lg border border-border-subtle bg-surface-raised p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="break-words font-semibold">{cleanDisplayText(idea.title, { maxLength: 120 })}</h4>
        <ScoreChip label="Opp" score={idea.opportunityScore} />
        <ScoreChip label="Conf" score={idea.confidenceScore} suffix="/5" />
      </div>
      <TextClamp lines={3} className="mt-2">
        {cleanDisplayText(idea.applicationSummary ?? idea.problem, { maxLength: 260 })}
      </TextClamp>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onOpenDetail}>
          Szczegoly
        </Button>
        <Button variant="secondary" size="sm" onClick={onPromote} disabled={isPending}>
          <Brain className="h-4 w-4" /> Rozwin
        </Button>
      </div>
    </article>
  );
}

function RadarIdeaCompactSection({
  title,
  ideas,
  onOpenDetail
}: {
  title: string;
  ideas: IdeaListItem[];
  onOpenDetail: (idea: IdeaListItem) => void;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-3">
        {ideas.length ? (
          ideas.map((idea) => (
            <article key={idea.id} className="rounded-md border border-border-subtle bg-surface-raised p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="break-words font-semibold">{cleanDisplayText(idea.title, { maxLength: 120 })}</h4>
                <ScoreChip label="Conf" score={idea.confidenceScore} suffix="/5" />
              </div>
              <TextClamp lines={3} className="mt-2">
                {cleanDisplayText(idea.applicationSummary ?? idea.problem, { maxLength: 260 })}
              </TextClamp>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => onOpenDetail(idea)}>
                Szczegoly
              </Button>
            </article>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
            Brak pomyslow do rozwiniecia.
          </p>
        )}
      </div>
    </SectionCard>
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
            <article key={repo.id} className="rounded-md border border-border-subtle bg-surface-raised p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h4 className="break-words font-semibold">{cleanDisplayText(repo.fullName, { maxLength: 130 })}</h4>
                <ScoreChip label="Trend" score={repo.trendScore} />
                <Badge variant="score">{formatStars(repo.starsCurrent)} stars</Badge>
              </div>
              <TextClamp lines={3} className="mt-2">
                {cleanDisplayText(repo.shortSummaryPl ?? repo.description ?? "Brak opisu.", { maxLength: 260 })}
              </TextClamp>
            </article>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </SectionCard>
  );
}
