"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Command, Printer, RefreshCw } from "lucide-react";
import type {
  DashboardData,
  EvidenceSourceItem,
  IdeaListItem,
  IdeasPanelData,
  RepositoryListItem,
  SettingsPanelData,
  TasksPanelData,
  WeeklyReportsPanelData
} from "@/types/repository";
import {
  clearExpiredExternalCacheAction,
  clearOldNotificationLogsAction,
  completeActionItemAction,
  createActionItemAction,
  dismissActionItemAction,
  exportIdeasCsvAction,
  createPortfolioBriefAction,
  generateQuickBriefAction,
  generateDailyBriefingAction,
  createWeeklyReportAction,
  generateIdeaAction,
  generateOpportunityCandidateAction,
  generateShortSummaryAction,
  getIdeasPanelDataAction,
  getSettingsPanelDataAction,
  getTasksPanelDataAction,
  getWeeklyReportsPanelDataAction,
  promoteCandidateToFullIdeaAction,
  pruneOldSnapshotsAction,
  generateReportAction,
  runScanAction,
  snoozeActionItemAction,
  testNotificationAction,
  updateIdeaStatusAction,
  updateSettingAction
} from "@/app/actions";
import { IDEA_STATUS, isFullIdeaStatus } from "@/types/idea-status";
import { cn, formatDate } from "@/lib/utils";
import { AppShell } from "@/components/repo-radar/app-shell";
import { TopBar } from "@/components/repo-radar/top-bar";
import { RadarTodayView } from "@/components/repo-radar/radar-today-view";
import { RepoListView } from "@/components/repo-radar/repo-list-view";
import { RepoFilterBar } from "@/components/repo-radar/repo-filter-bar";
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
import { Badge, Button, DialogShell, SectionCard, SkeletonBlock, SkeletonText } from "@/components/repo-radar/ui";
import { useFeedbackAction } from "@/components/repo-radar/hooks/use-feedback-action";
import { isRepositoryListTab, useRepositoryBrowser } from "@/components/repo-radar/hooks/use-repository-browser";

type ReportState = {
  title: string;
  content: string;
  path: string | null;
  evidenceSources: EvidenceSourceItem[];
} | null;

function getTomorrowIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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

function isIdeasPanelTab(tab: TabKey) {
  return tab === "candidates" || tab === "ideas" || tab === "savedIdeas" || tab === "dismissedIdeas";
}

function buildPruneSnapshotsConfirmation(snapshotPreview?: SettingsPanelData["settingsSummary"]["maintenancePreview"]["snapshots"]) {
  if (!snapshotPreview) {
    return "Usunac snapshoty starsze niz 180 dni? Te dane sa lokalne i nie beda odzyskane z historii.";
  }

  const losingHistory =
    snapshotPreview.repositoriesLosingAllSnapshots > 0
      ? `${snapshotPreview.repositoriesLosingAllSnapshots} repo straci wszystkie snapshoty.`
      : "Zadne repo nie powinno stracic calej historii snapshotow.";

  return [
    `Usunac snapshoty starsze niz ${snapshotPreview.daysToKeep} dni? Te dane sa lokalne i nie beda odzyskane z historii.`,
    "",
    `Dry-run: ${snapshotPreview.oldEntries} snapshotow z ${snapshotPreview.affectedRepositories} repo.`,
    losingHistory
  ].join("\n");
}

