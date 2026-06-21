"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Command, Download, FileText, Printer, RefreshCw } from "lucide-react";
import type {
  DashboardData,
  EvidenceSourceItem,
  IdeaListItem,
  RepositoryListItem,
  RepositoryPage,
  RepositoryPageInput,
  RepositoryTimelineItem
} from "@/types/repository";
import {
  clearExpiredExternalCacheAction,
  clearOldNotificationLogsAction,
  completeActionItemAction,
  createActionItemAction,
  dismissActionItemAction,
  exportIdeasCsvAction,
  createPortfolioBriefAction,
  getRepositoryPageAction,
  getRepositoryTimelineAction,
  generateQuickBriefAction,
  generateDailyBriefingAction,
  createWeeklyReportAction,
  generateIdeaAction,
  generateOpportunityCandidateAction,
  promoteCandidateToFullIdeaAction,
  pruneOldSnapshotsAction,
  generateReportAction,
  runScanAction,
  snoozeActionItemAction,
  testNotificationAction,
  updateIdeaStatusAction,
  updateSettingAction,
  updateStatusAction
} from "@/app/actions";
import { IDEA_STATUS, isFullIdeaStatus } from "@/types/idea-status";
import { cn, formatDate } from "@/lib/utils";
import { AppShell } from "@/components/repo-radar/app-shell";
import { TopBar } from "@/components/repo-radar/top-bar";
import { RadarTodayView } from "@/components/repo-radar/radar-today-view";
import { RepoListView } from "@/components/repo-radar/repo-list-view";
import { REPO_SORT_OPTIONS, RepoFilterBar } from "@/components/repo-radar/repo-filter-bar";
import type { RepoSortKey } from "@/components/repo-radar/repo-filter-bar";
import { CommandPalette } from "@/components/repo-radar/command-palette";
import { ActionItemCard as RepoActionItemCard } from "@/components/repo-radar/action-item-card";
import { TasksView } from "@/components/repo-radar/tasks-view";
import { IdeasView } from "@/components/repo-radar/ideas-view";
import { SettingsView } from "@/components/repo-radar/settings-view";
import { WeeklyReportsView } from "@/components/repo-radar/weekly-reports-view";
import { IdeaDetailDialog } from "@/components/repo-radar/idea-detail-dialog";
import { EvidencePanel } from "@/components/repo-radar/evidence-panel";
import { ReportView } from "@/components/repo-radar/report-view";
import { getTabLabel, tabs } from "@/components/repo-radar/navigation";
import type { SectionKey, TabKey } from "@/components/repo-radar/navigation";
import { Button, DialogShell, SkeletonBlock, SkeletonText, type FeedbackState } from "@/components/repo-radar/ui";
import {
  BUILT_IN_REPOSITORY_FILTER_PRESETS,
  FILTER_PRESET_STORAGE_KEY,
  createSavedFilterPreset,
  parseSavedFilterPresets,
  serializeSavedFilterPresets
} from "@/lib/repository-filter-presets";
import type { RepositoryFilterPreset } from "@/lib/repository-filter-presets";

type ReportState = {
  title: string;
  content: string;
  path: string | null;
  evidenceSources: EvidenceSourceItem[];
} | null;

function getTomorrowIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function isRepositoryListTab(tab: TabKey) {
  return tab === "library" || tab === "new" || tab === "saved" || tab === "read" || tab === "ignored" || tab === "old";
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function isRepoSortKey(value: string): value is RepoSortKey {
  return REPO_SORT_OPTIONS.some((option) => option.value === value);
}

function readSavedFilterPresets() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return parseSavedFilterPresets(window.localStorage.getItem(FILTER_PRESET_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function RepoRadarApp({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionKey>("repo");
  const [activeTab, setActiveTab] = useState<TabKey>("radar");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [discoveryProfileFilter, setDiscoveryProfileFilter] = useState("ALL");
  const [minTrend, setMinTrend] = useState(0);
  const [repoSortKey, setRepoSortKey] = useState<RepoSortKey>("trend_desc");
  const [repositoryPage, setRepositoryPage] = useState<RepositoryPage>(initialData.repositoryPage);
  const [isRepositoryPageLoading, setIsRepositoryPageLoading] = useState(false);
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);
  const [selectedCompareRepoIds, setSelectedCompareRepoIds] = useState<string[]>([]);
  const [repositoryTimelines, setRepositoryTimelines] = useState<Record<string, RepositoryTimelineItem[]>>({});
  const [loadingTimelineRepoId, setLoadingTimelineRepoId] = useState<string | null>(null);
  const [savedFilterPresets, setSavedFilterPresets] = useState<RepositoryFilterPreset[]>(readSavedFilterPresets);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteOpenKey, setCommandPaletteOpenKey] = useState(0);
  const [report, setReport] = useState<ReportState>(null);
  const [pendingReportTitle, setPendingReportTitle] = useState<string | null>(null);
  const [ideaDetail, setIdeaDetail] = useState<IdeaListItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();
  const repositoryRequestKeyRef = useRef("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const languages = useMemo(
    () => initialData.repositoryFilterOptions.languages,
    [initialData.repositoryFilterOptions.languages]
  );
  const discoveryProfiles = useMemo(
    () => initialData.repositoryFilterOptions.discoveryProfiles,
    [initialData.repositoryFilterOptions.discoveryProfiles]
  );
  const filterPresets = useMemo(
    () => [...BUILT_IN_REPOSITORY_FILTER_PRESETS, ...savedFilterPresets],
    [savedFilterPresets]
  );
  const repositoryPageInput = useMemo<RepositoryPageInput>(
    () => ({
      tab: activeTab,
      query,
      status: statusFilter,
      language: languageFilter,
      profile: discoveryProfileFilter,
      minTrend,
      sortKey: repoSortKey,
      page: 1,
      pageSize: repositoryPage.pageSize
    }),
    [activeTab, discoveryProfileFilter, languageFilter, minTrend, query, repoSortKey, repositoryPage.pageSize, statusFilter]
  );
  const repositoryRequestKey = useMemo(() => JSON.stringify(repositoryPageInput), [repositoryPageInput]);
  const repositoryRefreshKey = useMemo(
    () =>
      [
        initialData.counts.all,
        initialData.counts.new,
        initialData.counts.saved,
        initialData.counts.read,
        initialData.counts.ignored,
        initialData.counts.old
      ].join(":"),
    [initialData.counts]
  );
  const hasActiveRepositoryFilters = Boolean(
    query.trim() ||
      statusFilter !== "ALL" ||
      languageFilter !== "ALL" ||
      discoveryProfileFilter !== "ALL" ||
      minTrend > 0 ||
      repoSortKey !== "trend_desc"
  );
  const switchToTab = useCallback((tabKey: TabKey) => {
    const tab = tabs.find((item) => item.key === tabKey);
    if (tab) {
      setActiveSection(tab.section);
    }
    setActiveTab(tabKey);
  }, []);
  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpenKey((current) => current + 1);
    setIsCommandPaletteOpen(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        openCommandPalette();
        return;
      }

      if (event.key === "/" && isRepositoryListTab(activeTab)) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const shortcuts: Partial<Record<string, TabKey>> = {
        "1": "radar",
        "2": "library",
        "3": "new",
        "4": "tasks",
        "5": "ideas",
        "6": "settings"
      };
      const shortcutTab = shortcuts[event.key];
      if (shortcutTab) {
        event.preventDefault();
        switchToTab(shortcutTab);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, openCommandPalette, switchToTab]);

  useEffect(() => {
    if (!isRepositoryListTab(activeTab)) {
      return;
    }

    let cancelled = false;
    repositoryRequestKeyRef.current = repositoryRequestKey;

    void Promise.resolve()
      .then(() => {
        if (cancelled) {
          return null;
        }

        setIsRepositoryPageLoading(true);
        setExpandedRepoId(null);
        return getRepositoryPageAction(repositoryPageInput);
      })
      .then((page) => {
        if (!cancelled && page && repositoryRequestKeyRef.current === repositoryRequestKey) {
          startTransition(() => setRepositoryPage(page));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac repozytoriow." });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRepositoryPageLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, repositoryPageInput, repositoryRefreshKey, repositoryRequestKey]);

  const candidates = useMemo(() => initialData.ideas.filter((idea) => idea.status === IDEA_STATUS.CANDIDATE), [initialData.ideas]);
  const fullIdeas = useMemo(() => initialData.ideas.filter((idea) => isFullIdeaStatus(idea.status)), [initialData.ideas]);
  const savedIdeas = useMemo(() => initialData.ideas.filter((idea) => idea.status === IDEA_STATUS.SAVED), [initialData.ideas]);
  const dismissedIdeas = useMemo(() => initialData.ideas.filter((idea) => idea.status === IDEA_STATUS.DISMISSED), [initialData.ideas]);
  const activeActionItemCount = useMemo(
    () => initialData.actionItems.filter((item) => item.status !== "DONE" && item.status !== "DISMISSED").length,
    [initialData.actionItems]
  );

  function runAction<T>(
    action: () => Promise<T>,
    success: string | ((result: T) => FeedbackState),
    pending = "Operacja w toku...",
    onSettled?: () => void
  ) {
    setFeedback({ tone: "info", message: pending });
    startTransition(async () => {
      try {
        const result = await action();
        setFeedback(typeof success === "function" ? success(result) : { tone: "success", message: success });
        router.refresh();
      } catch (error) {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Operacja nie powiodla sie." });
      } finally {
        onSettled?.();
      }
    });
  }

  function createWeeklyReport() {
    runAction(() => createWeeklyReportAction(), "Raport tygodniowy utworzony.", "Tworze raport tygodniowy...");
  }

  function openPortfolioBrief() {
    setPendingReportTitle("Tworze RepoRadar Brief");
    runAction(async () => {
      const generated = await createPortfolioBriefAction();
      setReport({
        title: generated.title,
        content: generated.contentMarkdown,
        path: generated.markdownPath,
        evidenceSources: []
      });
    }, "RepoRadar Brief utworzony.", "Tworze RepoRadar Brief...", () => setPendingReportTitle(null));
  }

  function runScan() {
    runAction(
      () => runScanAction(),
      (result) =>
        result.status === "FAILED"
          ? {
              tone: "error",
              message: result.errorMessage
                ? `Scan nie powiodl sie: ${result.errorMessage}`
                : "Scan nie powiodl sie. Sprawdz token GitHub, rate limit i logi skanu."
            }
          : { tone: "success", message: `Scan zakonczony. Zaktualizowano ${result.reposUpdated} repo.` },
      "Scan jest w toku..."
    );
  }

  function applyFilterPreset(preset: RepositoryFilterPreset) {
    setQuery(preset.query);
    setStatusFilter(preset.status);
    setLanguageFilter(preset.language);
    setDiscoveryProfileFilter(preset.profile);
    setMinTrend(preset.minTrend);
    setRepoSortKey(isRepoSortKey(preset.sortKey) ? preset.sortKey : "trend_desc");
  }

  function saveCurrentFilterPreset() {
    const label = window.prompt("Nazwa presetu filtrow:");
    if (!label?.trim()) {
      return;
    }

    const preset = createSavedFilterPreset(label, {
      query,
      status: statusFilter,
      language: languageFilter,
      profile: discoveryProfileFilter,
      minTrend,
      sortKey: repoSortKey
    });
    setSavedFilterPresets((current) => {
      const next = [preset, ...current].slice(0, 8);
      try {
        window.localStorage.setItem(FILTER_PRESET_STORAGE_KEY, serializeSavedFilterPresets(next));
        setFeedback({ tone: "success", message: "Preset filtrow zapisany lokalnie." });
      } catch {
        setFeedback({ tone: "info", message: "Preset dziala w tej sesji, ale nie udalo sie zapisac localStorage." });
      }
      return next;
    });
  }

  function searchRepositoriesFromCommand(searchQuery: string) {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    switchToTab("library");
    setQuery(trimmed);
    setStatusFilter("ALL");
    setLanguageFilter("ALL");
    setDiscoveryProfileFilter("ALL");
    setMinTrend(0);
    setRepoSortKey("trend_desc");
    setExpandedRepoId(null);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function toggleCompareRepository(repoId: string) {
    setSelectedCompareRepoIds((current) => {
      if (current.includes(repoId)) {
        return current.filter((id) => id !== repoId);
      }

      if (current.length >= 3) {
        setFeedback({ tone: "info", message: "Porownanie obsluguje maksymalnie 3 repo naraz." });
        return current;
      }

      return [...current, repoId];
    });
  }

  function findRepositoryForStatus(repoId: string) {
    return (
      repositoryPage.items.find((repo) => repo.id === repoId) ??
      initialData.repositories.find((repo) => repo.id === repoId) ??
      initialData.radarToday.topRepositories.find((repo) => repo.id === repoId) ??
      initialData.radarToday.newGems.find((repo) => repo.id === repoId) ??
      initialData.radarToday.highInitialMomentum.find((repo) => repo.id === repoId) ??
      initialData.radarToday.scanChanges.latestRepositories.find((repo) => repo.id === repoId)
    );
  }

  function updateRepositoryStatusWithUndo(repoId: string, nextStatus: string, success: string) {
    const repo = findRepositoryForStatus(repoId);
    const previousStatus = repo?.status;

    runAction(
      () => updateStatusAction(repoId, nextStatus),
      () => ({
        tone: "success",
        message: success,
        action:
          previousStatus && previousStatus !== nextStatus
            ? {
                label: "Cofnij",
                onClick: () =>
                  runAction(
                    () => updateStatusAction(repoId, previousStatus),
                    `Przywrocono status ${previousStatus}.`,
                    "Cofam zmiane statusu..."
                  )
              }
            : undefined
      }),
      "Zmieniam status repo..."
    );
  }

  function openReport(repoId: string, force = false) {
    setPendingReportTitle(force ? "Regeneruje pelny raport" : "Generuje pelny raport");
    runAction(async () => {
      const generated = await generateReportAction(repoId, force);
      setReport({
        title: generated.title,
        content: generated.contentMarkdown,
        path: generated.markdownPath,
        evidenceSources: generated.evidenceSources
      });
    }, force ? "Raport zostal zregenerowany." : "Raport jest gotowy.", force ? "Regeneruje raport..." : "Generuje raport...", () => setPendingReportTitle(null));
  }

  function openQuickBrief(repoId: string) {
    setPendingReportTitle("Tworze quick brief");
    runAction(async () => {
      const generated = await generateQuickBriefAction(repoId);
      setReport({
        title: generated.title,
        content: generated.contentMarkdown,
        path: generated.markdownPath,
        evidenceSources: []
      });
    }, "Quick brief jest gotowy.", "Tworze quick brief...", () => setPendingReportTitle(null));
  }

  function createRepoTask(repo: RepositoryListItem, type: string, title: string, success: string, priority = 1) {
    runAction(
      () =>
        createActionItemAction({
          type,
          title,
          repoId: repo.id,
          priority,
          dedupeKey: `repo:${repo.id}:${type.toLowerCase()}`
        }),
      success
    );
  }

  function resetRepoFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setLanguageFilter("ALL");
    setDiscoveryProfileFilter("ALL");
    setMinTrend(0);
    setRepoSortKey("trend_desc");
  }

  function toggleRepositoryDetails(repoId: string) {
    const shouldExpand = expandedRepoId !== repoId;
    setExpandedRepoId(shouldExpand ? repoId : null);

    if (!shouldExpand || repositoryTimelines[repoId]) {
      return;
    }

    setLoadingTimelineRepoId(repoId);
    void getRepositoryTimelineAction(repoId)
      .then((timeline) => {
        setRepositoryTimelines((current) => ({ ...current, [repoId]: timeline }));
      })
      .catch((error) => {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac timeline repo." });
      })
      .finally(() => {
        setLoadingTimelineRepoId((current) => (current === repoId ? null : current));
      });
  }

  function loadMoreRepositories() {
    if (isRepositoryPageLoading || !repositoryPage.hasMore) {
      return;
    }

    const requestKey = repositoryRequestKey;
    setIsRepositoryPageLoading(true);
    startTransition(() => {
      void getRepositoryPageAction({
        ...repositoryPageInput,
        page: repositoryPage.page + 1,
        pageSize: repositoryPage.pageSize
      })
        .then((nextPage) => {
          setRepositoryPage((current) =>
            repositoryRequestKeyRef.current === requestKey
              ? {
                  ...nextPage,
                  items: [...current.items, ...nextPage.items]
                }
              : current
          );
        })
        .catch((error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac kolejnych repozytoriow." });
        })
        .finally(() => setIsRepositoryPageLoading(false));
    });
  }

  function createManualTask() {
    runAction(
      () =>
        createActionItemAction({
          type: "CUSTOM",
          title: "Reczne zadanie do doprecyzowania",
          priority: 0
        }),
      "Zadanie dodane."
    );
  }

  function snoozeUntilTomorrow(itemId: string) {
    runAction(() => snoozeActionItemAction(itemId, getTomorrowIso()), "Zadanie odlozone do jutra.");
  }

  function openDailyBriefing() {
    setPendingReportTitle("Tworze briefing dzienny");
    runAction(async () => {
      const generated = await generateDailyBriefingAction();
      setReport({
        title: generated.title,
        content: generated.contentMarkdown,
        path: generated.markdownPath,
        evidenceSources: []
      });
    }, "Briefing dzienny utworzony.", "Tworze briefing dzienny...", () => setPendingReportTitle(null));
  }

  function downloadIdeasCsv() {
    setFeedback({ tone: "info", message: "Przygotowuje eksport CSV..." });
    startTransition(async () => {
      try {
        const exported = await exportIdeasCsvAction();
        const blob = new Blob([exported.content], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = exported.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setFeedback({ tone: "success", message: "CSV pomyslow przygotowany." });
      } catch (error) {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Eksport CSV nie powiodl sie." });
      }
    });
  }

  function pruneSnapshotsWithConfirmation() {
    if (!window.confirm("Usunac snapshoty starsze niz 180 dni? Te dane sa lokalne i nie beda odzyskane z historii.")) {
      return;
    }
    runAction(() => pruneOldSnapshotsAction({ daysToKeep: 180, confirmed: true }), "Stare snapshoty wyczyszczone.");
  }

  const topBarStats = [
    { label: "Nowe", value: initialData.counts.new },
    { label: "Hot", value: initialData.counts.hot },
    { label: "Kandydaci", value: initialData.counts.candidates },
    { label: "Pelne pomysly", value: initialData.counts.fullIdeas },
    { label: "Zadania", value: activeActionItemCount },
    { label: "Alerty", value: initialData.radarToday.alerts.length }
  ];
  const lastScanDescription = initialData.lastScan
    ? `Ostatni scan: ${formatDate(initialData.lastScan.startedAt)} | ${initialData.lastScan.status} | ${initialData.lastScan.reposUpdated} repo`
    : "Ostatni scan: brak skanu";
  const currentTab = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const navigationCounts: Partial<Record<TabKey, number>> = {
    new: initialData.counts.new,
    tasks: activeActionItemCount
  };

  return (
    <AppShell
      activeSection={activeSection}
      activeTab={activeTab}
      counts={navigationCounts}
      onSectionChange={setActiveSection}
      onTabChange={setActiveTab}
    >
      <TopBar
        title={getTabLabel(currentTab)}
        description={lastScanDescription}
        feedback={feedback}
        stats={topBarStats}
        actions={
          <>
            <Button variant="secondary" onClick={openCommandPalette} disabled={isPending}>
              <Command className="h-4 w-4" />
              Komendy
            </Button>
            <Button onClick={runScan} disabled={isPending}>
              <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
              Uruchom scan
            </Button>
            <Button variant="secondary" onClick={openDailyBriefing} disabled={isPending}>
              <CalendarClock className="h-4 w-4" />
              Briefing dzienny
            </Button>
            <Button variant="secondary" onClick={downloadIdeasCsv} disabled={isPending}>
              <Download className="h-4 w-4" />
              Eksport CSV
            </Button>
            <Button variant="secondary" onClick={openPortfolioBrief} disabled={isPending}>
              <FileText className="h-4 w-4" />
              RepoRadar Brief
            </Button>
            <Button
              variant="secondary"
              onClick={createWeeklyReport}
              disabled={isPending}
            >
              <FileText className="h-4 w-4" />
              Raport tygodniowy
            </Button>
          </>
        }
      />

      <CommandPalette
        key={commandPaletteOpenKey}
        isOpen={isCommandPaletteOpen}
        repositories={initialData.repositories}
        isPending={isPending}
        onClose={() => setIsCommandPaletteOpen(false)}
        onRunScan={runScan}
        onOpenTab={switchToTab}
        onCreateWeeklyReport={createWeeklyReport}
        onCreatePortfolioBrief={openPortfolioBrief}
        onDownloadIdeasCsv={downloadIdeasCsv}
        onSearchRepositories={searchRepositoriesFromCommand}
      />

      {activeTab === "radar" ? (
        <RadarTodayView
          radarToday={initialData.radarToday}
          isPending={isPending}
          onOpenLibrary={() => setActiveTab("library")}
          onOpenReport={openReport}
          onOpenQuickBrief={openQuickBrief}
          onCreateReadmeTask={(repo) => createRepoTask(repo, "READ_README", `Przeczytaj README: ${repo.fullName}`, "Zadanie README dodane.")}
          onCreateManualTask={createManualTask}
          onOpenCandidate={setIdeaDetail}
          onPromoteCandidate={(ideaId) => runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.")}
          onOpenTasks={() => setActiveTab("tasks")}
          onOpenSettings={() => setActiveTab("settings")}
          onRunScan={runScan}
          renderActionItem={(item) => (
            <RepoActionItemCard
              key={item.id}
              item={item}
              isPending={isPending}
              onComplete={() => runAction(() => completeActionItemAction(item.id), "Zadanie zakonczone.")}
              onSnooze={() => snoozeUntilTomorrow(item.id)}
              onDismiss={() => runAction(() => dismissActionItemAction(item.id), "Zadanie odrzucone.")}
            />
          )}
        />
      ) : null}

      {activeTab === "tasks" ? (
        <TasksView
          items={initialData.actionItems}
          isPending={isPending}
          onCreateManualTask={createManualTask}
          onComplete={(itemId) => runAction(() => completeActionItemAction(itemId), "Zadanie zakonczone.")}
          onSnooze={snoozeUntilTomorrow}
          onDismiss={(itemId) => runAction(() => dismissActionItemAction(itemId), "Zadanie odrzucone.")}
        />
      ) : null}

      {activeTab !== "radar" &&
      activeTab !== "tasks" &&
      activeTab !== "ideas" &&
      activeTab !== "candidates" &&
      activeTab !== "savedIdeas" &&
      activeTab !== "dismissedIdeas" &&
      activeTab !== "weekly" &&
      activeTab !== "settings" ? (
        <RepoListView
          repositories={repositoryPage.items}
          filterBar={
            <RepoFilterBar
              query={query}
              status={statusFilter}
              language={languageFilter}
              profile={discoveryProfileFilter}
              minTrend={minTrend}
              sortKey={repoSortKey}
              languages={languages}
              profiles={discoveryProfiles}
              presets={filterPresets}
              resultCount={repositoryPage.items.length}
              totalCount={repositoryPage.total}
              searchInputRef={searchInputRef}
              onQueryChange={setQuery}
              onStatusChange={setStatusFilter}
              onLanguageChange={setLanguageFilter}
              onProfileChange={setDiscoveryProfileFilter}
              onMinTrendChange={setMinTrend}
              onSortChange={setRepoSortKey}
              onApplyPreset={applyFilterPreset}
              onSavePreset={saveCurrentFilterPreset}
              onReset={resetRepoFilters}
            />
          }
          sortKey={repoSortKey}
          totalCount={repositoryPage.total}
          hasMore={repositoryPage.hasMore}
          onLoadMore={loadMoreRepositories}
          expandedRepoId={expandedRepoId}
          timelines={repositoryTimelines}
          loadingTimelineRepoId={loadingTimelineRepoId}
          selectedCompareRepoIds={selectedCompareRepoIds}
          showInbox={activeTab === "new"}
          hasActiveFilters={hasActiveRepositoryFilters}
          isLoading={isRepositoryPageLoading}
          isPending={isPending || isRepositoryPageLoading}
          onRunScan={runScan}
          onResetFilters={resetRepoFilters}
          onToggleCompare={toggleCompareRepository}
          onRemoveCompare={(repoId) => setSelectedCompareRepoIds((current) => current.filter((id) => id !== repoId))}
          onClearCompare={() => setSelectedCompareRepoIds([])}
          callbacks={{
            onToggle: toggleRepositoryDetails,
            onOpenReport: (repoId) => openReport(repoId),
            onRegenerateReport: (repoId) => openReport(repoId, true),
            onSave: (repoId) => updateRepositoryStatusWithUndo(repoId, "SAVED", "Repo zapisane."),
            onMarkRead: (repoId) => updateRepositoryStatusWithUndo(repoId, "READ", "Repo oznaczone jako przeczytane."),
            onOpenQuickBrief: (repoId) => openQuickBrief(repoId),
            onGenerateIdea: (repoId) => runAction(() => generateIdeaAction(repoId), "Pomysl zostal utworzony.", "Tworze pomysl z repo..."),
            onResearch: (repoId) => runAction(() => generateOpportunityCandidateAction(repoId), "Research light zakonczony.", "Research light w toku..."),
            onAddInboxTask: (repo) => createRepoTask(repo, "READ_README", `Przejrzyj nowe repo: ${repo.fullName}`, "Zadanie inbox dodane.", 2),
            onAddCloneTask: (repo) => createRepoTask(repo, "CLONE_LATER", `Clone later: ${repo.fullName}`, "Zadanie clone later dodane.", 1),
            onAddDemoTask: (repo) => createRepoTask(repo, "CHECK_DEMO", `Sprawdz demo: ${repo.fullName}`, "Zadanie demo dodane.", 2),
            onValidateMarket: (repo) =>
              createRepoTask(repo, "VALIDATE_MARKET", `Zweryfikuj rynek: ${repo.fullName}`, "Zadanie walidacji rynku dodane.", 3),
            onIgnore: (repoId) => updateRepositoryStatusWithUndo(repoId, "IGNORED", "Repo przeniesione do ignorowanych.")
          }}
        />
      ) : null}

      {activeTab === "candidates" ? (
        <IdeasView
          mode="candidates"
          ideas={candidates}
          isPending={isPending}
          emptyTitle="Brak kandydatow"
          emptyText="Uzyj akcji Znajdz okazje przy repo albo wlacz auto opportunity research w .env."
          onPromote={(ideaId) => runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.")}
          onSave={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Kandydat zapisany.")}
          onDismiss={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Kandydat odrzucony.")}
          onRestore={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.")}
          onOpenDetail={setIdeaDetail}
        />
      ) : null}

      {activeTab === "savedIdeas" ? (
        <IdeasView
          mode="saved"
          ideas={savedIdeas}
          isPending={isPending}
          emptyTitle="Brak zapisanych pomyslow"
          emptyText="Zapisane kandydaty i pomysly pojawia sie tutaj."
          onPromote={(ideaId) => runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.")}
          onSave={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Pomysl zapisany.")}
          onDismiss={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.")}
          onRestore={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.")}
          onOpenDetail={setIdeaDetail}
        />
      ) : null}

      {activeTab === "dismissedIdeas" ? (
        <IdeasView
          mode="dismissed"
          ideas={dismissedIdeas}
          isPending={isPending}
          emptyTitle="Brak odrzuconych pomyslow"
          emptyText="Odrzucone kandydaty nie beda automatycznie odtwarzane bez force."
          onPromote={(ideaId) => runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.")}
          onSave={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Pomysl zapisany.")}
          onDismiss={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.")}
          onRestore={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.")}
          onOpenDetail={setIdeaDetail}
        />
      ) : null}

      {activeTab === "ideas" ? (
        <IdeasView
          mode="full"
          ideas={fullIdeas}
          isPending={isPending}
          emptyTitle="Brak pomyslow"
          emptyText="Uzyj akcji Utworz pomysl z repo przy wybranym repozytorium."
          onPromote={(ideaId) => runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.")}
          onSave={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Pomysl zapisany.")}
          onDismiss={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.")}
          onRestore={(ideaId) => runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.")}
          onOpenDetail={setIdeaDetail}
          renderEvidence={(idea) => <EvidenceSources sources={idea.evidenceSources} emptyText="Brak zapisanych zrodel dla tego pomyslu." />}
        />
      ) : null}

      {activeTab === "weekly" ? <WeeklyReportsView reports={initialData.weeklyReports} /> : null}

      {activeTab === "settings" ? (
        <SettingsView
          settingsSummary={initialData.settingsSummary}
          notificationSummary={initialData.notificationSummary}
          isPending={isPending}
          onSaveSetting={(key, value) => runAction(() => updateSettingAction(key, String(value)), "Ustawienie zapisane.")}
          onClearExpiredExternalCache={() => runAction(() => clearExpiredExternalCacheAction(), "Wygasly cache wyczyszczony.")}
          onClearOldNotificationLogs={() => runAction(() => clearOldNotificationLogsAction(30), "Stare logi powiadomien wyczyszczone.")}
          onTestNotification={() => runAction(() => testNotificationAction(), "Test notification wykonany.")}
          onOpenDailyBriefing={openDailyBriefing}
          onDownloadIdeasCsv={downloadIdeasCsv}
          onPruneSnapshots={pruneSnapshotsWithConfirmation}
        />
      ) : null}

      {ideaDetail ? (
        <IdeaDetailDialog
          idea={ideaDetail}
          isPending={isPending}
          evidence={<EvidenceSources sources={ideaDetail.evidenceSources} emptyText="Brak zapisanych zrodel dla tego kandydata." />}
          onClose={() => setIdeaDetail(null)}
          onPromote={() => runAction(() => promoteCandidateToFullIdeaAction(ideaDetail.id), "Pelny pomysl zostal utworzony.")}
          onSave={() => runAction(() => updateIdeaStatusAction(ideaDetail.id, IDEA_STATUS.SAVED), "Pomysl zapisany.")}
          onDismiss={() => runAction(() => updateIdeaStatusAction(ideaDetail.id, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.")}
        />
      ) : null}

      {pendingReportTitle && !report ? (
        <ReportLoadingDialog title={pendingReportTitle} onClose={() => setPendingReportTitle(null)} />
      ) : null}

      {report ? (
        <DialogShell titleId="repo-report-dialog-title" onClose={() => setReport(null)} className="max-w-5xl">
          <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-border-subtle bg-surface-overlay pb-4">
            <div>
              <h2 id="repo-report-dialog-title" className="text-xl font-semibold">
                {report.title}
              </h2>
              {report.path ? <p className="text-sm text-muted-foreground">Zapisano: {report.path}</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Druk/PDF
              </Button>
              <Button variant="secondary" onClick={() => setReport(null)}>
                Zamknij
              </Button>
            </div>
          </div>
          <ReportView content={report.content} sources={report.evidenceSources} />
        </DialogShell>
      ) : null}
    </AppShell>
  );
}

function EvidenceSources({ sources, emptyText }: { sources: EvidenceSourceItem[]; emptyText: string }) {
  return <EvidencePanel sources={sources} emptyText={emptyText} />;
}

function ReportLoadingDialog({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <DialogShell titleId="repo-report-loading-title" onClose={onClose} className="max-w-4xl">
      <div className="border-b border-border-subtle pb-4">
        <h2 id="repo-report-loading-title" className="text-xl font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Przygotowuje tresc, sekcje i lokalny zapis raportu...</p>
      </div>
      <div className="mt-5 space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
        </div>
        <section className="rounded-md border border-border-subtle bg-surface-panel p-4">
          <SkeletonBlock className="h-5 w-56" />
          <SkeletonText lines={5} className="mt-4" />
        </section>
        <section className="rounded-md border border-border-subtle bg-surface-panel p-4">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonText lines={4} className="mt-4" />
        </section>
      </div>
    </DialogShell>
  );
}
