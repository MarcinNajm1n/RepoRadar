import { ChevronDown, ExternalLink, Flame } from "lucide-react";
import type { RepositoryListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDisplayDate, formatGrowth, formatStars } from "@/lib/display/formatters";
import { getRepositoryStatusDisplay } from "@/lib/display/status-display";
import { cn, sanitizeExternalUrl } from "@/lib/utils";
import { Badge, Button, MetricPill, ScoreChip, StatusChip, TextClamp } from "./ui";
import { RepoCardActions } from "./repo-card-actions";
import { AiBudgetLabel, formatAiBudgetActionLabel } from "./ai-budget-label";

type RepoCardProps = {
  repo: RepositoryListItem;
  isExpanded: boolean;
  isPending: boolean;
  onToggle: () => void;
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

export function RepoCard({
  repo,
  isExpanded,
  isPending,
  onToggle,
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
}: RepoCardProps) {
  const safeUrl = sanitizeExternalUrl(repo.url);
  const summary = cleanDisplayText(repo.shortSummaryPl ?? repo.description ?? "Brak opisu.", { maxLength: 260 });
  const description = cleanDisplayText(repo.description ?? "Brak opisu w GitHub metadata.", { maxLength: 220 });
  const pushed = repo.pushedAt ? formatDisplayDate(repo.pushedAt) : "brak";

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-soft transition hover:border-primary/40" onDoubleClick={onOpenReport}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold">{repo.fullName}</h3>
            <StatusChip status={getRepositoryStatusDisplay(repo.status)} />
            {repo.status === "HOT" ? (
              <Badge tone="success">
                <Flame className="h-3 w-3" /> Hot
              </Badge>
            ) : null}
            {repo.isArchived ? <Badge>archived</Badge> : null}
            {repo.isFork ? <Badge>fork</Badge> : null}
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <ScoreChip label="Trend" score={repo.trendScore} />
            <ScoreChip label="Initial" score={repo.initialMomentumScore} />
            <MetricPill label="Stars" value={formatStars(repo.starsCurrent)} />
            <MetricPill label="Growth / push" value={`${formatGrowth(repo.growth7d)} | ${pushed}`} />
          </div>

          <TextClamp lines={2}>{summary}</TextClamp>
          {repo.shortSummaryPl ? <TextClamp lines={1} className="mt-1">{description}</TextClamp> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {repo.discoveryProfiles.slice(0, 4).map((profile) => (
              <Badge key={profile} tone="info">
                {discoveryProfileLabel(profile)}
              </Badge>
            ))}
            {repo.topics.slice(0, 6).map((topic) => (
              <Badge key={topic}>{cleanDisplayText(topic, { maxLength: 28 })}</Badge>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
          <span className="inline-flex items-center gap-1.5">
            <Button
              variant="secondary"
              onClick={onOpenReport}
              disabled={isPending}
              aria-label={formatAiBudgetActionLabel("Raport", "repo-report")}
              title={formatAiBudgetActionLabel("Raport", "repo-report")}
            >
              Raport
            </Button>
            <AiBudgetLabel action="repo-report" />
          </span>
          {safeUrl && safeUrl.startsWith("https://github.com/") ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ExternalLink className="h-4 w-4" /> GitHub
            </a>
          ) : null}
          <Button variant="ghost" onClick={onToggle} aria-expanded={isExpanded} aria-controls={`repo-details-${repo.id}`}>
            <ChevronDown className={cn("h-4 w-4 transition", isExpanded && "rotate-180")} />
            {isExpanded ? "Zwin" : "Rozwin"}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div id={`repo-details-${repo.id}`} className="mt-4 border-t border-border pt-4">
          <div className="mb-3 grid gap-3 text-sm md:grid-cols-3">
            <Info label="Owner" value={repo.owner} />
            <Info label="Forks" value={String(repo.forksCurrent)} />
            <Info label="Issues" value={String(repo.openIssues)} />
            <Info label="Wiek" value={`${repo.ageMonths} mies.`} />
            <Info label="Relevance" value={`${repo.relevanceScore}/100`} />
            <Info label="Jezyk" value={repo.primaryLanguage ?? "brak"} />
            <Info label="Created" value={formatDisplayDate(repo.createdAt)} />
            <Info label="Zrodlo" value={repo.source} />
            <Info label="License" value={repo.license ?? "brak"} />
          </div>
          <ScoreBreakdown repo={repo} />
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
      ) : null}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function ScoreBreakdown({ repo }: { repo: RepositoryListItem }) {
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
    <div className="mb-4 rounded-md border border-border bg-muted p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Dlaczego taki score?</h4>
        <ScoreChip label="Trend" score={repo.trendScore} />
        <ScoreChip label="Initial" score={repo.initialMomentumScore} />
      </div>
      {repo.growth7d === null ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Brak lokalnej historii 7d. RepoRadar pokazuje initial momentum jako osobny fallback i nie udaje realnego weekly growth.
        </p>
      ) : null}
      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
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
