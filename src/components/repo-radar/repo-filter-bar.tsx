"use client";

import type React from "react";
import { ArrowDownNarrowWide, BookmarkPlus, RotateCcw, Search } from "lucide-react";
import type { RepositoryFilterPreset } from "@/lib/repository-filter-presets";
import { REPOSITORY_STATUSES, formatStatus } from "@/types/status";
import { cn } from "@/lib/utils";
import { Badge, Button } from "./ui";

export const REPO_SORT_OPTIONS = [
  { value: "trend_desc", label: "Trend najwyżej" },
  { value: "stars_desc", label: "Stars najwięcej" },
  { value: "growth7d_desc", label: "Growth 7d" },
  { value: "pushed_desc", label: "Ostatni push" },
  { value: "first_seen_desc", label: "Nowo odkryte" },
  { value: "name_asc", label: "Nazwa A-Z" }
] as const;

export type RepoSortKey = (typeof REPO_SORT_OPTIONS)[number]["value"];

export type RepoFilterBarProps = {
  query: string;
  status: string;
  language: string;
  profile: string;
  minTrend: number;
  sortKey: RepoSortKey;
  languages: string[];
  profiles: string[];
  presets: RepositoryFilterPreset[];
  resultCount: number;
  totalCount: number;
  searchInputRef?: React.Ref<HTMLInputElement>;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onProfileChange: (value: string) => void;
  onMinTrendChange: (value: number) => void;
  onSortChange: (value: RepoSortKey) => void;
  onApplyPreset: (preset: RepositoryFilterPreset) => void;
  onSavePreset: () => void;
  onReset: () => void;
};

export function RepoFilterBar({
  query,
  status,
  language,
  profile,
  minTrend,
  sortKey,
  languages,
  profiles,
  presets,
  resultCount,
  totalCount,
  searchInputRef,
  onQueryChange,
  onStatusChange,
  onLanguageChange,
  onProfileChange,
  onMinTrendChange,
  onSortChange,
  onApplyPreset,
  onSavePreset,
  onReset
}: RepoFilterBarProps) {
  const activeFilters = [
    query.trim() ? `Szukaj: ${query.trim()}` : null,
    status !== "ALL" ? `Status: ${formatStatus(status)}` : null,
    language !== "ALL" ? `Język: ${language}` : null,
    profile !== "ALL" ? `Profil: ${discoveryProfileLabel(profile)}` : null,
    minTrend > 0 ? `Trend >= ${minTrend}` : null
  ].filter(Boolean) as string[];
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="grid gap-2 xl:grid-cols-3 2xl:grid-cols-[minmax(220px,1fr)_150px_150px_170px_116px_158px_auto]">
        <label className="relative min-w-0">
          <span className="sr-only">Szukaj repozytoriów</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            className={controlClassName("pl-9")}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Szukaj nazwy, ownera, topics..."
          />
        </label>

        <label>
          <span className="sr-only">Status repozytorium</span>
          <select className={controlClassName()} value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="ALL">Wszystkie statusy</option>
            {Object.keys(REPOSITORY_STATUSES).map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {formatStatus(statusOption)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Język repozytorium</span>
          <select className={controlClassName()} value={language} onChange={(event) => onLanguageChange(event.target.value)}>
            <option value="ALL">Wszystkie języki</option>
            {languages.map((languageOption) => (
              <option key={languageOption} value={languageOption}>
                {languageOption}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Profil odkrycia</span>
          <select className={controlClassName()} value={profile} onChange={(event) => onProfileChange(event.target.value)}>
            <option value="ALL">Wszystkie profile</option>
            {profiles.map((profileOption) => (
              <option key={profileOption} value={profileOption}>
                {discoveryProfileLabel(profileOption)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex h-9 items-center gap-2 rounded-md border border-control-border bg-control px-3 text-xs font-medium text-muted-foreground">
          Trend
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none"
            type="number"
            min={0}
            max={100}
            value={minTrend}
            onChange={(event) => onMinTrendChange(clampTrend(event.target.value))}
          />
        </label>

        <label className="relative">
          <span className="sr-only">Sortowanie repozytoriów</span>
          <ArrowDownNarrowWide className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <select
            className={controlClassName("pl-9")}
            value={sortKey}
            onChange={(event) => onSortChange(event.target.value as RepoSortKey)}
          >
            {REPO_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button variant="ghost" size="sm" onClick={onReset} disabled={!hasActiveFilters && sortKey === "trend_desc"} className="h-9">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">
          {resultCount} / {totalCount}
        </span>
        <span>wyników w tym widoku</span>
        {hasActiveFilters ? (
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {activeFilters.map((filter) => (
              <Badge key={filter} tone="info" className="max-w-full truncate">
                {filter}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">Brak aktywnych filtrów</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3 text-xs">
        <span className="font-semibold uppercase text-muted-foreground">Presety</span>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            className="rounded-md border border-border-subtle bg-surface-inset px-2.5 py-1.5 font-medium text-muted-foreground transition duration-fast ease-interface hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            onClick={() => onApplyPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSavePreset}
          disabled={!hasActiveFilters && sortKey === "trend_desc"}
          className="h-8"
        >
          <BookmarkPlus className="h-4 w-4" />
          Zapisz preset
        </Button>
      </div>
    </section>
  );
}

function controlClassName(className?: string) {
  return cn(
    "h-9 w-full rounded-md border border-control-border bg-control px-3 text-sm text-foreground outline-none transition duration-fast ease-interface",
    "focus:border-primary focus:ring-2 focus:ring-focus/30",
    className
  );
}

function clampTrend(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(100, Math.max(0, parsed));
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