export function RepoRadarApp({ initialData }: { initialData: DashboardData }) {
  const [activeSection, setActiveSection] = useState<SectionKey>("repo");
  const [activeTab, setActiveTab] = useState<TabKey>("radar");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteOpenKey, setCommandPaletteOpenKey] = useState(0);
  const [report, setReport] = useState<ReportState>(null);
  const [pendingReportTitle, setPendingReportTitle] = useState<string | null>(null);
  const [ideaDetail, setIdeaDetail] = useState<IdeaListItem | null>(null);
  const [ideasPanelData, setIdeasPanelData] = useState<IdeasPanelData | null>(null);
  const [isIdeasPanelLoading, setIsIdeasPanelLoading] = useState(false);
  const [hasTriedIdeasPanelLoad, setHasTriedIdeasPanelLoad] = useState(false);
  const [tasksPanelData, setTasksPanelData] = useState<TasksPanelData | null>(null);
  const [isTasksPanelLoading, setIsTasksPanelLoading] = useState(false);
  const [hasTriedTasksPanelLoad, setHasTriedTasksPanelLoad] = useState(false);
  const [weeklyReportsPanelData, setWeeklyReportsPanelData] = useState<WeeklyReportsPanelData | null>(null);
  const [isWeeklyReportsPanelLoading, setIsWeeklyReportsPanelLoading] = useState(false);
  const [hasTriedWeeklyReportsPanelLoad, setHasTriedWeeklyReportsPanelLoad] = useState(false);
  const [settingsPanelData, setSettingsPanelData] = useState<SettingsPanelData | null>(null);
  const [isSettingsPanelLoading, setIsSettingsPanelLoading] = useState(false);
  const [hasTriedSettingsPanelLoad, setHasTriedSettingsPanelLoad] = useState(false);
  const { feedback, isPending, runAction, setFeedback, startTransition } = useFeedbackAction();
  const switchToTab = useCallback((tabKey: TabKey) => {
    const tab = tabs.find((item) => item.key === tabKey);
    if (tab) {
      setActiveSection(tab.section);
    }
    setActiveTab(tabKey);
  }, []);
  const {
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    languageFilter,
    setLanguageFilter,
    discoveryProfileFilter,
    setDiscoveryProfileFilter,
    minTrend,
    setMinTrend,
    repoSortKey,
    setRepoSortKey,
    repositoryPage,
    isRepositoryPageLoading,
    expandedRepoId,
    selectedCompareRepoIds,
    repositoryTimelines,
    loadingTimelineRepoId,
    repositoryDecisionContexts,
    loadingDecisionContextRepoId,
    repositoryDecisionContextErrors,
    refreshRepositoryDecisionContext,
    searchInputRef,
    languages,
    discoveryProfiles,
    filterPresets,
    hasActiveRepositoryFilters,
    applyFilterPreset,
    saveCurrentFilterPreset,
    searchRepositoriesFromCommand,
    toggleCompareRepository,
    removeCompareRepository,
    clearCompareRepositories,
    updateRepositoryStatusWithUndo,
    resetRepoFilters,
    toggleRepositoryDetails,
    loadMoreRepositories
  } = useRepositoryBrowser({
    initialData,
    activeTab,
    switchToTab,
    runAction,
    setFeedback,
    startTransition
  });
  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpenKey((current) => current + 1);
    setIsCommandPaletteOpen(true);
  }, []);

  const loadIdeasPanelData = useCallback(() => {
    setHasTriedIdeasPanelLoad(true);
    setIsIdeasPanelLoading(true);
    startTransition(async () => {
      try {
        const data = await getIdeasPanelDataAction();
        setIdeasPanelData(data);
      } catch (error) {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac pomyslow." });
      } finally {
        setIsIdeasPanelLoading(false);
      }
    });
  }, [setFeedback, startTransition]);

  const loadTasksPanelData = useCallback(() => {
    setHasTriedTasksPanelLoad(true);
    setIsTasksPanelLoading(true);
    startTransition(async () => {
      try {
        const data = await getTasksPanelDataAction();
        setTasksPanelData(data);
      } catch (error) {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac zadan." });
      } finally {
        setIsTasksPanelLoading(false);
      }
    });
  }, [setFeedback, startTransition]);

  const loadWeeklyReportsPanelData = useCallback(() => {
    setHasTriedWeeklyReportsPanelLoad(true);
    setIsWeeklyReportsPanelLoading(true);
    startTransition(async () => {
      try {
        const data = await getWeeklyReportsPanelDataAction();
        setWeeklyReportsPanelData(data);
      } catch (error) {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac raportow tygodniowych." });
      } finally {
        setIsWeeklyReportsPanelLoading(false);
      }
    });
  }, [setFeedback, startTransition]);

  const loadSettingsPanelData = useCallback(() => {
    setHasTriedSettingsPanelLoad(true);
    setIsSettingsPanelLoading(true);
    startTransition(async () => {
      try {
        const data = await getSettingsPanelDataAction();
        setSettingsPanelData(data);
      } catch (error) {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac ustawien." });
      } finally {
        setIsSettingsPanelLoading(false);
      }
    });
  }, [setFeedback, startTransition]);

  const refreshSettingsPanelDataIfOpen = useCallback(() => {
    if (activeTab === "settings") {
      loadSettingsPanelData();
    }
  }, [activeTab, loadSettingsPanelData]);

  const refreshIdeasPanelDataIfLoaded = useCallback(() => {
    if (ideasPanelData || isIdeasPanelTab(activeTab)) {
      loadIdeasPanelData();
    }
  }, [activeTab, ideasPanelData, loadIdeasPanelData]);

  const refreshTasksPanelDataIfLoaded = useCallback(() => {
    if (tasksPanelData || activeTab === "tasks") {
      loadTasksPanelData();
    }
  }, [activeTab, loadTasksPanelData, tasksPanelData]);

  const refreshWeeklyReportsPanelDataIfLoaded = useCallback(() => {
    if (weeklyReportsPanelData || activeTab === "weekly") {
      loadWeeklyReportsPanelData();
    }
  }, [activeTab, loadWeeklyReportsPanelData, weeklyReportsPanelData]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        openCommandPalette();
        return;
      }

      if (isEditableTarget(event.target)) {
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
  }, [activeTab, openCommandPalette, searchInputRef, switchToTab]);

  useEffect(() => {
    if (isIdeasPanelTab(activeTab) && !ideasPanelData && !isIdeasPanelLoading && !hasTriedIdeasPanelLoad) {
      const timeoutId = window.setTimeout(loadIdeasPanelData, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeTab, hasTriedIdeasPanelLoad, ideasPanelData, isIdeasPanelLoading, loadIdeasPanelData]);

  useEffect(() => {
    if (activeTab === "tasks" && !tasksPanelData && !isTasksPanelLoading && !hasTriedTasksPanelLoad) {
      const timeoutId = window.setTimeout(loadTasksPanelData, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeTab, hasTriedTasksPanelLoad, isTasksPanelLoading, loadTasksPanelData, tasksPanelData]);

  useEffect(() => {
    if (activeTab === "weekly" && !weeklyReportsPanelData && !isWeeklyReportsPanelLoading && !hasTriedWeeklyReportsPanelLoad) {
      const timeoutId = window.setTimeout(loadWeeklyReportsPanelData, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [
    activeTab,
    hasTriedWeeklyReportsPanelLoad,
    isWeeklyReportsPanelLoading,
    loadWeeklyReportsPanelData,
    weeklyReportsPanelData
  ]);

  useEffect(() => {
    if (activeTab === "settings" && !settingsPanelData && !isSettingsPanelLoading && !hasTriedSettingsPanelLoad) {
      const timeoutId = window.setTimeout(loadSettingsPanelData, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeTab, hasTriedSettingsPanelLoad, isSettingsPanelLoading, loadSettingsPanelData, settingsPanelData]);

  const panelIdeas = ideasPanelData?.ideas ?? [];
  const panelActionItems = tasksPanelData?.actionItems ?? [];
  const candidates = useMemo(() => panelIdeas.filter((idea) => idea.status === IDEA_STATUS.CANDIDATE), [panelIdeas]);
  const fullIdeas = useMemo(() => panelIdeas.filter((idea) => isFullIdeaStatus(idea.status)), [panelIdeas]);
  const savedIdeas = useMemo(() => panelIdeas.filter((idea) => idea.status === IDEA_STATUS.SAVED), [panelIdeas]);
  const dismissedIdeas = useMemo(() => panelIdeas.filter((idea) => idea.status === IDEA_STATUS.DISMISSED), [panelIdeas]);
  const activeActionItemCount = initialData.counts.actionItems;

  function createWeeklyReport() {
    runAction(
      () => createWeeklyReportAction(),
      "Raport tygodniowy utworzony.",
      "Tworze raport tygodniowy...",
      refreshWeeklyReportsPanelDataIfLoaded
    );
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
      "Scan jest w toku...",
      refreshSettingsPanelDataIfOpen
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
    }, force ? "Raport zostal zregenerowany." : "Raport jest gotowy.", force ? "Regeneruje raport..." : "Generuje raport...", () => {
      setPendingReportTitle(null);
      refreshSettingsPanelDataIfOpen();
      refreshRepositoryDecisionContext(repoId);
    });
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
    }, "Quick brief jest gotowy.", "Tworze quick brief...", () => {
      setPendingReportTitle(null);
      refreshRepositoryDecisionContext(repoId);
    });
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
      success,
      "Operacja w toku...",
      () => {
        refreshTasksPanelDataIfLoaded();
        refreshRepositoryDecisionContext(repo.id);
      }
    );
  }

  function createManualTask() {
    runAction(
      () =>
        createActionItemAction({
          type: "CUSTOM",
          title: "Reczne zadanie do doprecyzowania",
          priority: 0
        }),
      "Zadanie dodane.",
      "Operacja w toku...",
      refreshTasksPanelDataIfLoaded
    );
  }

  function refreshDecisionContextForTask(itemId: string) {
    const item = panelActionItems.find((candidate) => candidate.id === itemId) ?? initialData.radarToday.actionItems.find((candidate) => candidate.id === itemId);

    if (item?.repoId) {
      refreshRepositoryDecisionContext(item.repoId);
    }
  }

  function refreshTasksAndDecisionContextForTask(itemId: string) {
    refreshTasksPanelDataIfLoaded();
    refreshDecisionContextForTask(itemId);
  }

  function completeTask(itemId: string) {
    runAction(() => completeActionItemAction(itemId), "Zadanie zakonczone.", undefined, () => refreshTasksAndDecisionContextForTask(itemId));
  }

  function dismissTask(itemId: string) {
    runAction(() => dismissActionItemAction(itemId), "Zadanie odrzucone.", undefined, () => refreshTasksAndDecisionContextForTask(itemId));
  }

  function snoozeUntilTomorrow(itemId: string) {
    runAction(() => snoozeActionItemAction(itemId, getTomorrowIso()), "Zadanie odlozone do jutra.", undefined, () => refreshTasksAndDecisionContextForTask(itemId));
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
    const snapshotPreview = settingsPanelData?.settingsSummary.maintenancePreview.snapshots;
    if (!window.confirm(buildPruneSnapshotsConfirmation(snapshotPreview))) {
      return;
    }
    runAction(
      () => pruneOldSnapshotsAction({ daysToKeep: 180, confirmed: true }),
      "Stare snapshoty wyczyszczone.",
      "Czyszcze stare snapshoty...",
      refreshSettingsPanelDataIfOpen
    );
  }

  function retryAiJob(job: SettingsPanelData["settingsSummary"]["recentAiJobs"][number]) {
    if (!job.repoId) {
      return;
    }

    switch (job.type) {
      case "REPORT":
        openReport(job.repoId, true);
        return;
      case "IDEA":
        runAction(
          () => generateIdeaAction(job.repoId!, true),
          "Pomysl zostal ponowiony.",
          "Ponawiam pomysl z repo...",
          () => {
            refreshIdeasPanelDataIfLoaded();
            refreshSettingsPanelDataIfOpen();
          }
        );
        return;
      case "RESEARCH":
        runAction(
          () => generateOpportunityCandidateAction(job.repoId!, true),
          "Research zostal ponowiony.",
          "Ponawiam research...",
          () => {
            refreshIdeasPanelDataIfLoaded();
            refreshSettingsPanelDataIfOpen();
          }
        );
        return;
      case "SUMMARY":
        runAction(
          () => generateShortSummaryAction(job.repoId!, true),
          "Streszczenie zostalo ponowione.",
          "Ponawiam streszczenie...",
          refreshSettingsPanelDataIfOpen
        );
        return;
      default:
        return;
    }
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
  const isIdeasViewLoading = isIdeasPanelLoading || (isIdeasPanelTab(activeTab) && !ideasPanelData && !hasTriedIdeasPanelLoad);
  const isTasksViewLoading = isTasksPanelLoading || (activeTab === "tasks" && !tasksPanelData && !hasTriedTasksPanelLoad);
  const isWeeklyReportsViewLoading =
    isWeeklyReportsPanelLoading || (activeTab === "weekly" && !weeklyReportsPanelData && !hasTriedWeeklyReportsPanelLoad);
  const isSettingsViewLoading = isSettingsPanelLoading || (activeTab === "settings" && !settingsPanelData && !hasTriedSettingsPanelLoad);

  return (
    <AppShell
      activeSection={activeSection}
      activeTab={activeTab}
      counts={navigationCounts}
      onSectionChange={setActiveSection}
      onTabChange={setActiveTab}
    >
      <div className={report ? "print-hidden" : undefined}>
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
                <kbd aria-hidden="true" className="ml-1 rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Ctrl K
                </kbd>
              </Button>
              <Button onClick={runScan} disabled={isPending}>
                <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                Uruchom scan
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
          onOpenDailyBriefing={openDailyBriefing}
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
          onPromoteCandidate={(ideaId) =>
            runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.", undefined, refreshIdeasPanelDataIfLoaded)
          }
          onOpenTasks={() => setActiveTab("tasks")}
          onOpenSettings={() => setActiveTab("settings")}
          onRunScan={runScan}
          renderActionItem={(item) => (
            <RepoActionItemCard
              key={item.id}
              item={item}
              isPending={isPending}
              onComplete={() => completeTask(item.id)}
              onSnooze={() => snoozeUntilTomorrow(item.id)}
              onDismiss={() => dismissTask(item.id)}
            />
          )}
        />
      ) : null}

      {activeTab === "tasks" ? (
        tasksPanelData ? (
          <TasksView
            items={panelActionItems}
            isPending={isPending}
            onCreateManualTask={createManualTask}
            onComplete={completeTask}
            onSnooze={snoozeUntilTomorrow}
            onDismiss={dismissTask}
          />
        ) : (
          <LazyPanelState
            title="Kolejka akcji"
            loadingText="Pobieram pelna kolejke zadan..."
            errorText="Nie udalo sie zaladowac pelnej kolejki zadan."
            isLoading={isTasksViewLoading}
            isPending={isPending}
            onRetryLoad={loadTasksPanelData}
          />
        )
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
          totalCount={repositoryPage.total}
          hasMore={repositoryPage.hasMore}
          onLoadMore={loadMoreRepositories}
          expandedRepoId={expandedRepoId}
          timelines={repositoryTimelines}
          loadingTimelineRepoId={loadingTimelineRepoId}
          decisionContexts={repositoryDecisionContexts}
          loadingDecisionContextRepoId={loadingDecisionContextRepoId}
          decisionContextErrors={repositoryDecisionContextErrors}
          selectedCompareRepoIds={selectedCompareRepoIds}
          showInbox={activeTab === "new"}
          hasActiveFilters={hasActiveRepositoryFilters}
          isLoading={isRepositoryPageLoading}
          isPending={isPending || isRepositoryPageLoading}
          onRunScan={runScan}
          onResetFilters={resetRepoFilters}
          onToggleCompare={toggleCompareRepository}
          onRemoveCompare={removeCompareRepository}
          onClearCompare={clearCompareRepositories}
          callbacks={{
            onToggle: toggleRepositoryDetails,
            onOpenReport: (repoId) => openReport(repoId),
            onRegenerateReport: (repoId) => openReport(repoId, true),
            onSave: (repoId) => updateRepositoryStatusWithUndo(repoId, "SAVED", "Repo zapisane."),
            onMarkRead: (repoId) => updateRepositoryStatusWithUndo(repoId, "READ", "Repo oznaczone jako przeczytane."),
            onOpenQuickBrief: (repoId) => openQuickBrief(repoId),
            onGenerateIdea: (repoId) =>
              runAction(() => generateIdeaAction(repoId), "Pomysl zostal utworzony.", "Tworze pomysl z repo...", refreshIdeasPanelDataIfLoaded),
            onResearch: (repoId) =>
              runAction(
                () => generateOpportunityCandidateAction(repoId),
                "Research light zakonczony.",
                "Research light w toku...",
                () => {
                  refreshIdeasPanelDataIfLoaded();
                  refreshRepositoryDecisionContext(repoId);
                }
              ),
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
        ideasPanelData ? (
          <IdeasView
            mode="candidates"
            ideas={candidates}
            isPending={isPending}
            emptyTitle="Brak kandydatow"
            emptyText="Uzyj akcji Znajdz okazje przy repo albo wlacz auto opportunity research w .env."
            onPromote={(ideaId) =>
              runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onSave={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Kandydat zapisany.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onDismiss={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Kandydat odrzucony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onRestore={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onOpenDetail={setIdeaDetail}
          />
        ) : (
          <LazyPanelState
            title="Kandydaci"
            loadingText="Pobieram pelna liste pomyslow..."
            errorText="Nie udalo sie zaladowac pomyslow."
            isLoading={isIdeasViewLoading}
            isPending={isPending}
            onRetryLoad={loadIdeasPanelData}
          />
        )
      ) : null}

      {activeTab === "savedIdeas" ? (
        ideasPanelData ? (
          <IdeasView
            mode="saved"
            ideas={savedIdeas}
            isPending={isPending}
            emptyTitle="Brak zapisanych pomyslow"
            emptyText="Zapisane kandydaty i pomysly pojawia sie tutaj."
            onPromote={(ideaId) =>
              runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onSave={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Pomysl zapisany.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onDismiss={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onRestore={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onOpenDetail={setIdeaDetail}
          />
        ) : (
          <LazyPanelState
            title="Zapisane pomysly"
            loadingText="Pobieram pelna liste pomyslow..."
            errorText="Nie udalo sie zaladowac pomyslow."
            isLoading={isIdeasViewLoading}
            isPending={isPending}
            onRetryLoad={loadIdeasPanelData}
          />
        )
      ) : null}

      {activeTab === "dismissedIdeas" ? (
        ideasPanelData ? (
          <IdeasView
            mode="dismissed"
            ideas={dismissedIdeas}
            isPending={isPending}
            emptyTitle="Brak odrzuconych pomyslow"
            emptyText="Odrzucone kandydaty nie beda automatycznie odtwarzane bez force."
            onPromote={(ideaId) =>
              runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onSave={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Pomysl zapisany.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onDismiss={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onRestore={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onOpenDetail={setIdeaDetail}
          />
        ) : (
          <LazyPanelState
            title="Odrzucone pomysly"
            loadingText="Pobieram pelna liste pomyslow..."
            errorText="Nie udalo sie zaladowac pomyslow."
            isLoading={isIdeasViewLoading}
            isPending={isPending}
            onRetryLoad={loadIdeasPanelData}
          />
        )
      ) : null}

      {activeTab === "ideas" ? (
        ideasPanelData ? (
          <IdeasView
            mode="full"
            ideas={fullIdeas}
            isPending={isPending}
            emptyTitle="Brak pomyslow"
            emptyText="Uzyj akcji Utworz pomysl z repo przy wybranym repozytorium."
            onPromote={(ideaId) =>
              runAction(() => promoteCandidateToFullIdeaAction(ideaId), "Pelny pomysl zostal utworzony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onSave={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.SAVED), "Pomysl zapisany.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onDismiss={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onRestore={(ideaId) =>
              runAction(() => updateIdeaStatusAction(ideaId, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.", undefined, refreshIdeasPanelDataIfLoaded)
            }
            onOpenDetail={setIdeaDetail}
            renderEvidence={(idea) => <EvidenceSources sources={idea.evidenceSources} emptyText="Brak zapisanych zrodel dla tego pomyslu." />}
          />
        ) : (
          <LazyPanelState
            title="Pelne pomysly"
            loadingText="Pobieram pelna liste pomyslow..."
            errorText="Nie udalo sie zaladowac pomyslow."
            isLoading={isIdeasViewLoading}
            isPending={isPending}
            onRetryLoad={loadIdeasPanelData}
          />
        )
      ) : null}

      {activeTab === "weekly" ? (
        weeklyReportsPanelData ? (
          <WeeklyReportsView reports={weeklyReportsPanelData.weeklyReports} comparison={weeklyReportsPanelData.comparison} />
        ) : (
          <LazyPanelState
            title="Raporty tygodniowe"
            loadingText="Pobieram pelne raporty tygodniowe..."
            errorText="Nie udalo sie zaladowac raportow tygodniowych."
            isLoading={isWeeklyReportsViewLoading}
            isPending={isPending}
            onRetryLoad={loadWeeklyReportsPanelData}
          />
        )
      ) : null}

      {activeTab === "settings" ? (
        <SettingsView
          settingsSummary={settingsPanelData?.settingsSummary ?? null}
          notificationSummary={settingsPanelData?.notificationSummary ?? null}
          isLoading={isSettingsViewLoading}
          isPending={isPending}
          onSaveSetting={(key, value) =>
            runAction(() => updateSettingAction(key, String(value)), "Ustawienie zapisane.", "Zapisuje ustawienie...", refreshSettingsPanelDataIfOpen)
          }
          onClearExpiredExternalCache={() =>
            runAction(() => clearExpiredExternalCacheAction(), "Wygasly cache wyczyszczony.", "Czyszcze cache...", refreshSettingsPanelDataIfOpen)
          }
          onClearOldNotificationLogs={() =>
            runAction(() => clearOldNotificationLogsAction(30), "Stare logi powiadomien wyczyszczone.", "Czyszcze logi...", refreshSettingsPanelDataIfOpen)
          }
          onTestNotification={() =>
            runAction(() => testNotificationAction(), "Test notification wykonany.", "Wysylam test notification...", refreshSettingsPanelDataIfOpen)
          }
          onRetryAiJob={retryAiJob}
          onOpenDailyBriefing={openDailyBriefing}
          onDownloadIdeasCsv={downloadIdeasCsv}
          onPruneSnapshots={pruneSnapshotsWithConfirmation}
          onRetryLoad={loadSettingsPanelData}
        />
      ) : null}

      {ideaDetail ? (
        <IdeaDetailDialog
          idea={ideaDetail}
          isPending={isPending}
          evidence={<EvidenceSources sources={ideaDetail.evidenceSources} emptyText="Brak zapisanych zrodel dla tego kandydata." />}
          onClose={() => setIdeaDetail(null)}
          onPromote={() =>
            runAction(() => promoteCandidateToFullIdeaAction(ideaDetail.id), "Pelny pomysl zostal utworzony.", undefined, refreshIdeasPanelDataIfLoaded)
          }
          onSave={() => runAction(() => updateIdeaStatusAction(ideaDetail.id, IDEA_STATUS.SAVED), "Pomysl zapisany.", undefined, refreshIdeasPanelDataIfLoaded)}
          onDismiss={() =>
            runAction(() => updateIdeaStatusAction(ideaDetail.id, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.", undefined, refreshIdeasPanelDataIfLoaded)
          }
        />
      ) : null}

      {pendingReportTitle && !report ? (
        <ReportLoadingDialog title={pendingReportTitle} onClose={() => setPendingReportTitle(null)} />
      ) : null}
      </div>

      {report ? (
        <DialogShell
          titleId="repo-report-dialog-title"
          onClose={() => setReport(null)}
          className="print-report-dialog max-w-5xl"
          overlayClassName="print-report-overlay"
        >
          <div className="print-hidden sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-border-subtle bg-surface-overlay pb-4">
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
          <div className="print-report-content">
            <ReportView content={report.content} sources={report.evidenceSources} />
          </div>
        </DialogShell>
      ) : null}
    </AppShell>
  );
}

function EvidenceSources({ sources, emptyText }: { sources: EvidenceSourceItem[]; emptyText: string }) {
  return <EvidencePanel sources={sources} emptyText={emptyText} />;
}

function LazyPanelState({
  title,
  loadingText,
  errorText,
  isLoading,
  isPending,
  onRetryLoad
}: {
  title: string;
  loadingText: string;
  errorText: string;
  isLoading: boolean;
  isPending: boolean;
  onRetryLoad: () => void;
}) {
  return (
    <section className="space-y-4" aria-busy={isLoading}>
      <SectionCard title={title} description={isLoading ? loadingText : "Dane panelu nie sa jeszcze zaladowane."}>
        {isLoading ? (
          <div className="space-y-4" role="status" aria-live="polite">
            <span className="sr-only">{loadingText}</span>
            <div className="rounded-md border border-info/30 bg-info/10 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info" variant="status">ladowanie</Badge>
                <p className="text-sm font-medium text-foreground">{loadingText}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Panel doczytuje dane dopiero po otwarciu tego widoku.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
            <div className="space-y-3">
              <SkeletonBlock className="h-28" />
              <SkeletonBlock className="h-28" />
              <SkeletonBlock className="h-28" />
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning" variant="status">do ponowienia</Badge>
              <p className="text-sm font-medium text-foreground">{errorText}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Dane nie zostaly zapisane w stanie widoku. Sprobuj pobrac panel ponownie.</p>
            <Button className="mt-3" variant="secondary" size="sm" onClick={onRetryLoad} disabled={isPending}>
              Ponow pobieranie
            </Button>
          </div>
        )}
      </SectionCard>
    </section>
  );
}

function ReportLoadingDialog({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <DialogShell titleId="repo-report-loading-title" onClose={onClose} className="max-w-4xl" overlayClassName="print-hidden">
      <div className="border-b border-border-subtle pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="repo-report-loading-title" className="text-xl font-semibold">
            {title}
          </h2>
          <Badge tone="info" variant="status">ladowanie</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Przygotowuje tresc, sekcje i lokalny zapis raportu...</p>
      </div>
      <div className="mt-5 space-y-5" role="status" aria-live="polite">
        <span className="sr-only">Raport jest przygotowywany.</span>
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
