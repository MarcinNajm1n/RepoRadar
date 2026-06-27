"use client";

import type React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  PlayCircle,
  Radar,
  Settings,
  Sparkles,
  Terminal
} from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import type { IdeaListItem, RadarFirstRunStep, RadarTodayData, RepositoryListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDisplayDate, formatGrowth, formatStars } from "@/lib/display/formatters";
import { cn, sanitizeExternalUrl } from "@/lib/utils";
import { Badge, Button, EmptyState, MetricPill, ScoreChip, SectionCard, SkeletonBlock, SkeletonText, TextClamp } from "./ui";
import { AiBudgetLabel, formatAiBudgetActionLabel } from "./ai-budget-label";

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

      {radarToday.firstRun.visible ? (
        <FirstRunOnboardingPanel
          onboarding={radarToday.firstRun}
          isPending={isPending}
          onOpenLibrary={onOpenLibrary}
          onOpenSettings={onOpenSettings}
          onOpenTasks={onOpenTasks}
          onRunScan={onRunScan}
        />
      ) : null}

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
            {radarToday.nextAction.signals.length ? (
              <div className="mt-3">
                <div className="text-xs font-semibold text-primary">Dlaczego teraz</div>
                <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                  {radarToday.nextAction.signals.map((signal, index) => (
                    <li key={`${radarToday.nextAction.id}-signal-${index}`} className="flex min-w-0 gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">{cleanDisplayText(signal, { maxLength: 140 })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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

      {latestScan?.status === "FAILED" || latestScan?.errorMessage ? (
        <ScanFailurePanel latestScan={latestScan} isPending={isPending} onRunScan={onRunScan} onOpenSettings={onOpenSettings} />
      ) : null}

      {isPending ? <RadarCardLoadingStrip /> : null}

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
              <EmptyState
                title="Brak repo na dzisiaj"
                text="Uruchom scan, a potem przejdz do Biblioteki, zeby zawezic wyniki filtrami."
                primaryAction={
                  <Button variant="secondary" size="sm" onClick={onRunScan} disabled={isPending}>
                    Uruchom scan
                  </Button>
                }
                secondaryAction={
                  <Button variant="ghost" size="sm" onClick={onOpenLibrary}>
                    Biblioteka
                  </Button>
                }
              />
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
              <EmptyState
                title="Brak aktywnych zadan"
                text="Dodaj zadanie z repo albo utworz reczne zadanie, zeby kolejka decyzji nie byla pusta."
                primaryAction={
                  <Button variant="secondary" size="sm" onClick={onCreateManualTask} disabled={isPending}>
                    Dodaj zadanie
                  </Button>
                }
                secondaryAction={
                  <Button variant="ghost" size="sm" onClick={onOpenLibrary}>
                    Biblioteka
                  </Button>
                }
              />
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
              <EmptyState
                title="Brak kandydatow"
                text="Otworz Biblioteke i uzyj light research przy repo, ktore wyglada obiecujaco."
                primaryAction={
                  <Button variant="secondary" size="sm" onClick={onOpenLibrary}>
                    Otworz Biblioteke
                  </Button>
                }
              />
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

function FirstRunOnboardingPanel({
  onboarding,
  isPending,
  onOpenLibrary,
  onOpenSettings,
  onOpenTasks,
  onRunScan
}: {
  onboarding: RadarTodayData["firstRun"];
  isPending: boolean;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  onRunScan: () => void;
}) {
  const requiredSteps = onboarding.steps.filter((step) => step.priority === "required");
  const optionalSteps = onboarding.steps.filter((step) => step.priority === "optional");
  const nextRequiredStep = requiredSteps.find((step) => step.status !== "done") ?? null;

  return (
    <section className="rounded-lg border border-info/30 bg-info/10 p-4 shadow-soft" aria-labelledby="first-run-title">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-info">
            <Database className="h-4 w-4" />
            Szybki start
            <Badge tone="info" variant="score">
              wymagane {onboarding.completedCount}/{onboarding.totalCount}
            </Badge>
          </div>
          <h3 id="first-run-title" className="mt-2 text-lg font-semibold text-foreground">
            Przygotuj lokalny radar do pierwszej decyzji
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Ten panel znika, gdy masz lokalne dane, pierwszy scan i podstawowa konfiguracje GitHub. Kosztowne akcje AI nadal uruchamiasz recznie.
          </p>
          {nextRequiredStep ? (
            <div className="mt-3 rounded-md border border-info/30 bg-surface-panel p-3">
              <div className="flex items-start gap-3">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-info">Nastepny krok</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{nextRequiredStep.title}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{nextRequiredStep.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {nextRequiredStep.command ? (
                      <code className="inline-flex max-w-full items-center gap-1 rounded-md border border-border-subtle bg-surface-inset px-2 py-1 text-xs text-muted-foreground">
                        <Terminal className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{nextRequiredStep.command}</span>
                      </code>
                    ) : null}
                    <FirstRunStepAction
                      step={nextRequiredStep}
                      isPending={isPending}
                      onOpenLibrary={onOpenLibrary}
                      onOpenSettings={onOpenSettings}
                      onOpenTasks={onOpenTasks}
                      onRunScan={onRunScan}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={onRunScan} disabled={isPending}>
              <PlayCircle className="h-4 w-4" /> Uruchom scan
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" /> Ustawienia
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <ol className="grid gap-2 md:grid-cols-3">
            {requiredSteps.map((step) => (
              <FirstRunStepItem
                key={step.id}
                step={step}
                isPending={isPending}
                onOpenLibrary={onOpenLibrary}
                onOpenSettings={onOpenSettings}
                onOpenTasks={onOpenTasks}
                onRunScan={onRunScan}
              />
            ))}
          </ol>
          {optionalSteps.length ? (
            <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opcjonalnie pozniej</div>
              <ol className="grid gap-2 md:grid-cols-3">
                {optionalSteps.map((step) => (
                  <FirstRunOptionalStep
                    key={step.id}
                    step={step}
                    isPending={isPending}
                    onOpenLibrary={onOpenLibrary}
                    onOpenSettings={onOpenSettings}
                    onOpenTasks={onOpenTasks}
                    onRunScan={onRunScan}
                  />
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FirstRunStepItem({
  step,
  isPending,
  onOpenLibrary,
  onOpenSettings,
  onOpenTasks,
  onRunScan
}: {
  step: RadarFirstRunStep;
  isPending: boolean;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  onRunScan: () => void;
}) {
  const isDone = step.status === "done";
  const Icon = isDone ? CheckCircle2 : Circle;

  return (
    <li className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isDone ? "text-success" : "text-muted-foreground")} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
            <Badge tone={statusTone(step.status)} variant="status">
              {statusLabel(step.status)}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {step.command ? (
              <code className="inline-flex max-w-full items-center gap-1 rounded-md border border-border-subtle bg-surface-inset px-2 py-1 text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{step.command}</span>
              </code>
            ) : null}
            <FirstRunStepAction
              step={step}
              isPending={isPending}
              onOpenLibrary={onOpenLibrary}
              onOpenSettings={onOpenSettings}
              onOpenTasks={onOpenTasks}
              onRunScan={onRunScan}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function FirstRunOptionalStep({
  step,
  isPending,
  onOpenLibrary,
  onOpenSettings,
  onOpenTasks,
  onRunScan
}: {
  step: RadarFirstRunStep;
  isPending: boolean;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  onRunScan: () => void;
}) {
  return (
    <li className="min-w-0 rounded-md border border-dashed border-border-subtle bg-surface-panel px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="min-w-0 text-xs font-semibold text-foreground">{step.title}</h4>
        <Badge tone={statusTone(step.status)} variant="status">
          {statusLabel(step.status)}
        </Badge>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {step.command ? (
          <code className="inline-flex max-w-full items-center gap-1 rounded-md border border-border-subtle bg-surface-inset px-2 py-1 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{step.command}</span>
          </code>
        ) : null}
        <FirstRunStepAction
          step={step}
          isPending={isPending}
          onOpenLibrary={onOpenLibrary}
          onOpenSettings={onOpenSettings}
          onOpenTasks={onOpenTasks}
          onRunScan={onRunScan}
        />
      </div>
    </li>
  );
}

function FirstRunStepAction({
  step,
  isPending,
  onOpenLibrary,
  onOpenSettings,
  onOpenTasks,
  onRunScan
}: {
  step: RadarFirstRunStep;
  isPending: boolean;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  onRunScan: () => void;
}) {
  switch (step.action) {
    case "open_library":
      return (
        <Button variant="ghost" size="sm" onClick={onOpenLibrary} aria-label={`Otworz Biblioteke dla kroku: ${step.title}`}>
          Biblioteka
        </Button>
      );
    case "open_settings":
      return (
        <Button variant="ghost" size="sm" onClick={onOpenSettings} aria-label={`Otworz Ustawienia dla kroku: ${step.title}`}>
          Ustawienia
        </Button>
      );
    case "open_tasks":
      return (
        <Button variant="ghost" size="sm" onClick={onOpenTasks} aria-label={`Otworz Kolejke dla kroku: ${step.title}`}>
          Kolejka
        </Button>
      );
    case "run_scan":
      return (
        <Button variant="ghost" size="sm" onClick={onRunScan} disabled={isPending} aria-label={`Uruchom scan dla kroku: ${step.title}`}>
          Scan
        </Button>
      );
    case "none":
    default:
      return null;
  }
}

function statusTone(status: RadarFirstRunStep["status"]) {
  if (status === "done") {
    return "success";
  }

  return status === "todo" ? "warning" : "info";
}

function statusLabel(status: RadarFirstRunStep["status"]) {
  if (status === "done") {
    return "gotowe";
  }

  return status === "todo" ? "do zrobienia" : "opcjonalne";
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

function ScanFailurePanel({
  latestScan,
  isPending,
  onRunScan,
  onOpenSettings
}: {
  latestScan: NonNullable<RadarTodayData["scanChanges"]["lastScan"]>;
  isPending: boolean;
  onRunScan: () => void;
  onOpenSettings: () => void;
}) {
  const error = cleanDisplayText(latestScan.errorMessage, {
    maxLength: 320,
    fallback: "Brak szczegolow bledu. Sprawdz token GitHub, rate limit i logi skanu."
  });
  const finishedAt = latestScan.finishedAt ? formatDisplayDate(latestScan.finishedAt) : "brak zapisanego czasu zakonczenia";

  return (
    <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 shadow-soft" role="alert">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Ostatni scan nie powiodl sie
            <Badge tone="danger">{latestScan.status}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Najczestsze przyczyny: wygasl token GitHub, rate limit, brak internetu albo blad jednego z zapytan GitHub API.
          </p>
          <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="min-w-0 rounded-md border border-destructive/20 bg-surface-panel/70 p-2">
              <dt className="font-semibold text-foreground">Start</dt>
              <dd className="mt-1 break-words">{formatDisplayDate(latestScan.startedAt)}</dd>
            </div>
            <div className="min-w-0 rounded-md border border-destructive/20 bg-surface-panel/70 p-2">
              <dt className="font-semibold text-foreground">Koniec</dt>
              <dd className="mt-1 break-words">{finishedAt}</dd>
            </div>
            <div className="min-w-0 rounded-md border border-destructive/20 bg-surface-panel/70 p-2">
              <dt className="font-semibold text-foreground">Repo</dt>
              <dd className="mt-1 break-words">
                {latestScan.reposUpdated}/{latestScan.reposFound} zaktualizowane
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button variant="secondary" size="sm" onClick={onRunScan} disabled={isPending}>
            Uruchom ponownie
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenSettings}>
            Ustawienia
          </Button>
        </div>
      </div>
    </section>
  );
}

function RadarCardLoadingStrip() {
  return (
    <section className="grid gap-3 md:grid-cols-3" aria-live="polite" aria-label="Odswiezanie kart radaru">
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} className="rounded-lg border border-border-subtle bg-surface-panel p-3 shadow-soft">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-8 w-8" />
            <SkeletonBlock className="h-4 w-40" />
          </div>
          <SkeletonText lines={3} className="mt-4" />
        </article>
      ))}
    </section>
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
      <div className="grid gap-3 sm:grid-cols-[2rem_minmax(0,1fr)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold tabular-nums text-primary">
          {rank}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="min-w-0 break-words font-semibold">{cleanDisplayText(repo.fullName, { maxLength: 140 })}</h4>
            <Badge variant="status">{repo.status}</Badge>
            {repo.primaryLanguage ? <Badge variant="source">{repo.primaryLanguage}</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ScoreChip label="Trend" score={repo.trendScore} />
            <ScoreChip label="Initial" score={repo.initialMomentumScore} />
          </div>
          <TextClamp lines={2}>
            {cleanDisplayText(repo.shortSummaryPl ?? repo.description ?? "Brak opisu.", { maxLength: 240 })}
          </TextClamp>
          <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))]">
            <MetricPill label="Stars" value={formatStars(repo.starsCurrent)} />
            <MetricPill label="Growth 7d" value={formatGrowth(repo.growth7d)} />
            <MetricPill label="Freshness" value={repo.pushedAt ? formatDisplayDate(repo.pushedAt) : "brak"} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onOpenQuickBrief} disabled={isPending}>
              <FileText className="h-4 w-4" /> Brief
            </Button>
            <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenReport}
                disabled={isPending}
                aria-label={formatAiBudgetActionLabel("Raport", "repo-report")}
                title={formatAiBudgetActionLabel("Raport", "repo-report")}
              >
                <FileText className="h-4 w-4" /> Raport
              </Button>
              <AiBudgetLabel action="repo-report" />
            </span>
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
        <span className="inline-flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onPromote}
            disabled={isPending}
            aria-label={formatAiBudgetActionLabel("Rozwin", "idea-promote")}
            title={formatAiBudgetActionLabel("Rozwin", "idea-promote")}
          >
            <Brain className="h-4 w-4" /> Rozwin
          </Button>
          <AiBudgetLabel action="idea-promote" />
        </span>
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
