"use client";

import { Archive, ChevronDown, ExternalLink, FileText, Flame, GitCompare, GitFork } from "lucide-react";
import type React from "react";
import type { RepositoryListItem, RepositoryTimelineItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDisplayDate, formatGrowth, formatStars } from "@/lib/display/formatters";
import { getRepositoryStatusDisplay } from "@/lib/display/status-display";
import { cn, sanitizeExternalUrl } from "@/lib/utils";
import { Badge, Button, ScoreChip, StatusChip } from "./ui";
import { RepoDetailsPanel } from "./repo-details-panel";
import { formatAiBudgetActionLabel } from "./ai-budget-label";

export type RepoRowProps = {
  repo: RepositoryListItem;
  isExpanded: boolean;
  timeline: RepositoryTimelineItem[];
  isTimelineLoading: boolean;
  isCompareSelected: boolean;
  isPending: boolean;
  onToggle: () => void;
  onToggleCompare: () => void;
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

export function RepoRow({
  repo,
  isExpanded,
  timeline,
  isTimelineLoading,
  isCompareSelected,
  isPending,
  onToggle,
  onToggleCompare,
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
}: RepoRowProps) {
  const safeUrl = sanitizeExternalUrl(repo.url);
  const summary = cleanDisplayText(repo.shortSummaryPl ?? repo.description, {
    maxLength: 220,
    fallback: "Brak opisu."
  });
  const pushed = repo.pushedAt ? formatDisplayDate(repo.pushedAt) : "brak";
  const reportBudgetLabel = formatAiBudgetActionLabel("Raport", "repo-report");

  return (
    <article className={cn("bg-surface-panel transition duration-fast ease-interface", isExpanded && "bg-surface-raised")}>
      <div className="grid gap-2 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_150px] lg:items-center">
        <button
          type="button"
          className={cn(
            "grid min-w-0 gap-3 rounded-md text-left outline-none transition duration-fast ease-interface",
            "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "lg:grid-cols-[minmax(0,1fr)_92px_92px_92px_112px] lg:items-center",
            "hover:bg-surface-inset lg:hover:bg-transparent"
          )}
          onClick={onToggle}
          onDoubleClick={onOpenReport}
          aria-expanded={isExpanded}
          aria-controls={`repo-details-${repo.id}`}
        >
          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">{repo.fullName}</span>
              <StatusChip status={getRepositoryStatusDisplay(repo.status)} />
              {repo.status === "HOT" ? (
                <Badge tone="success">
                  <Flame className="h-3 w-3" /> Hot
                </Badge>
              ) : null}
              {repo.isArchived ? (
                <Badge>
                  <Archive className="h-3 w-3" /> archived
                </Badge>
              ) : null}
              {repo.isFork ? (
                <Badge>
                  <GitFork className="h-3 w-3" /> fork
                </Badge>
              ) : null}
            </span>
            <span className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {summary}
            </span>
            <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
              {repo.discoveryProfiles.slice(0, 3).map((profile) => (
                <Badge key={profile} tone="info" className="max-w-full truncate">
                  {discoveryProfileLabel(profile)}
                </Badge>
              ))}
              {repo.topics.slice(0, 4).map((topic) => (
                <Badge key={topic} className="max-w-[140px] truncate">
                  {cleanDisplayText(topic, { maxLength: 28 })}
                </Badge>
              ))}
            </span>
          </span>

          <MetricCell label="Trend">
            <ScoreChip label="Trend" score={repo.trendScore} className="justify-center" />
          </MetricCell>
          <MetricCell label="Stars" value={formatStars(repo.starsCurrent)} />
          <MetricCell label="Growth 7d" value={formatGrowth(repo.growth7d)} muted={repo.growth7d === null} />
          <MetricCell label="Push" value={pushed} />
        </button>

        <div className="flex items-center justify-start gap-1.5 lg:justify-end">
          <Button
            variant={isCompareSelected ? "secondary" : "ghost"}
            size="icon"
            onClick={onToggleCompare}
            aria-pressed={isCompareSelected}
            aria-label={isCompareSelected ? `Usun z porownania ${repo.fullName}` : `Dodaj do porownania ${repo.fullName}`}
          >
            <GitCompare className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenReport}
            disabled={isPending}
            aria-label={reportBudgetLabel}
            title={reportBudgetLabel}
          >
            <FileText className="h-4 w-4" />
            Raport
          </Button>
          {safeUrl && safeUrl.startsWith("https://github.com/") ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-2.5 text-xs font-medium text-muted-foreground transition duration-fast ease-interface hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub
            </a>
          ) : (
            <Button variant="ghost" size="sm" disabled>
              <ExternalLink className="h-4 w-4" />
              GitHub
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onToggle} aria-expanded={isExpanded} aria-controls={`repo-details-${repo.id}`}>
            <ChevronDown className={cn("h-4 w-4 transition", isExpanded && "rotate-180")} />
            <span className="sr-only">{isExpanded ? "Zwin szczegoly" : "Rozwin szczegoly"}</span>
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <RepoDetailsPanel
          repo={repo}
          timeline={timeline}
          isTimelineLoading={isTimelineLoading}
          isPending={isPending}
          onOpenReport={onOpenReport}
          onRegenerateReport={onRegenerateReport}
          onSave={onSave}
          onMarkRead={onMarkRead}
          onOpenQuickBrief={onOpenQuickBrief}
          onGenerateIdea={onGenerateIdea}
          onResearch={onResearch}
          onAddCloneTask={onAddCloneTask}
          onAddDemoTask={onAddDemoTask}
          onValidateMarket={onValidateMarket}
          onIgnore={onIgnore}
        />
      ) : null}
    </article>
  );
}

function MetricCell({
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
    <span className="grid min-w-0 grid-cols-[92px_minmax(0,1fr)] items-center gap-2 text-sm lg:block">
      <span className="text-xs font-medium text-muted-foreground lg:hidden">{label}</span>
      <span className={cn("truncate font-semibold tabular-nums text-foreground lg:text-xs", muted && "text-muted-foreground")}>
        {children ?? value}
      </span>
    </span>
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
