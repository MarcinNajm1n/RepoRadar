"use client";

import type { ReactNode } from "react";
import type { RepositoryDecisionContext, RepositoryListItem, RepositoryTimelineItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { buildRepositoryRadarReasons } from "@/lib/display/radar-reason";
import { formatDisplayDate, formatGrowth, formatStars } from "@/lib/display/formatters";
import { getAiPriorityReasons } from "@/lib/openai/priority";
import { Badge, ScoreChip, TextClamp, type BadgeTone } from "./ui";
import { RepoCardActions } from "./repo-card-actions";

export type RepoDetailsPanelProps = {
  repo: RepositoryListItem;
  timeline: RepositoryTimelineItem[];
  isTimelineLoading: boolean;
  decisionContext?: RepositoryDecisionContext | null;
  isDecisionContextLoading?: boolean;
  decisionContextError?: string | null;
  isPending: boolean;
  onOpenReport: () => void;
  onRegenerateReport: () => void;
  onSave: () => void;
  onMarkRead: () => void;
  onOpenQuickBrief: () => void;
  onGenerateIdea: () => void;
  onResearch: () => void;
  onAddCloneTask: () => void;
  onAddDemoTask: () => void;
  onValidateMarket: () => void;
  onIgnore: () => void;
};

export function RepoDetailsPanel({
  repo,
  timeline,
  isTimelineLoading,
  decisionContext = null,
  isDecisionContextLoading = false,
  decisionContextError = null,
  isPending,
  onOpenReport,
  onRegenerateReport,
  onSave,
  onMarkRead,
  onOpenQuickBrief,
  onGenerateIdea,
  onResearch,
  onAddCloneTask,
  onAddDemoTask,
  onValidateMarket,
  onIgnore
}: RepoDetailsPanelProps) {
  const description = cleanDisplayText(repo.description, {
    maxLength: 320,
    fallback: "Brak opisu w GitHub metadata."
  });
  const summary = cleanDisplayText(repo.shortSummaryPl, {
    maxLength: 420,
    fallback: "Krotki opis PL nie zostal jeszcze wygenerowany."
  });
  const readmeExcerpt = cleanDisplayText(repo.readmeExcerpt, { maxLength: 520 });

  return (
    <div className="border-t border-border-subtle bg-surface-inset px-3 py-4 sm:px-4" id={`repo-details-${repo.id}`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
            <div className="flex flex-wrap items-center gap-2">
              <ScoreChip label="Trend" score={repo.trendScore} />
              <ScoreChip label="Initial" score={repo.initialMomentumScore} />
              <Badge tone={repo.growth7d === null ? "warning" : "success"} variant="score">
                7d {formatGrowth(repo.growth7d)}
              </Badge>
              <Badge tone="neutral" variant="score">
                Stars {formatStars(repo.starsCurrent)}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">{summary}</p>
            <TextClamp lines={3} className="mt-2">
              {description}
            </TextClamp>
            {readmeExcerpt ? (
              <div className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">README excerpt</div>
                <TextClamp lines={4} className="mt-1">
                  {readmeExcerpt}
                </TextClamp>
              </div>
            ) : null}
          </section>

          <RadarReasonPanel repo={repo} />
          <RepositoryDecisionCenter decisionContext={decisionContext} isLoading={isDecisionContextLoading} error={decisionContextError} />
          <AiPriorityPanel repo={repo} />
          <RepositoryTrendMiniChart repo={repo} timeline={timeline} isLoading={isTimelineLoading} />
          <RepositoryTimeline timeline={timeline} isLoading={isTimelineLoading} />
        </div>

        <aside className="min-w-0 space-y-3">
          <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
            <h4 className="text-sm font-semibold text-foreground">Metadane</h4>
            <div className="mt-3 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
              <Info label="Owner" value={repo.owner} />
              <Info label="Jezyk" value={repo.primaryLanguage ?? "brak"} />
              <Info label="Forks" value={String(repo.forksCurrent)} />
              <Info label="Watchers" value={String(repo.watchersCurrent)} />
              <Info label="Issues" value={String(repo.openIssues)} />
              <Info label="Wiek" value={`${repo.ageMonths} mies.`} />
              <Info label="Relevance" value={`${repo.relevanceScore}/100`} />
              <Info label="Created" value={formatDisplayDate(repo.createdAt)} />
              <Info label="Pushed" value={formatDisplayDate(repo.pushedAt)} />
              <Info label="Pierwszy scan" value={formatDisplayDate(repo.firstSeenAt)} />
              <Info label="Ostatni scan" value={formatDisplayDate(repo.lastSeenAt)} />
              <Info label="Zrodlo" value={repo.source} />
              <Info label="License" value={repo.license ?? "brak"} />
            </div>
          </section>

          <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
            <h4 className="text-sm font-semibold text-foreground">Profile i topics</h4>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {repo.discoveryProfiles.map((profile) => (
                <Badge key={profile} tone="info">
                  {discoveryProfileLabel(profile)}
                </Badge>
              ))}
              {repo.topics.slice(0, 12).map((topic) => (
                <Badge key={topic}>{cleanDisplayText(topic, { maxLength: 28 })}</Badge>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-4 rounded-md border border-border-subtle bg-surface-panel p-3">
        <RepoCardActions
          repoUrl={repo.url}
          isPending={isPending}
          onSave={onSave}
          onMarkRead={onMarkRead}
          onOpenQuickBrief={onOpenQuickBrief}
          onOpenReport={onOpenReport}
          onRegenerateReport={onRegenerateReport}
          onGenerateIdea={onGenerateIdea}
          onResearch={onResearch}
          onAddCloneTask={onAddCloneTask}
          onAddDemoTask={onAddDemoTask}
          onValidateMarket={onValidateMarket}
          onIgnore={onIgnore}
        />
      </div>
    </div>
  );
}

function RepositoryDecisionCenter({
  decisionContext,
  isLoading,
  error
}: {
  decisionContext: RepositoryDecisionContext | null;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Centrum decyzji</h4>
        <Badge tone={decisionContext ? decisionTone(decisionContext.nextAction.tone) : isLoading ? "info" : "warning"} variant="status">
          {decisionContext ? nextActionKindLabel(decisionContext.nextAction.kind) : isLoading ? "ladowanie" : error ? "blad" : "brak danych"}
        </Badge>
      </div>

      {isLoading && !decisionContext ? (
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Pobieram raporty, zadania i evidence dla centrum decyzji...
        </p>
      ) : null}

      {!isLoading && error ? (
        <p className="mt-3 rounded-md border border-warning/40 bg-warning/15 p-3 text-sm text-warning-foreground">
          Nie udalo sie zaladowac centrum decyzji: {cleanDisplayText(error, { maxLength: 180 })}
        </p>
      ) : null}

      {!isLoading && !error && !decisionContext ? (
        <p className="mt-3 rounded-md border border-dashed border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Centrum decyzji nie zostalo jeszcze zaladowane. Rozwin repo ponownie albo odswiez widok.
        </p>
      ) : null}

      {decisionContext ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge tone={decisionTone(decisionContext.nextAction.tone)} variant="status">
                Nastepna akcja
              </Badge>
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">{decisionContext.nextAction.title}</span>
              <Badge tone="neutral" variant="score">
                {decisionContext.nextAction.actionLabel}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-5 text-foreground">{decisionContext.nextAction.description}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{decisionContext.nextAction.reason}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {decisionContext.signals.map((signal) => (
              <div key={signal.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-inset px-3 py-2">
                <span className="truncate text-xs font-medium text-muted-foreground">{signal.label}</span>
                <Badge tone={decisionTone(signal.tone)} variant="score" className="max-w-[170px] truncate">
                  {signal.value}
                </Badge>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <DecisionLedgerBlock
              title="Raporty"
              meta={`${decisionContext.reports.totalCount} lacznie`}
              rows={[
                ["Quick brief", String(decisionContext.reports.quickBriefCount)],
                ["Pelny raport", String(decisionContext.reports.fullReportCount)],
                ["Decyzje", String(decisionContext.reports.decisionLogCount)],
                ["Scoring", String(decisionContext.reports.scoringSnapshotCount)]
              ]}
            >
              {decisionContext.reports.recent.length ? (
                <ol className="mt-2 space-y-2">
                  {decisionContext.reports.recent.map((report) => (
                    <li key={report.id} className="min-w-0 border-t border-border-subtle pt-2 first:border-t-0 first:pt-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge tone="info">{reportKindLabel(report.type)}</Badge>
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">{cleanDisplayText(report.title, { maxLength: 96 })}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDisplayDate(report.createdAt)}
                        {report.summary ? ` | ${cleanDisplayText(report.summary, { maxLength: 110 })}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Brak raportow dla tego repo.</p>
              )}
            </DecisionLedgerBlock>

            <DecisionLedgerBlock title="Otwarte zadania" meta={`${decisionContext.tasks.openCount} aktywne`}>
              {decisionContext.tasks.recentOpen.length ? (
                <ol className="mt-2 space-y-2">
                  {decisionContext.tasks.recentOpen.map((task) => (
                    <li key={task.id} className="min-w-0 border-t border-border-subtle pt-2 first:border-t-0 first:pt-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge tone={task.status === "SNOOZED" ? "warning" : "info"}>{task.status}</Badge>
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">{cleanDisplayText(task.title, { maxLength: 120 })}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Priorytet {task.priority}
                        {task.dueAt ? ` | termin ${formatDisplayDate(task.dueAt)}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Brak otwartych zadan blokujacych decyzje.</p>
              )}
            </DecisionLedgerBlock>

            <DecisionLedgerBlock
              title="Evidence / research"
              meta={`${decisionContext.evidence.sourceCount} zrodel`}
              rows={[
                ["Przebiegi researchu", String(decisionContext.evidence.researchRunCount)],
                ["Typy", decisionContext.evidence.sourceTypes.join(", ") || "brak"],
                ["Ostatni research", decisionContext.evidence.lastResearchAt ? formatDisplayDate(decisionContext.evidence.lastResearchAt) : "brak"]
              ]}
            >
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{decisionContext.evidence.summary}</p>
              {decisionContext.evidence.topSources.length ? (
                <ol className="mt-2 space-y-2">
                  {decisionContext.evidence.topSources.map((source) => (
                    <li key={source.id} className="min-w-0 border-t border-border-subtle pt-2 first:border-t-0 first:pt-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge tone="info" className="max-w-full min-w-0">
                          <span className="truncate">{cleanDisplayText(source.sourceType, { maxLength: 36 })}</span>
                        </Badge>
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">{cleanDisplayText(source.title, { maxLength: 110 })}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {source.whatItProves
                          ? cleanDisplayText(source.whatItProves, { maxLength: 130 })
                          : `${source.publisher ?? "nieznane zrodlo"} | ${formatDisplayDate(source.retrievedAt)}`}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </DecisionLedgerBlock>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DecisionLedgerBlock({
  title,
  meta,
  rows = [],
  children
}: {
  title: string;
  meta: string;
  rows?: Array<[string, string]>;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-surface-inset p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h5 className="truncate text-xs font-semibold uppercase text-muted-foreground">{title}</h5>
        <Badge tone="neutral" variant="score">
          {meta}
        </Badge>
      </div>
      {rows.length ? (
        <div className="mt-2 grid gap-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-w-0 items-center justify-between gap-3">
              <span className="truncate text-muted-foreground">{label}</span>
              <span className="max-w-[170px] truncate font-semibold tabular-nums text-foreground">{value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function decisionTone(tone: RepositoryDecisionContext["nextAction"]["tone"]): BadgeTone {
  return tone;
}

function nextActionKindLabel(kind: RepositoryDecisionContext["nextAction"]["kind"]) {
  const labels: Record<RepositoryDecisionContext["nextAction"]["kind"], string> = {
    quick_brief: "quick brief",
    full_report: "pelny raport",
    open_task: "zadanie",
    research_evidence: "evidence",
    status_decision: "status",
    monitor: "monitor"
  };
  return labels[kind];
}

function reportKindLabel(type: string) {
  const labels: Record<string, string> = {
    repo_quick_brief: "brief",
    repo: "raport",
    decision_log: "decyzja",
    scoring_snapshot: "scoring"
  };
  return labels[type] ?? type;
}

function AiPriorityPanel({ repo }: { repo: RepositoryListItem }) {
  const reasons = getAiPriorityReasons(repo);
  const isPriority = reasons.length > 0;

  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">Priorytet AI</h4>
        <Badge tone={isPriority ? "accent" : "neutral"} variant="status">
          {isPriority ? "w kolejce automatycznej" : "poza kolejka automatyczna"}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">
        To kwalifikacja do automatycznych analiz AI. Reczne akcje: brief, raport, pomysl i research pozostaja dostepne niezaleznie
        od tego statusu.
      </p>
      {isPriority ? (
        <ul className="mt-3 space-y-2">
          {reasons.map((reason) => (
            <li key={reason.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Badge tone="info">{reason.label}</Badge>
              <span className="text-muted-foreground">{reason.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset px-3 py-2 text-sm text-muted-foreground">
          Repo nie trafia teraz do automatycznej kolejki AI, bo nie przekracza progow trendu, wzrostu ani statusu recznego. Nadal
          mozesz uruchomic brief, raport, pomysl albo research recznie.
        </p>
      )}
    </section>
  );
}

function RepositoryTrendMiniChart({
  repo,
  timeline,
  isLoading
}: {
  repo: RepositoryListItem;
  timeline: RepositoryTimelineItem[];
  isLoading: boolean;
}) {
  const snapshots = timeline
    .filter((item) => item.type === "snapshot")
    .map((item) => {
      const stars = Number(item.title.match(/^(\d+)/)?.[1]);
      return Number.isFinite(stars) ? { id: item.id, stars, timestamp: item.timestamp } : null;
    })
    .filter((item): item is { id: string; stars: number; timestamp: string } => Boolean(item))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const minStars = snapshots.length ? Math.min(...snapshots.map((item) => item.stars)) : repo.starsCurrent;
  const maxStars = snapshots.length ? Math.max(...snapshots.map((item) => item.stars)) : repo.starsCurrent;

  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Mini trend stars</h4>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={repo.growth24h === null ? "warning" : "success"}>24h {formatGrowth(repo.growth24h)}</Badge>
          <Badge tone={repo.growth7d === null ? "warning" : "success"}>7d {formatGrowth(repo.growth7d)}</Badge>
          <Badge tone="neutral">30d brak historii</Badge>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Laduje snapshoty do mini wykresu...
        </p>
      ) : snapshots.length >= 2 ? (
        <div className="mt-3">
          <div className="flex h-24 items-end gap-1 rounded-md border border-border-subtle bg-surface-inset px-2 pb-2 pt-3">
            {snapshots.map((snapshot) => {
              const height = maxStars === minStars ? 48 : 18 + ((snapshot.stars - minStars) / Math.max(1, maxStars - minStars)) * 62;
              return (
                <div key={snapshot.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm bg-primary/80 transition duration-fast ease-interface"
                    style={{ height: `${height}px` }}
                    title={`${snapshot.stars} stars | ${formatDisplayDate(snapshot.timestamp)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDisplayDate(snapshots[0].timestamp)}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatStars(minStars)} {"->"} {formatStars(maxStars)}
            </span>
            <span>{formatDisplayDate(snapshots[snapshots.length - 1].timestamp)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Za malo snapshotow do wykresu. RepoRadar pokaze trend po kolejnych scanach.
        </p>
      )}
    </section>
  );
}

function RepositoryTimeline({ timeline, isLoading }: { timeline: RepositoryTimelineItem[]; isLoading: boolean }) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Timeline repozytorium</h4>
        <Badge tone="neutral">{isLoading ? "ladowanie" : `${timeline.length} zdarzen`}</Badge>
      </div>
      {isLoading ? (
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Pobieram snapshoty, raporty i akcje uzytkownika...
        </p>
      ) : timeline.length ? (
        <ol className="mt-3 space-y-2">
          {timeline.map((item) => (
            <li key={item.id} className="rounded-md border border-border-subtle bg-surface-inset p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.tone === "positive" ? "success" : item.tone === "warning" ? "warning" : "neutral"}>
                  {item.type}
                </Badge>
                <span className="text-sm font-semibold text-foreground">{cleanDisplayText(item.title, { maxLength: 120 })}</span>
                <span className="text-xs text-muted-foreground">{formatDisplayDate(item.timestamp)}</span>
              </div>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{cleanDisplayText(item.detail, { maxLength: 220 })}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Brak dodatkowych zdarzen poza metadanymi repo.
        </p>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function RadarReasonPanel({ repo }: { repo: RepositoryListItem }) {
  const reasons = buildRepositoryRadarReasons(repo);
  const rows = [
    ["Growth abs", repo.scoreBreakdown.absoluteGrowthPoints],
    ["Growth %", repo.scoreBreakdown.percentageGrowthPoints],
    ["Wiek", repo.scoreBreakdown.agePoints],
    ["Stars", repo.scoreBreakdown.totalStarsPoints],
    ["Forks", repo.scoreBreakdown.forksPoints],
    ["Fresh push", repo.scoreBreakdown.pushFreshnessPoints],
    ["Topics", repo.scoreBreakdown.topicRelevancePoints],
    ["README", repo.scoreBreakdown.readmeQualityPoints],
    ["Keywords", repo.scoreBreakdown.keywordRelevancePoints]
  ] as const;

  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">Dlaczego radar to pokazuje?</h4>
        <ScoreChip label="Trend" score={repo.trendScore} />
        <ScoreChip label="Initial" score={repo.initialMomentumScore} />
        {repo.scoreBreakdown.usedInitialMomentumFallback ? (
          <Badge tone="warning">initial fallback</Badge>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {reasons.map((reason) => (
          <div key={reason.id} className="rounded-md border border-border-subtle bg-surface-inset px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={reason.tone === "positive" ? "success" : reason.tone === "warning" ? "warning" : "neutral"}>
                {reason.tone}
              </Badge>
              <span className="text-sm font-semibold text-foreground">{reason.title}</span>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{reason.detail}</p>
          </div>
        ))}
      </div>
      {repo.growth7d === null ? (
        <p className="mt-3 rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
          Brak lokalnej historii 7d. RepoRadar pokazuje initial momentum jako fallback i nie udaje realnego weekly growth.
        </p>
      ) : null}
      <h5 className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Breakdown scoringu</h5>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-inset px-3 py-2">
            <span className="truncate text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function discoveryProfileLabel(profile: string) {
  const labels: Record<string, string> = {
    AI_AGENTS: "AI agents",
    LLM_APPS: "LLM apps",
    MCP: "MCP",
    CODEX_WORKFLOWS: "Codex workflows",
    DEVTOOLS_AUTOMATION: "Devtools automation",
    RAG: "RAG",
    PROMPT_TOOLS: "Prompt tools",
    LOCAL_AI: "Local AI"
  };
  return labels[profile] ?? profile;
}
