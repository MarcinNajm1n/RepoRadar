"use client";

import type { RepositoryListItem, RepositoryTimelineItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { buildRepositoryRadarReasons } from "@/lib/display/radar-reason";
import { formatDisplayDate, formatGrowth, formatStars } from "@/lib/display/formatters";
import { Badge, ScoreChip, TextClamp } from "./ui";
import { RepoCardActions } from "./repo-card-actions";

export type RepoDetailsPanelProps = {
  repo: RepositoryListItem;
  timeline: RepositoryTimelineItem[];
  isTimelineLoading: boolean;
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
