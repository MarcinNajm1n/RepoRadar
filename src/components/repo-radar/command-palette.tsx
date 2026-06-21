"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Download, FileText, FolderSearch, RefreshCw, Search, Settings, Sparkles } from "lucide-react";
import type React from "react";
import type { RepositoryListItem } from "@/types/repository";
import type { TabKey } from "./navigation";
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

export function CommandPalette({
  isOpen,
  repositories,
  isPending,
  onClose,
  onRunScan,
  onOpenTab,
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
  onCreateWeeklyReport: () => void;
  onCreatePortfolioBrief: () => void;
  onDownloadIdeasCsv: () => void;
  onSearchRepositories: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
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

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "scan",
        label: "Uruchom scan",
        hint: "Pobierz najnowsze dane z GitHuba.",
        shortcut: "Ctrl+K -> scan",
        icon: RefreshCw,
        run: onRunScan
      },
      {
        id: "library",
        label: "Otworz Biblioteke",
        hint: "Przejdz do pelnej listy repozytoriow.",
        shortcut: "Alt+2",
        icon: FolderSearch,
        run: () => onOpenTab("library")
      },
      {
        id: "new",
        label: "Otworz Nowo znalezione",
        hint: "Przejdz do inboxa nowych repo.",
        shortcut: "Alt+3",
        icon: Sparkles,
        run: () => onOpenTab("new")
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
      },
      {
        id: "settings",
        label: "Otworz Ustawienia",
        hint: "Przejdz do konfiguracji lokalnego MVP.",
        shortcut: "Alt+6",
        icon: Settings,
        run: () => onOpenTab("settings")
      },
      {
        id: "daily",
        label: "Otworz Radar dzisiaj",
        hint: "Wroc do glownego widoku decyzji.",
        shortcut: "Alt+1",
        icon: CalendarClock,
        run: () => onOpenTab("radar")
      }
    ],
    [onCreatePortfolioBrief, onCreateWeeklyReport, onDownloadIdeasCsv, onOpenTab, onRunScan]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCommands = normalizedQuery
    ? commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(normalizedQuery))
    : commands;
  const repoMatches = normalizedQuery
    ? repositories
        .filter((repo) => {
          const haystack = [repo.fullName, repo.owner, repo.name, repo.primaryLanguage, repo.shortSummaryPl, repo.description, ...repo.topics]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
        .slice(0, 6)
    : [];

  if (!isOpen) {
    return null;
  }

  function runAndClose(action: () => void) {
    action();
    onClose();
  }

  return (
    <DialogShell titleId="command-palette-title" onClose={onClose} className="max-w-3xl p-0">
      <div className="border-b border-border-subtle p-4">
        <h2 id="command-palette-title" className="text-lg font-semibold text-foreground">
          Command Palette
        </h2>
        <label className="relative mt-3 block">
          <span className="sr-only">Szukaj komend albo repozytoriow</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            className="h-10 w-full rounded-md border border-control-border bg-control px-3 pl-9 text-sm text-foreground outline-none transition duration-fast ease-interface focus:border-primary focus:ring-2 focus:ring-focus/30"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj komendy, repo, ownera albo topic..."
          />
        </label>
      </div>

      <div className="max-h-[68vh] overflow-auto p-3">
        <div className="space-y-1">
          {visibleCommands.map((command) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                type="button"
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition duration-fast ease-interface hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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

        {normalizedQuery ? (
          <div className="mt-4 border-t border-border-subtle pt-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Repozytoria</div>
            {repoMatches.length ? (
              <div className="space-y-1">
                {repoMatches.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left transition duration-fast ease-interface hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    onClick={() => runAndClose(() => onSearchRepositories(repo.fullName))}
                  >
                    <span className="block truncate text-sm font-semibold text-foreground">{repo.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {cleanDisplayText(repo.shortSummaryPl ?? repo.description, { maxLength: 140, fallback: "Brak opisu." })}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
                Brak lokalnych wynikow. Nacisnij przycisk ponizej, zeby ustawic tekst jako filtr Biblioteki.
              </div>
            )}
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => runAndClose(() => onSearchRepositories(query.trim()))}>
              <Search className="h-4 w-4" />
              Szukaj w Bibliotece
            </Button>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
