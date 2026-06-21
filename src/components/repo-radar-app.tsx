"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Download, FileText, RefreshCw } from "lucide-react";
import type { DashboardData, EvidenceSourceItem, IdeaListItem, RepositoryListItem, RepositoryPage, RepositoryPageInput } from "@/types/repository";
import {
  clearExpiredExternalCacheAction,
  clearOldNotificationLogsAction,
  completeActionItemAction,
  createActionItemAction,
  dismissActionItemAction,
  exportIdeasCsvAction,
  getRepositoryPageAction,
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
import { RepoFilterBar } from "@/components/repo-radar/repo-filter-bar";
import type { RepoSortKey } from "@/components/repo-radar/repo-filter-bar";
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
import { Button, DialogShell, type FeedbackState } from "@/components/repo-radar/ui";

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
  const [report, setReport] = useState<ReportState>(null);
  const [ideaDetail, setIdeaDetail] = useState<IdeaListItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();
  const repositoryRequestKeyRef = useRef("");

  const languages = useMemo(
    () => initialData.repositoryFilterOptions.languages,
    [initialData.repositoryFilterOptions.languages]
  );
  const discoveryProfiles = useMemo(
    () => initialData.repositoryFilterOptions.discoveryProfiles,
    [initialData.repositoryFilterOptions.discoveryProfiles]
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

  function runAction<T>(action: () => Promise<T>, success: string, pending = "Operacja w toku...") {
    setFeedback({ tone: "info", message: pending });
    startTransition(async () => {
      try {
        await action();
        setFeedback({ tone: "success", message: success });
        router.refresh();
      } catch (error) {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Operacja nie powiodla sie." });
      }
    });
  }

  function openReport(repoId: string, force = false) {
    runAction(async () => {
      const generated = await generateReportAction(repoId, force);
      setReport({
        title: generated.title,
        content: generated.contentMarkdown,
        path: generated.markdownPath,
        evidenceSources: generated.evidenceSources
      });
    }, force ? "Raport zostal zregenerowany." : "Raport jest gotowy.", force ? "Regeneruje raport..." : "Generuje raport...");
  }

  function openQuickBrief(repoId: string) {
    runAction(async () => {
      const generated = await generateQuickBriefAction(repoId);
      setReport({
        title: generated.title,
        content: generated.contentMarkdown,
        path: generated.markdownPath,
        evidenceSources: []
      });
    }, "Quick brief jest gotowy.", "Tworze quick brief...");
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
    runAction(async () => {
      const generated = await generateDailyBriefingAction();
      setReport({
        title: generated.title,
        content: generated.contentMarkdown,
        path: generated.markdownPath,
        evidenceSources: []
      });
    }, "Briefing dzienny utworzony.", "Tworze briefing dzienny...");
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
            <Button onClick={() => runAction(() => runScanAction(), "Scan zakonczony.", "Scan jest w toku...")} disabled={isPending}>
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
            <Button
              variant="secondary"
              onClick={() => runAction(() => createWeeklyReportAction(), "Raport tygodniowy utworzony.", "Tworze raport tygodniowy...")}
              disabled={isPending}
            >
              <FileText className="h-4 w-4" />
              Raport tygodniowy
            </Button>
          </>
        }
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
              resultCount={repositoryPage.items.length}
              totalCount={repositoryPage.total}
              onQueryChange={setQuery}
              onStatusChange={setStatusFilter}
              onLanguageChange={setLanguageFilter}
              onProfileChange={setDiscoveryProfileFilter}
              onMinTrendChange={setMinTrend}
              onSortChange={setRepoSortKey}
              onReset={resetRepoFilters}
            />
          }
          sortKey={repoSortKey}
          totalCount={repositoryPage.total}
          hasMore={repositoryPage.hasMore}
          onLoadMore={loadMoreRepositories}
          expandedRepoId={expandedRepoId}
          isPending={isPending || isRepositoryPageLoading}
          callbacks={{
            onToggle: (repoId) => setExpandedRepoId(expandedRepoId === repoId ? null : repoId),
            onOpenReport: (repoId) => openReport(repoId),
            onRegenerateReport: (repoId) => openReport(repoId, true),
            onSave: (repoId) => runAction(() => updateStatusAction(repoId, "SAVED"), "Repo zapisane."),
            onMarkRead: (repoId) => runAction(() => updateStatusAction(repoId, "READ"), "Repo oznaczone jako przeczytane."),
            onOpenQuickBrief: (repoId) => openQuickBrief(repoId),
            onGenerateIdea: (repoId) => runAction(() => generateIdeaAction(repoId), "Pomysl zostal utworzony.", "Tworze pomysl z repo..."),
            onResearch: (repoId) => runAction(() => generateOpportunityCandidateAction(repoId), "Research light zakonczony.", "Research light w toku..."),
            onAddCloneTask: (repo) => createRepoTask(repo, "CLONE_LATER", `Clone later: ${repo.fullName}`, "Zadanie clone later dodane.", 1),
            onAddDemoTask: (repo) => createRepoTask(repo, "CHECK_DEMO", `Sprawdz demo: ${repo.fullName}`, "Zadanie demo dodane.", 2),
            onValidateMarket: (repo) =>
              createRepoTask(repo, "VALIDATE_MARKET", `Zweryfikuj rynek: ${repo.fullName}`, "Zadanie walidacji rynku dodane.", 3),
            onIgnore: (repoId) => runAction(() => updateStatusAction(repoId, "IGNORED"), "Repo przeniesione do ignorowanych.")
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

      {report ? (
        <DialogShell titleId="repo-report-dialog-title" onClose={() => setReport(null)} className="max-w-5xl">
          <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-border-subtle bg-surface-overlay pb-4">
            <div>
              <h2 id="repo-report-dialog-title" className="text-xl font-semibold">
                {report.title}
              </h2>
              {report.path ? <p className="text-sm text-muted-foreground">Zapisano: {report.path}</p> : null}
            </div>
            <Button variant="secondary" onClick={() => setReport(null)}>
              Zamknij
            </Button>
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
