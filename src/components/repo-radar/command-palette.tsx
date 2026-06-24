"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Download, FileText, RefreshCw, Search } from "lucide-react";
import type React from "react";
import type { RepositoryListItem } from "@/types/repository";
import { cn } from "@/lib/utils";
import type { TabKey } from "./navigation";
import { tabs } from "./navigation";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { Button, DialogShell } from "./ui";

type CommandItem = {
  id: string;
  label: string;
  hint: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

type CommandGroup = {
  id: string;
  label: string;
  commands: CommandItem[];
};

type PaletteResult = {
  id: string;
  disabled?: boolean;
  run: () => void;
};

const librarySearchResultId = "repo-search";

function commandResultId(command: CommandItem) {
  return `command-${command.id}`;
}

function repoResultId(repo: RepositoryListItem) {
  return `repo-${repo.id}`;
}

function isResultActive(activeResultId: string | null, resultId: string) {
  return activeResultId === resultId;
}

export function CommandPalette({
  isOpen,
  repositories,
  isPending,
  onClose,
  onRunScan,
  onOpenTab,
  onOpenDailyBriefing,
  onCreateWeeklyReport,
  onCreatePortfolioBrief,
  onDownloadIdeasCsv,
  onSearchRepositories
}: {
  isOpen: boolean;
  repositories: RepositoryListItem[];
  isPending: boolean;
  onClose: () => void;
  onRunScan: () => void;
  onOpenTab: (tab: TabKey) => void;
  onOpenDailyBriefing: () => void;
  onCreateWeeklyReport: () => void;
  onCreatePortfolioBrief: () => void;
  onDownloadIdeasCsv: () => void;
  onSearchRepositories: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const focusFrame = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(focusFrame);
    }
    return undefined;
  }, [isOpen]);

  const commandGroups = useMemo<CommandGroup[]>(
    () => [
      {
        id: "primary",
        label: "Skan i raporty",
        commands: [
          {
            id: "scan",
            label: "Uruchom scan",
            hint: "Pobierz najnowsze dane z GitHuba.",
            icon: RefreshCw,
            run: onRunScan
          },
          {
            id: "daily-briefing",
            label: "Utworz briefing dzienny",
            hint: "Wygeneruj lokalny briefing z najwazniejszymi sygnalami.",
            icon: CalendarClock,
            run: onOpenDailyBriefing
          },
          {
            id: "weekly",
            label: "Utworz raport tygodniowy",
            hint: "Wygeneruj lokalny raport tygodniowy.",
            icon: FileText,
            run: onCreateWeeklyReport
          },
          {
            id: "csv",
            label: "Eksportuj CSV pomyslow",
            hint: "Pobierz CSV z pomyslami.",
            icon: Download,
            run: onDownloadIdeasCsv
          },
          {
            id: "portfolio-brief",
            label: "Utworz RepoRadar Brief",
            hint: "Wygeneruj markdown portfolio i otworz widok do PDF.",
            icon: FileText,
            run: onCreatePortfolioBrief
          }
        ]
      },
      {
        id: "navigation",
        label: "Nawigacja",
        commands: tabs.map((tab) => ({
          id: `tab-${tab.key}`,
          label: `Otworz ${tab.label}`,
          hint: `Przejdz do widoku: ${tab.label}.`,
          shortcut: tab.shortcut,
          icon: tab.icon,
          run: () => onOpenTab(tab.key)
        }))
      }
    ],
    [onCreatePortfolioBrief, onCreateWeeklyReport, onDownloadIdeasCsv, onOpenDailyBriefing, onOpenTab, onRunScan]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCommandGroups = useMemo(
    () =>
      commandGroups
        .map((group) => ({
          ...group,
          commands: normalizedQuery
            ? group.commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(normalizedQuery))
            : group.commands
        }))
        .filter((group) => group.commands.length > 0),
    [commandGroups, normalizedQuery]
  );
  const repoMatches = useMemo(
    () =>
      normalizedQuery
        ? repositories
            .filter((repo) => {
              const haystack = [repo.fullName, repo.owner, repo.name, repo.primaryLanguage, repo.shortSummaryPl, repo.description, ...repo.topics]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(normalizedQuery);
            })
            .slice(0, 6)
        : [],
    [normalizedQuery, repositories]
  );
  const visibleResults = useMemo<PaletteResult[]>(
    () => [
      ...visibleCommandGroups.flatMap((group) =>
        group.commands.map((command) => ({
          id: commandResultId(command),
          disabled: isPending,
          run: command.run
        }))
      ),
      ...repoMatches.map((repo) => ({
        id: repoResultId(repo),
        run: () => onSearchRepositories(repo.fullName)
      })),
      ...(normalizedQuery
        ? [
            {
              id: librarySearchResultId,
              run: () => onSearchRepositories(query.trim())
            }
          ]
        : [])
    ],
    [isPending, normalizedQuery, onSearchRepositories, query, repoMatches, visibleCommandGroups]
  );
  const selectableResults = useMemo(() => visibleResults.filter((result) => !result.disabled), [visibleResults]);
  const normalizedActiveResultIndex = selectableResults.length ? Math.min(activeResultIndex, selectableResults.length - 1) : -1;
  const activeResultId = normalizedActiveResultIndex >= 0 ? selectableResults[normalizedActiveResultIndex].id : null;

  useEffect(() => {
    if (!activeResultId) {
      return;
    }

    document.getElementById(activeResultId)?.scrollIntoView({ block: "nearest" });
  }, [activeResultId]);

  if (!isOpen) {
    return null;
  }

  function runAndClose(action: () => void) {
    action();
    onClose();
  }

  function moveActiveResult(step: 1 | -1) {
    if (!selectableResults.length) {
      return;
    }

    const currentIndex = normalizedActiveResultIndex === -1 ? 0 : normalizedActiveResultIndex;
    setActiveResultIndex((currentIndex + step + selectableResults.length) % selectableResults.length);
  }

  function setEdgeResult(edge: "first" | "last") {
    if (!selectableResults.length) {
      return;
    }

    setActiveResultIndex(edge === "first" ? 0 : selectableResults.length - 1);
  }

  function runActiveResult() {
    const result = selectableResults[normalizedActiveResultIndex] ?? selectableResults[0];
    if (result) {
      runAndClose(result.run);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!selectableResults.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveResult(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveResult(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setEdgeResult("first");
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setEdgeResult("last");
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      runActiveResult();
    }
  }

  return (
    <DialogShell titleId="command-palette-title" onClose={onClose} className="max-w-3xl p-0">
      <div className="border-b border-border-subtle p-4">
        <h2 id="command-palette-title" className="text-lg font-semibold text-foreground">
          Paleta komend
        </h2>
        <label className="relative mt-3 block">
          <span className="sr-only">Szukaj komend albo repozytoriow</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            role="combobox"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-expanded="true"
            aria-activedescendant={activeResultId ?? undefined}
            className="h-10 w-full rounded-md border border-control-border bg-control px-3 pl-9 text-sm text-foreground outline-none transition duration-fast ease-interface focus:border-primary focus:ring-2 focus:ring-focus/30"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveResultIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Szukaj komendy, repo, ownera albo topic..."
          />
        </label>
      </div>

      <div className="max-h-[68vh] overflow-auto p-3">
        <div id="command-palette-results" role="listbox" aria-label="Wyniki palety komend" className="space-y-4">
          {visibleCommandGroups.map((group) => (
            <section key={group.id} role="group" aria-labelledby={`command-group-${group.id}`}>
              <h3 id={`command-group-${group.id}`} className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.commands.map((command) => {
                  const Icon = command.icon;
                  const resultId = commandResultId(command);
                  const isActive = isResultActive(activeResultId, resultId);
                  return (
                    <button
                      key={command.id}
                      id={resultId}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={isActive}
                      data-active={isActive ? "true" : undefined}
                      className={cn(
                        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition duration-fast ease-interface hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50",
                        isActive && "bg-surface-inset ring-1 ring-focus/40"
                      )}
                      onClick={() => runAndClose(command.run)}
                      disabled={isPending}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{command.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>
                      </span>
                      {command.shortcut ? <kbd className="rounded-md border border-border-subtle px-2 py-1 text-xs text-muted-foreground">{command.shortcut}</kbd> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {normalizedQuery ? (
            <section role="group" aria-labelledby="command-group-repositories" className="border-t border-border-subtle pt-3">
              <div id="command-group-repositories" className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Repozytoria
              </div>
              {repoMatches.length ? (
                <div className="space-y-1">
                  {repoMatches.map((repo) => {
                    const resultId = repoResultId(repo);
                    const isActive = isResultActive(activeResultId, resultId);
                    return (
                      <button
                        key={repo.id}
                        id={resultId}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-selected={isActive}
                        data-active={isActive ? "true" : undefined}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-left transition duration-fast ease-interface hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                          isActive && "bg-surface-inset ring-1 ring-focus/40"
                        )}
                        onClick={() => runAndClose(() => onSearchRepositories(repo.fullName))}
                      >
                        <span className="block truncate text-sm font-semibold text-foreground">{repo.fullName}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {cleanDisplayText(repo.shortSummaryPl ?? repo.description, { maxLength: 140, fallback: "Brak opisu." })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
                  Brak lokalnych wynikow. Nacisnij przycisk ponizej, zeby ustawic tekst jako filtr Biblioteki.
                </div>
              )}
              <Button
                id={librarySearchResultId}
                className={cn("mt-3", isResultActive(activeResultId, librarySearchResultId) && "ring-2 ring-focus/50")}
                variant="secondary"
                size="sm"
                role="option"
                tabIndex={-1}
                aria-selected={isResultActive(activeResultId, librarySearchResultId)}
                data-active={isResultActive(activeResultId, librarySearchResultId) ? "true" : undefined}
                onClick={() => runAndClose(() => onSearchRepositories(query.trim()))}
              >
                <Search className="h-4 w-4" />
                Szukaj w Bibliotece
              </Button>
            </section>
          ) : null}
        </div>
      </div>
    </DialogShell>
  );
}
