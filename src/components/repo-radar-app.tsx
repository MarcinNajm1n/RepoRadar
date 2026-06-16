"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Github,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";
import type { DashboardData, EvidenceSourceItem, IdeaListItem, RepositoryListItem } from "@/types/repository";
import type { ActionItemListItem } from "@/types/action-item";
import { formatActionItemStatus, formatActionItemType } from "@/types/action-item";
import { REPOSITORY_STATUSES, formatStatus } from "@/types/status";
import {
  clearExpiredExternalCacheAction,
  clearOldNotificationLogsAction,
  completeActionItemAction,
  createActionItemAction,
  dismissActionItemAction,
  exportIdeasCsvAction,
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
import { cn, formatCompactNumber, formatDate, sanitizeExternalUrl } from "@/lib/utils";

type TabKey =
  | "radar"
  | "library"
  | "new"
  | "saved"
  | "read"
  | "ignored"
  | "tasks"
  | "candidates"
  | "ideas"
  | "savedIdeas"
  | "dismissedIdeas"
  | "weekly"
  | "old"
  | "settings";

type SectionKey = "repo" | "ideas";

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; section?: SectionKey }> = [
  { key: "radar", label: "Radar dzisiaj", icon: Bell, section: "repo" },
  { key: "library", label: "Biblioteka", icon: Github, section: "repo" },
  { key: "new", label: "Nowo znalezione", icon: Sparkles, section: "repo" },
  { key: "saved", label: "Zapisane", icon: Star, section: "repo" },
  { key: "read", label: "Przeczytane", icon: BookOpen, section: "repo" },
  { key: "ignored", label: "Ignorowane", icon: Trash2, section: "repo" },
  { key: "tasks", label: "Zadania", icon: ClipboardList, section: "repo" },
  { key: "ideas", label: "Pomysły", icon: Brain },
  { key: "candidates", label: "Kandydaci", icon: Search, section: "ideas" },
  { key: "savedIdeas", label: "Zapisane", icon: Star, section: "ideas" },
  { key: "dismissedIdeas", label: "Odrzucone", icon: Trash2, section: "ideas" },
  { key: "weekly", label: "Raporty tygodniowe", icon: FileText, section: "repo" },
  { key: "old", label: "Stare repo", icon: CheckCircle2, section: "repo" },
  { key: "settings", label: "Ustawienia", icon: Settings, section: "repo" }
];

function getTabSection(tab: (typeof tabs)[number]): SectionKey {
  return tab.section ?? ((["ideas", "candidates", "savedIdeas", "dismissedIdeas"] as TabKey[]).includes(tab.key) ? "ideas" : "repo");
}

function getTabLabel(tab: (typeof tabs)[number]) {
  if (tab.key === "ideas") {
    return "Pelne pomysly";
  }
  if (tab.key === "candidates") {
    return "Kandydaci";
  }
  if (tab.key === "savedIdeas") {
    return "Zapisane pomysly";
  }
  if (tab.key === "dismissedIdeas") {
    return "Odrzucone pomysly";
  }
  return tab.label;
}

type ReportState = {
  title: string;
  content: string;
  path: string | null;
  evidenceSources: EvidenceSourceItem[];
} | null;

function Button({
  children,
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "border-primary bg-primary text-primary-foreground hover:brightness-95",
        variant === "secondary" && "border-border bg-card text-foreground hover:bg-muted",
        variant === "danger" && "border-destructive bg-destructive text-destructive-foreground hover:brightness-95",
        variant === "ghost" && "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

function scoreClass(score: number) {
  if (score >= 80) {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (score >= 60) {
    return "bg-teal-50 text-teal-800 border-teal-200";
  }
  return "bg-muted text-muted-foreground";
}

function discoveryProfileLabel(profile: string) {
  const labels: Record<string, string> = {
    fresh_repos: "Fresh repos",
    fast_momentum: "Fast momentum",
    established_hot: "Established hot",
    old_reactivated: "Old reactivated",
    niche_ai_tools: "Niche AI tools"
  };

  return labels[profile] ?? profile;
}

function filterByTab(tab: TabKey, repositories: RepositoryListItem[]) {
  switch (tab) {
    case "new":
      return repositories.filter((repo) => repo.status === "NEW" && !repo.isDeletedFromView);
    case "saved":
      return repositories.filter((repo) => repo.status === "SAVED" && !repo.isDeletedFromView);
    case "read":
      return repositories.filter((repo) => repo.status === "READ" && !repo.isDeletedFromView);
    case "ignored":
      return repositories.filter((repo) => repo.status === "IGNORED" || repo.isDeletedFromView);
    case "old":
      return repositories.filter((repo) => repo.isOldRepo && repo.status !== "HOT" && !repo.isDeletedFromView);
    default:
      return repositories.filter((repo) => !repo.isDeletedFromView);
  }
}

function repoMatchesQuery(repo: RepositoryListItem, query: string) {
  if (!query.trim()) {
    return true;
  }

  const normalized = query.toLowerCase();
  return [
    repo.fullName,
    repo.owner,
    repo.description,
    repo.shortSummaryPl,
    repo.primaryLanguage,
    repo.topics.join(" ")
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalized));
}

function getTomorrowIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);
  const [report, setReport] = useState<ReportState>(null);
  const [ideaDetail, setIdeaDetail] = useState<IdeaListItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reportDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!report) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reportDialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setReport(null);
        return;
      }

      if (event.key !== "Tab" || !reportDialogRef.current) {
        return;
      }

      const focusable = Array.from(
        reportDialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [report]);

  const languages = useMemo(
    () =>
      [...new Set(initialData.repositories.map((repo) => repo.primaryLanguage).filter(Boolean) as string[])].sort(),
    [initialData.repositories]
  );
  const discoveryProfiles = useMemo(
    () => [...new Set(initialData.repositories.flatMap((repo) => repo.discoveryProfiles))].sort(),
    [initialData.repositories]
  );

  const visibleRepositories = useMemo(() => {
    return filterByTab(activeTab, initialData.repositories)
      .filter((repo) => repoMatchesQuery(repo, query))
      .filter((repo) => (statusFilter === "ALL" ? true : repo.status === statusFilter))
      .filter((repo) => (languageFilter === "ALL" ? true : repo.primaryLanguage === languageFilter))
      .filter((repo) => (discoveryProfileFilter === "ALL" ? true : repo.discoveryProfiles.includes(discoveryProfileFilter)))
      .filter((repo) => repo.trendScore >= minTrend);
  }, [activeTab, discoveryProfileFilter, initialData.repositories, languageFilter, minTrend, query, statusFilter]);
  const candidates = useMemo(() => initialData.ideas.filter((idea) => idea.status === IDEA_STATUS.CANDIDATE), [initialData.ideas]);
  const fullIdeas = useMemo(() => initialData.ideas.filter((idea) => isFullIdeaStatus(idea.status)), [initialData.ideas]);
  const savedIdeas = useMemo(() => initialData.ideas.filter((idea) => idea.status === IDEA_STATUS.SAVED), [initialData.ideas]);
  const dismissedIdeas = useMemo(() => initialData.ideas.filter((idea) => idea.status === IDEA_STATUS.DISMISSED), [initialData.ideas]);
  const activeActionItemCount = useMemo(
    () => initialData.actionItems.filter((item) => item.status !== "DONE" && item.status !== "DISMISSED").length,
    [initialData.actionItems]
  );

  function runAction<T>(action: () => Promise<T>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Operacja nie powiodła się.");
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
    }, force ? "Raport został zregenerowany." : "Raport jest gotowy.");
  }

  function repoAction(event: React.MouseEvent, action: () => Promise<unknown>, success: string) {
    event.stopPropagation();
    runAction(action, success);
  }

  function toggleRepo(event: React.MouseEvent, repoId: string) {
    event.stopPropagation();
    setExpandedRepoId(expandedRepoId === repoId ? null : repoId);
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
    }, "Briefing dzienny utworzony.");
  }

  function downloadIdeasCsv() {
    setMessage(null);
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
        setMessage("CSV pomyslow przygotowany.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Eksport CSV nie powiodl sie.");
      }
    });
  }

  function pruneSnapshotsWithConfirmation() {
    if (!window.confirm("Usunac snapshoty starsze niz 180 dni? Te dane sa lokalne i nie beda odzyskane z historii.")) {
      return;
    }
    runAction(() => pruneOldSnapshotsAction({ daysToKeep: 180, confirmed: true }), "Stare snapshoty wyczyszczone.");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1500px] gap-5 px-5 py-5">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-5 rounded-lg border border-border bg-card p-3 shadow-soft">
            <div className="mb-4 flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">RepoRadar</h1>
                <p className="text-xs text-muted-foreground">Lokalny radar GitHub</p>
              </div>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["repo", "ideas"] as SectionKey[]).map((section) => (
                <button
                  key={section}
                  className={cn(
                    "rounded-md border border-border px-3 py-2 text-sm font-medium",
                    activeSection === section && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    setActiveSection(section);
                    setActiveTab(section === "repo" ? "radar" : "candidates");
                  }}
                >
                  {section === "repo" ? "Repo" : "Pomysly"}
                </button>
              ))}
            </div>
            <nav className="space-y-1">
              {tabs.filter((tab) => getTabSection(tab) === activeSection).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted",
                      activeTab === tab.key && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {getTabLabel(tab)}
                    </span>
                    {tab.key === "new" && initialData.counts.new > 0 ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {initialData.counts.new}
                      </span>
                    ) : null}
                    {tab.key === "tasks" && activeActionItemCount > 0 ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {activeActionItemCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 lg:hidden">
            <div className="mb-2 grid grid-cols-2 gap-2">
              {(["repo", "ideas"] as SectionKey[]).map((section) => (
                <button
                  key={section}
                  className={cn(
                    "h-10 rounded-md border border-border bg-card text-sm font-medium",
                    activeSection === section && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    setActiveSection(section);
                    setActiveTab(section === "repo" ? "radar" : "candidates");
                  }}
                >
                  {section === "repo" ? "Repo" : "Pomysly"}
                </button>
              ))}
            </div>
            <select
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm font-medium shadow-soft"
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as TabKey)}
            >
              {tabs.filter((tab) => getTabSection(tab) === activeSection).map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {getTabLabel(tab)}
                </option>
              ))}
            </select>
          </div>

          <header className="mb-4 rounded-lg border border-border bg-card p-4 shadow-soft">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>Nowe: {initialData.counts.new}</Badge>
                  <Badge>Hot: {initialData.counts.hot}</Badge>
                  <Badge>Zapisane: {initialData.counts.saved}</Badge>
                  <Badge>Ignorowane: {initialData.counts.ignored}</Badge>
                  <Badge>Kandydaci: {initialData.counts.candidates}</Badge>
                  <Badge>Pelne pomysly: {initialData.counts.fullIdeas}</Badge>
                  <Badge>Zapisane pomysly: {initialData.counts.savedIdeas}</Badge>
                  <Badge>Odrzucone: {initialData.counts.dismissedIdeas}</Badge>
                  <Badge>Zadania: {activeActionItemCount}</Badge>
                </div>
                <h2 className="text-2xl font-semibold">{getTabLabel(tabs.find((tab) => tab.key === activeTab) ?? tabs[0])}</h2>
                <p className="text-sm text-muted-foreground">
                  Ostatni scan:{" "}
                  {initialData.lastScan
                    ? `${formatDate(initialData.lastScan.startedAt)} · ${initialData.lastScan.status} · ${initialData.lastScan.reposUpdated} repo`
                    : "brak skanu"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => runAction(() => runScanAction(), "Scan zakończony.")}
                  disabled={isPending}
                >
                  <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
                  Uruchom scan
                </Button>
                <Button
                  variant="secondary"
                  onClick={openDailyBriefing}
                  disabled={isPending}
                >
                  <CalendarClock className="h-4 w-4" />
                  Briefing dzienny
                </Button>
                <Button
                  variant="secondary"
                  onClick={downloadIdeasCsv}
                  disabled={isPending}
                >
                  <Download className="h-4 w-4" />
                  Eksport CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => runAction(() => createWeeklyReportAction(), "Raport tygodniowy utworzony.")}
                  disabled={isPending}
                >
                  <FileText className="h-4 w-4" />
                  Raport tygodniowy
                </Button>
              </div>
            </div>
            {message ? (
              <div className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {message}
              </div>
            ) : null}
          </header>

          {activeTab === "radar" ? (
            <section className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-4">
                <Metric label="Top repo" value={initialData.radarToday.topRepositories.length} />
                <Metric label="Kandydaci" value={initialData.radarToday.businessCandidates.length} />
                <Metric label="Zadania" value={initialData.radarToday.actionItems.length} />
                <Metric label="Alerty" value={initialData.radarToday.alerts.length} />
              </div>

              {initialData.radarToday.alerts.length ? (
                <section className="grid gap-3 md:grid-cols-2">
                  {initialData.radarToday.alerts.map((alert) => (
                    <article
                      key={alert.id}
                      className={cn(
                        "rounded-lg border bg-card p-4 shadow-soft",
                        alert.level === "critical" && "border-red-300 bg-red-50 text-red-950",
                        alert.level === "warning" && "border-amber-300 bg-amber-50 text-amber-950",
                        alert.level === "info" && "border-blue-200 bg-blue-50 text-blue-950"
                      )}
                    >
                      <div className="font-semibold">{alert.title}</div>
                      <p className="mt-1 text-sm">{alert.message}</p>
                    </article>
                  ))}
                </section>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                <section className="rounded-lg border border-border bg-card p-4 shadow-soft">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">Repo do sprawdzenia</h3>
                    <Button variant="ghost" onClick={() => setActiveTab("library")}>
                      Biblioteka
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {initialData.radarToday.topRepositories.length ? (
                      initialData.radarToday.topRepositories.map((repo) => (
                        <article key={repo.id} className="rounded-md border border-border bg-background p-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold">{repo.fullName}</h4>
                                <Badge>{formatStatus(repo.status)}</Badge>
                                <Badge>Trend {repo.trendScore}</Badge>
                                <Badge>Initial {repo.initialMomentumScore}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{repo.shortSummaryPl ?? repo.description ?? "Brak opisu."}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" onClick={() => openReport(repo.id)} disabled={isPending}>
                                <FileText className="h-4 w-4" /> Raport
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => createRepoTask(repo, "READ_README", `Przeczytaj README: ${repo.fullName}`, "Zadanie README dodane.")}
                                disabled={isPending}
                              >
                                <BookOpen className="h-4 w-4" /> README
                              </Button>
                              <SafeRepoLink url={repo.url} />
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <EmptyState title="Brak repo na dzisiaj" text="Uruchom scan albo sprawdz filtry w Bibliotece." />
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-card p-4 shadow-soft">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">Zadania teraz</h3>
                    <Button variant="secondary" onClick={createManualTask} disabled={isPending}>
                      <ClipboardList className="h-4 w-4" /> Dodaj zadanie
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {initialData.radarToday.actionItems.length ? (
                      initialData.radarToday.actionItems.map((item) => (
                        <ActionItemCard
                          key={item.id}
                          item={item}
                          isPending={isPending}
                          onComplete={() => runAction(() => completeActionItemAction(item.id), "Zadanie zakonczone.")}
                          onSnooze={() => snoozeUntilTomorrow(item.id)}
                          onDismiss={() => runAction(() => dismissActionItemAction(item.id), "Zadanie odrzucone.")}
                        />
                      ))
                    ) : (
                      <EmptyState title="Brak aktywnych zadan" text="Dodaj zadanie z repo albo utworz reczne zadanie." />
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <section className="rounded-lg border border-border bg-card p-4 shadow-soft">
                  <h3 className="text-lg font-semibold">Kandydaci biznesowi</h3>
                  <div className="mt-3 space-y-3">
                    {initialData.radarToday.businessCandidates.length ? (
                      initialData.radarToday.businessCandidates.map((idea) => (
                        <article key={idea.id} className="rounded-md border border-border bg-background p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">{idea.title}</h4>
                            {idea.opportunityScore !== null ? <Badge>{idea.opportunityScore}/100</Badge> : null}
                            {idea.confidenceScore !== null ? <Badge>Conf {idea.confidenceScore}/5</Badge> : null}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{idea.applicationSummary ?? idea.problem}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => setIdeaDetail(idea)}>
                              Szczegoly
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => repoAction(event, () => promoteCandidateToFullIdeaAction(idea.id), "Pelny pomysl zostal utworzony.")}
                              disabled={isPending}
                            >
                              <Brain className="h-4 w-4" /> Rozwin pomysl
                            </Button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <EmptyState title="Brak kandydatow" text="Uzyj light research przy repo, ktore wyglada obiecujaco." />
                    )}
                  </div>
                </section>

                <RadarRepoCompactSection
                  title="Nowe perelki"
                  repositories={initialData.radarToday.newGems}
                  empty="Brak nowych perelek."
                />
                <RadarRepoCompactSection
                  title="High initial momentum"
                  repositories={initialData.radarToday.highInitialMomentum}
                  empty="Brak repo z mocnym initial momentum."
                />
              </div>
            </section>
          ) : null}

          {activeTab === "tasks" ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4 shadow-soft">
                <div>
                  <h3 className="text-lg font-semibold">Zadania</h3>
                  <p className="text-sm text-muted-foreground">Kolejka decyzji, researchu i recznego sprawdzenia repo.</p>
                </div>
                <Button variant="secondary" onClick={createManualTask} disabled={isPending}>
                  <ClipboardList className="h-4 w-4" /> Dodaj zadanie
                </Button>
              </div>
              <div className="space-y-3">
                {initialData.actionItems.length ? (
                  initialData.actionItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      isPending={isPending}
                      onComplete={() => runAction(() => completeActionItemAction(item.id), "Zadanie zakonczone.")}
                      onSnooze={() => snoozeUntilTomorrow(item.id)}
                      onDismiss={() => runAction(() => dismissActionItemAction(item.id), "Zadanie odrzucone.")}
                    />
                  ))
                ) : (
                  <EmptyState title="Brak zadan" text="Dodaj zadanie reczne albo skorzystaj z quick actions przy repo." />
                )}
              </div>
            </section>
          ) : null}

          {activeTab !== "radar" &&
          activeTab !== "tasks" &&
          activeTab !== "ideas" &&
          activeTab !== "candidates" &&
          activeTab !== "savedIdeas" &&
          activeTab !== "dismissedIdeas" &&
          activeTab !== "weekly" &&
          activeTab !== "settings" ? (
            <>
              <section className="mb-4 rounded-lg border border-border bg-card p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_160px]">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Szukaj po nazwie, autorze, topics, opisie..."
                    />
                  </label>
                  <select
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="ALL">Wszystkie statusy</option>
                    {Object.keys(REPOSITORY_STATUSES).map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={languageFilter}
                    onChange={(event) => setLanguageFilter(event.target.value)}
                  >
                    <option value="ALL">Wszystkie języki</option>
                    {languages.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={discoveryProfileFilter}
                    onChange={(event) => setDiscoveryProfileFilter(event.target.value)}
                  >
                    <option value="ALL">Wszystkie profile</option>
                    {discoveryProfiles.map((profile) => (
                      <option key={profile} value={profile}>
                        {discoveryProfileLabel(profile)}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
                    Score ≥
                    <input
                      className="w-full bg-transparent outline-none"
                      type="number"
                      min={0}
                      max={100}
                      value={minTrend}
                      onChange={(event) => setMinTrend(Number(event.target.value))}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                {visibleRepositories.length ? (
                  visibleRepositories.map((repo) => (
                    <article
                      key={repo.id}
                      className="rounded-lg border border-border bg-card p-4 shadow-soft transition hover:border-primary/40"
                      onClick={() => setExpandedRepoId(expandedRepoId === repo.id ? null : repo.id)}
                      onDoubleClick={() => openReport(repo.id)}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-lg font-semibold">{repo.fullName}</h3>
                            <Badge>{formatStatus(repo.status)}</Badge>
                            {repo.status === "HOT" ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                <Flame className="mr-1 h-3 w-3" /> Hot
                              </Badge>
                            ) : null}
                            {repo.isArchived ? <Badge>archived</Badge> : null}
                            {repo.isFork ? <Badge>fork</Badge> : null}
                            <Button
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={(event) => toggleRepo(event, repo.id)}
                              aria-expanded={expandedRepoId === repo.id}
                            >
                              {expandedRepoId === repo.id ? "Zwin" : "Rozwin"}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">{repo.description ?? "Brak opisu w GitHub metadata."}</p>
                          {repo.shortSummaryPl ? (
                            <p className="mt-3 text-sm leading-6">{repo.shortSummaryPl}</p>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Krótki opis PL nie został jeszcze wygenerowany.</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {repo.discoveryProfiles.map((profile) => (
                              <Badge key={profile} className="border-blue-200 bg-blue-50 text-blue-800">
                                {discoveryProfileLabel(profile)}
                              </Badge>
                            ))}
                            {repo.topics.slice(0, 8).map((topic) => (
                              <Badge key={topic}>{topic}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid w-full min-w-0 grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:w-auto xl:min-w-[280px] xl:text-right">
                          <Metric label="Stars" value={formatCompactNumber(repo.starsCurrent)} />
                          <Metric label="Growth 7d" value={repo.growth7d === null ? "zbieramy" : `+${repo.growth7d}`} />
                          <Metric label="Score" value={repo.trendScore} className={scoreClass(repo.trendScore)} />
                          <Metric label="Język" value={repo.primaryLanguage ?? "brak"} />
                          <Metric label="Created" value={formatDate(repo.createdAt)} />
                          <Metric label="Pushed" value={formatDate(repo.pushedAt)} />
                        </div>
                      </div>

                      {expandedRepoId === repo.id ? (
                        <div className="mt-4 border-t border-border pt-4">
                          <div className="mb-3 grid gap-3 text-sm md:grid-cols-3">
                            <Info label="Owner" value={repo.owner} />
                            <Info label="Forks" value={String(repo.forksCurrent)} />
                            <Info label="Issues" value={String(repo.openIssues)} />
                            <Info label="Wiek" value={`${repo.ageMonths} mies.`} />
                            <Info label="Relevance" value={`${repo.relevanceScore}/100`} />
                            <Info label="Initial momentum" value={`${repo.initialMomentumScore}/100`} />
                            <Info label="Źródło" value={repo.source} />
                          </div>
                          <ScoreBreakdownPanel repo={repo} />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              onClick={(event) => repoAction(event, () => updateStatusAction(repo.id, "SAVED"), "Repo zapisane.")}
                              disabled={isPending}
                            >
                              <Star className="h-4 w-4" /> Zapisz
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => repoAction(event, () => updateStatusAction(repo.id, "READ"), "Repo oznaczone jako przeczytane.")}
                              disabled={isPending}
                            >
                              <BookOpen className="h-4 w-4" /> Oznacz jako przeczytane
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                openReport(repo.id);
                              }}
                              disabled={isPending}
                            >
                              <FileText className="h-4 w-4" /> Pełny raport
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                openReport(repo.id, true);
                              }}
                              disabled={isPending}
                            >
                              <RefreshCw className="h-4 w-4" /> Regeneruj raport
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => repoAction(event, () => generateIdeaAction(repo.id), "Pomysł został utworzony.")}
                              disabled={isPending}
                            >
                              <Brain className="h-4 w-4" /> Utwórz pomysł z repo
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) =>
                                repoAction(event, () => generateOpportunityCandidateAction(repo.id), "Research light zakonczony.")
                              }
                              disabled={isPending}
                            >
                              <Search className="h-4 w-4" /> Znajdz problemy / Research
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                createRepoTask(repo, "CLONE_LATER", `Clone later: ${repo.fullName}`, "Zadanie clone later dodane.", 1);
                              }}
                              disabled={isPending}
                            >
                              <ClipboardList className="h-4 w-4" /> Clone later
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                createRepoTask(repo, "CHECK_DEMO", `Sprawdz demo: ${repo.fullName}`, "Zadanie demo dodane.", 2);
                              }}
                              disabled={isPending}
                            >
                              <ExternalLink className="h-4 w-4" /> Sprawdz demo
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                createRepoTask(repo, "VALIDATE_MARKET", `Zweryfikuj rynek: ${repo.fullName}`, "Zadanie walidacji rynku dodane.", 3);
                              }}
                              disabled={isPending}
                            >
                              <Search className="h-4 w-4" /> Zweryfikuj rynek
                            </Button>
                            <Button
                              variant="danger"
                              onClick={(event) => repoAction(event, () => updateStatusAction(repo.id, "IGNORED"), "Repo przeniesione do ignorowanych.")}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" /> Ignoruj
                            </Button>
                            <SafeRepoLink url={repo.url} />
                            {/*
                              <Button variant="ghost" type="button">
                                <ExternalLink className="h-4 w-4" /> Otwórz na GitHubie
                              </Button>
                            */}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <EmptyState title="Brak repozytoriów w tym widoku" text="Uruchom scan albo zmień filtry." />
                )}
              </section>
            </>
          ) : null}

          {activeTab === "candidates" ? (
            <section className="space-y-3">
              {candidates.length ? (
                candidates.map((idea) => (
                  <article key={idea.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{idea.title}</h3>
                      <Badge>{idea.sourceRepoName}</Badge>
                      {idea.opportunityScore !== null ? <Badge>Opportunity {idea.opportunityScore}/100</Badge> : null}
                      {idea.confidenceScore ? <Badge>Confidence {idea.confidenceScore}/5</Badge> : null}
                      {idea.evidenceSources.length ? <Badge>{idea.evidenceSources.length} sources</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{idea.applicationSummary ?? idea.problem}</p>
                    {idea.businessRationale ? <p className="mt-3 text-sm leading-6">{idea.businessRationale}</p> : null}
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      <Info label="Zastosowanie" value={idea.applicationSummary ?? idea.targetUser} />
                      <Info label="Dlaczego moze zarabiac" value={idea.businessRationale ?? idea.monetizationPotential} />
                      <Info label="Evidence" value={`${idea.evidenceSources.length} zrodel`} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={(event) => repoAction(event, () => promoteCandidateToFullIdeaAction(idea.id), "Pelny pomysl zostal utworzony.")}
                        disabled={isPending}
                      >
                        <Brain className="h-4 w-4" /> Rozwin pelny pomysl
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={(event) => repoAction(event, () => updateIdeaStatusAction(idea.id, IDEA_STATUS.SAVED), "Kandydat zapisany.")}
                        disabled={isPending}
                      >
                        <Star className="h-4 w-4" /> Zapisz
                      </Button>
                      <Button
                        variant="danger"
                        onClick={(event) => repoAction(event, () => updateIdeaStatusAction(idea.id, IDEA_STATUS.DISMISSED), "Kandydat odrzucony.")}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" /> Odrzuc
                      </Button>
                      <Button variant="ghost" onClick={() => setIdeaDetail(idea)}>
                        Szczegoly
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="Brak kandydatow" text="Uzyj akcji Znajdz okazje przy repo albo wlacz auto opportunity research w .env." />
              )}
            </section>
          ) : null}

          {activeTab === "savedIdeas" ? (
            <section className="space-y-3">
              {savedIdeas.length ? (
                savedIdeas.map((idea) => (
                  <article key={idea.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{idea.title}</h3>
                      <Badge>{idea.sourceRepoName}</Badge>
                      {idea.opportunityScore !== null ? <Badge>Opportunity {idea.opportunityScore}/100</Badge> : null}
                      {idea.evidenceSources.length ? <Badge>{idea.evidenceSources.length} sources</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{idea.applicationSummary ?? idea.problem}</p>
                    {idea.businessRationale ? <p className="mt-3 text-sm leading-6">{idea.businessRationale}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => setIdeaDetail(idea)}>
                        Szczegoly
                      </Button>
                      <Button
                        variant="danger"
                        onClick={(event) => repoAction(event, () => updateIdeaStatusAction(idea.id, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.")}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" /> Odrzuc
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="Brak zapisanych pomyslow" text="Zapisane kandydaty i pomysly pojawia sie tutaj." />
              )}
            </section>
          ) : null}

          {activeTab === "dismissedIdeas" ? (
            <section className="space-y-3">
              {dismissedIdeas.length ? (
                dismissedIdeas.map((idea) => (
                  <article key={idea.id} className="rounded-lg border border-border bg-card p-4 shadow-soft opacity-80">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{idea.title}</h3>
                      <Badge>{idea.sourceRepoName}</Badge>
                      <Badge>DISMISSED</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{idea.applicationSummary ?? idea.problem}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={(event) => repoAction(event, () => updateIdeaStatusAction(idea.id, IDEA_STATUS.CANDIDATE), "Kandydat przywrocony.")}
                        disabled={isPending}
                      >
                        Przywroc jako kandydat
                      </Button>
                      <Button variant="ghost" onClick={() => setIdeaDetail(idea)}>
                        Szczegoly
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="Brak odrzuconych pomyslow" text="Odrzucone kandydaty nie beda automatycznie odtwarzane bez force." />
              )}
            </section>
          ) : null}

          {activeTab === "ideas" ? (
            <section className="space-y-3">
              {fullIdeas.length ? (
                fullIdeas.map((idea) => (
                  <article key={idea.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{idea.title}</h3>
                      <Badge>{idea.sourceRepoName}</Badge>
                      {idea.confidenceScore ? <Badge>Confidence {idea.confidenceScore}/5</Badge> : null}
                      {idea.evidenceSources.length ? <Badge>{idea.evidenceSources.length} sources</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{idea.problem}</p>
                    {idea.marketSummary ? (
                      <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm leading-6">
                        {idea.marketSummary}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      <Info label="Dla kogo" value={idea.targetUser} />
                      <Info label="MVP" value={idea.mvpScope} />
                      <Info label="Monetyzacja" value={idea.monetizationPotential} />
                      <Info label="Ryzyko" value={`${idea.riskScore}/5`} />
                      <Info label="Trudność" value={`${idea.difficulty}/5`} />
                      <Info label="Potencjał" value={`${idea.usefulnessScore}/5`} />
                    </div>
                    <p className="mt-3 text-sm">{idea.proposedSolution}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Stack: {idea.suggestedStack}</p>
                    {idea.firstSteps.length ? (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">Pierwsze kroki</h4>
                        <ol className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                          {idea.firstSteps.map((step, index) => (
                            <li key={`${idea.id}-step-${index}`} className="rounded-md border border-border bg-muted p-2">
                              {index + 1}. {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    <EvidenceSources sources={idea.evidenceSources} emptyText="Brak zapisanych zrodel dla tego pomyslu." />
                  </article>
                ))
              ) : (
                <EmptyState title="Brak pomysłów" text="Użyj akcji “Utwórz pomysł z repo” przy wybranym repozytorium." />
              )}
            </section>
          ) : null}

          {activeTab === "weekly" ? (
            <section className="space-y-3">
              {initialData.weeklyReports.length ? (
                initialData.weeklyReports.map((weeklyReport) => (
                  <article key={weeklyReport.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">{weeklyReport.title}</h3>
                      <Badge>{formatDate(weeklyReport.createdAt)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{weeklyReport.summary}</p>
                    {weeklyReport.markdownPath ? <p className="mt-2 text-sm">Plik: {weeklyReport.markdownPath}</p> : null}
                    <pre className="mt-3 max-h-[420px] overflow-auto rounded-md bg-muted p-3 text-xs leading-5">
                      {weeklyReport.contentMarkdown}
                    </pre>
                  </article>
                ))
              ) : (
                <EmptyState title="Brak raportów tygodniowych" text="Kliknij “Raport tygodniowy”, żeby wygenerować plik markdown." />
              )}
            </section>
          ) : null}

          {activeTab === "settings" ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <h3 className="text-lg font-semibold">Ustawienia MVP</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Główna konfiguracja jest w `.env`. Te przełączniki zapisują się w lokalnej tabeli settings.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SettingToggle
                  label="Automatyczne pomysły z top weekly"
                  description="Domyślnie wyłączone, żeby ograniczyć koszty OpenAI."
                  onSave={(value) =>
                    runAction(() => updateSettingAction("auto_generate_weekly_ideas", String(value)), "Ustawienie zapisane.")
                  }
                />
                <SettingToggle
                  label="Powiadomienia lokalne"
                  description="MVP używa badge w UI i plików raportów."
                  onSave={(value) =>
                    runAction(() => updateSettingAction("enable_local_notifications", String(value)), "Ustawienie zapisane.")
                  }
                />
              </div>
              <div className="mt-5 rounded-md border border-border p-4">
                <h4 className="font-semibold">Zrodla zewnetrzne</h4>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <Info label="Market research" value="MARKET_RESEARCH_ENABLED" />
                  <Info label="Tryb domyslny" value="MARKET_RESEARCH_MODE=light" />
                  <Info label="HN" value="ENABLE_HN_SOURCE" />
                  <Info label="RSS" value="ENABLE_RSS_SOURCE + MARKET_RESEARCH_RSS_FEEDS" />
                  <Info label="OpenAI web search" value="ENABLE_OPENAI_WEB_SEARCH_SOURCE" />
                  <Info label="Auto opportunity" value="ENABLE_AUTO_OPPORTUNITY_RESEARCH" />
                  <Info label="Auto limit repo" value="AUTO_OPPORTUNITY_RESEARCH_TOP_REPOS max 3" />
                  <Info label="Reddit OAuth" value="ENABLE_REDDIT_SOURCE + REDDIT_CLIENT_ID/SECRET" />
                  <Info label="Bluesky" value="ENABLE_BLUESKY_SOURCE" />
                  <Info label="Daily limit" value="MARKET_RESEARCH_DAILY_LIMIT" />
                  <Info label="Max sources" value="MARKET_RESEARCH_MAX_SOURCES" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Light uzywa HN/RSS/cache/OpenAI web search. Full moze uzyc Reddit i Bluesky tylko po wlaczeniu ich w .env.
                </p>
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Auto research moze zuzywac limity API. Tryb full powinien byc uruchamiany recznie.
                </p>
              </div>
              <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                GitHub token: Fine-grained PAT, read-only public repositories. OpenAI: pełne raporty i pomysły tylko na żądanie.
                Windows Task Scheduler: `scripts/register-windows-task.ps1`.
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <section className="rounded-md border border-border p-4">
                  <h4 className="font-semibold">Status konfiguracji</h4>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <Info label="GitHub token" value={initialData.settingsSummary.githubTokenConfigured ? "skonfigurowany" : "brak"} />
                    <Info label="OpenAI key" value={initialData.settingsSummary.openAiConfigured ? "skonfigurowany" : "brak"} />
                    <Info label="Discord webhook" value={initialData.settingsSummary.discordWebhookConfigured ? "skonfigurowany" : "brak"} />
                    <Info label="DB settings" value={String(initialData.settingsSummary.persistedSettingCount)} />
                  </div>
                  <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                    Sekrety nie sa zapisywane w SQLite. Zmieniaj je recznie w `.env`; UI pokazuje tylko status.
                  </p>
                </section>

                <section className="rounded-md border border-border p-4">
                  <h4 className="font-semibold">Ogólne</h4>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <Info label="UI" value="Polski, desktop-first" />
                    <Info label="Dark mode" value="system preference" />
                    <Info label="Reports dir" value={initialData.settingsSummary.reportsDir} />
                    <Info label="Scheduler" value="scripts/register-windows-task.ps1" />
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted p-3 text-sm">
                    <Moon className="h-4 w-4" />
                    Ciemny motyw korzysta z ustawien systemu.
                  </div>
                </section>

                <section className="rounded-md border border-border p-4">
                  <h4 className="font-semibold">Business Research</h4>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <Info label="Market research" value={String(initialData.settingsSummary.marketResearchEnabled)} />
                    <Info label="Tryb" value={initialData.settingsSummary.marketResearchMode} />
                    <Info label="Auto opportunity" value={String(initialData.settingsSummary.autoOpportunityResearchEnabled)} />
                    <Info label="Market daily limit" value={String(initialData.settingsSummary.marketResearchDailyLimit)} />
                    <Info label="OpenAI daily limit" value={String(initialData.settingsSummary.openAiDailyAnalysisLimit)} />
                  </div>
                </section>

                <section className="rounded-md border border-border p-4">
                  <h4 className="font-semibold">Evidence, cache i notyfikacje</h4>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <Info label="Cache TTL" value={`${initialData.settingsSummary.externalResearchCacheTtlHours}h`} />
                    <Info label="Sent 24h" value={String(initialData.notificationSummary.sent24h)} />
                    <Info label="Failed 24h" value={String(initialData.notificationSummary.failed24h)} />
                    <Info label="Skipped 24h" value={String(initialData.notificationSummary.skipped24h)} />
                    <Info label="Windows" value={String(initialData.settingsSummary.windowsNotificationsEnabled)} />
                    <Info label="Discord" value={initialData.settingsSummary.discordWebhookConfigured ? "configured" : "missing"} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => runAction(() => clearExpiredExternalCacheAction(), "Wygasly cache wyczyszczony.")} disabled={isPending}>
                      Wyczysc cache
                    </Button>
                    <Button variant="secondary" onClick={() => runAction(() => clearOldNotificationLogsAction(30), "Stare logi powiadomien wyczyszczone.")} disabled={isPending}>
                      Wyczysc logi 30d+
                    </Button>
                    <Button variant="secondary" onClick={() => runAction(() => testNotificationAction(), "Test notification wykonany.")} disabled={isPending}>
                      <Bell className="h-4 w-4" /> Test notification
                    </Button>
                  </div>
                </section>
              </div>
              <section className="mt-4 rounded-md border border-border p-4">
                <h4 className="font-semibold">Dane i maintenance</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={openDailyBriefing} disabled={isPending}>
                    <CalendarClock className="h-4 w-4" /> Daily briefing
                  </Button>
                  <Button variant="secondary" onClick={downloadIdeasCsv} disabled={isPending}>
                    <Download className="h-4 w-4" /> Export ideas CSV
                  </Button>
                  <Button variant="danger" onClick={pruneSnapshotsWithConfirmation} disabled={isPending}>
                    Prune snapshots 180d+
                  </Button>
                </div>
              </section>
            </section>
          ) : null}
        </section>
      </div>

      {ideaDetail ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={() => setIdeaDetail(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="mx-auto max-h-[92vh] max-w-4xl overflow-auto rounded-lg border border-border bg-card p-5 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-border bg-card pb-4">
              <div>
                <h2 className="text-xl font-semibold">{ideaDetail.title}</h2>
                <p className="text-sm text-muted-foreground">{ideaDetail.sourceRepoName}</p>
              </div>
              <Button variant="secondary" onClick={() => setIdeaDetail(null)}>
                Zamknij
              </Button>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <Info label="Opportunity" value={ideaDetail.opportunityScore === null ? "brak" : `${ideaDetail.opportunityScore}/100`} />
              <Info label="Confidence" value={ideaDetail.confidenceScore === null ? "brak" : `${ideaDetail.confidenceScore}/5`} />
              <Info label="Status" value={ideaDetail.status} />
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6">
              <p>{ideaDetail.problem}</p>
              <p>{ideaDetail.proposedSolution}</p>
              {ideaDetail.businessRationale ? <p>{ideaDetail.businessRationale}</p> : null}
              {ideaDetail.marketSummary ? <p className="rounded-md border border-border bg-muted p-3">{ideaDetail.marketSummary}</p> : null}
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Info label="Target user" value={ideaDetail.targetUser} />
              <Info label="MVP" value={ideaDetail.mvpScope} />
              <Info label="Monetyzacja" value={ideaDetail.monetizationPotential} />
              <Info label="Stack" value={ideaDetail.suggestedStack} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ideaDetail.status !== IDEA_STATUS.DISMISSED ? (
                <Button
                  variant="secondary"
                  onClick={(event) => repoAction(event, () => promoteCandidateToFullIdeaAction(ideaDetail.id), "Pelny pomysl zostal utworzony.")}
                  disabled={isPending || ideaDetail.status === IDEA_STATUS.FULL}
                >
                  <Brain className="h-4 w-4" /> Rozwin pelny pomysl
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={(event) => repoAction(event, () => updateIdeaStatusAction(ideaDetail.id, IDEA_STATUS.SAVED), "Pomysl zapisany.")}
                disabled={isPending}
              >
                <Star className="h-4 w-4" /> Zapisz
              </Button>
              <Button
                variant="danger"
                onClick={(event) => repoAction(event, () => updateIdeaStatusAction(ideaDetail.id, IDEA_STATUS.DISMISSED), "Pomysl odrzucony.")}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" /> Odrzuc
              </Button>
            </div>
            <EvidenceSources sources={ideaDetail.evidenceSources} emptyText="Brak zapisanych zrodel dla tego kandydata." />
          </div>
        </div>
      ) : null}

      {report ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={() => setReport(null)}>
          <div
            ref={reportDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="repo-report-dialog-title"
            tabIndex={-1}
            className="mx-auto max-h-[92vh] max-w-5xl overflow-auto rounded-lg border border-border bg-card p-5 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-border bg-card pb-4">
              <div>
                <h2 id="repo-report-dialog-title" className="text-xl font-semibold">{report.title}</h2>
                {report.path ? <p className="text-sm text-muted-foreground">Zapisano: {report.path}</p> : null}
              </div>
              <Button variant="secondary" onClick={() => setReport(null)}>
                Zamknij
              </Button>
            </div>
            <ReportViewer content={report.content} sources={report.evidenceSources} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function parseReportSections(content: string) {
  const lines = content.split(/\r?\n/);
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = "Raport";
  let currentBody: string[] = [];

  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) {
      if (currentBody.join("\n").trim()) {
        sections.push({ title: currentTitle, body: currentBody.join("\n").trim() });
      }
      currentTitle = match[1].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentBody.join("\n").trim()) {
    sections.push({ title: currentTitle, body: currentBody.join("\n").trim() });
  }

  return sections.length ? sections : [{ title: "Raport", body: content }];
}

function sentimentClass(sentiment: string | null) {
  const normalized = sentiment?.toLowerCase() ?? "";
  if (normalized.includes("positive")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (normalized.includes("negative")) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (normalized.includes("mixed")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-border bg-muted text-muted-foreground";
}

function EvidenceSources({ sources, emptyText }: { sources: EvidenceSourceItem[]; emptyText: string }) {
  const confidenceValues = sources
    .map((source) => source.sourceConfidence)
    .filter((score): score is number => typeof score === "number");
  const averageConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, score) => sum + score, 0) / confidenceValues.length)
    : null;
  const independentSourceCount = new Set(
    sources.map((source) => source.publisher || source.sourceType || source.canonicalUrl || source.sourceKey).filter(Boolean)
  ).size;
  const evidenceKinds = [...new Set(sources.map((source) => source.evidenceKind).filter(Boolean))];
  const groups = groupEvidenceSources(sources);
  const conflictSummary = hasMixedEvidenceSentiment(sources)
    ? "Zrodla maja mieszany sentyment; warto sprawdzic, czy to realny pain point, czy tylko hype."
    : null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Evidence</h4>
        {sources.length ? <Badge>{sources.length} sources</Badge> : null}
        {sources.length ? <Badge>{independentSourceCount} independent</Badge> : null}
        {averageConfidence !== null ? <Badge>Avg confidence {averageConfidence}/100</Badge> : null}
      </div>
      {sources.length ? (
        <>
          <div className="mt-2 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            <div>
              Glowne typy evidence: {evidenceKinds.length ? evidenceKinds.map(evidenceKindLabel).join(", ") : "brak klasyfikacji"}.
            </div>
            {conflictSummary ? <div className="mt-1 text-amber-800">{conflictSummary}</div> : null}
          </div>
          <div className="mt-3 space-y-3">
            {groups.map((group) => (
              <section key={group.label} className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h5 className="text-sm font-semibold">{group.label}</h5>
                  <Badge>{group.sources.length}</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {group.sources.map((source) => (
                    <EvidenceSourceCard key={source.id} source={source} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 rounded-md border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">
          {emptyText} Research moze byc wylaczony, provider mogl nie zwrocic wynikow albo uzyto cache bez zapisanych zrodel.
        </p>
      )}
    </div>
  );
}

function evidenceKindLabel(kind: string | null) {
  const labels: Record<string, string> = {
    demand_signal: "Demand",
    pain_point: "Pain points",
    alternative: "Alternatives",
    competitor: "Competitors",
    pricing: "Pricing",
    manual_workflow: "Manual workflow",
    automation_request: "Automation",
    risk: "Risks",
    technical_context: "Technical context",
    launch_signal: "Launch signal",
    other: "Other"
  };
  return kind ? labels[kind] ?? kind : "Other";
}

function evidenceGroup(source: EvidenceSourceItem) {
  if (source.evidenceKind === "demand_signal" || source.evidenceKind === "launch_signal") {
    return "Demand";
  }
  if (source.evidenceKind === "pain_point") {
    return "Pain points";
  }
  if (source.evidenceKind === "alternative" || source.evidenceKind === "competitor" || source.evidenceKind === "pricing") {
    return "Alternatives / competitors";
  }
  if (source.evidenceKind === "manual_workflow" || source.evidenceKind === "automation_request") {
    return "Manual workflow / automation";
  }
  if (source.evidenceKind === "risk") {
    return "Risks";
  }
  return "Other";
}

function groupEvidenceSources(sources: EvidenceSourceItem[]) {
  const order = ["Demand", "Pain points", "Alternatives / competitors", "Manual workflow / automation", "Risks", "Other"];
  return order
    .map((label) => ({
      label,
      sources: sources.filter((source) => evidenceGroup(source) === label)
    }))
    .filter((group) => group.sources.length);
}

function hasMixedEvidenceSentiment(sources: EvidenceSourceItem[]) {
  const sentiments = new Set(sources.map((source) => source.sentiment?.toLowerCase()).filter(Boolean));
  return sentiments.has("positive") && (sentiments.has("negative") || sentiments.has("mixed"));
}

function EvidenceSourceCard({ source }: { source: EvidenceSourceItem }) {
  const safeUrl = sanitizeExternalUrl(source.url);
  const content = (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge>{source.sourceType}</Badge>
        {source.evidenceKind ? <Badge>{evidenceKindLabel(source.evidenceKind)}</Badge> : null}
        {source.sourceConfidence !== null ? <Badge>Conf {source.sourceConfidence}/100</Badge> : null}
        {source.sentiment ? <Badge className={sentimentClass(source.sentiment)}>{source.sentiment}</Badge> : null}
        {source.relevanceScore !== null ? <Badge>Rel {source.relevanceScore}/100</Badge> : null}
        {!safeUrl ? <Badge>URL blocked</Badge> : null}
      </div>
      <div className="font-medium leading-5">{source.title}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        {[source.publisher, source.publishedAt ? formatDate(source.publishedAt) : null].filter(Boolean).join(" | ")}
      </p>
      {source.whatItProves ? <p className="mt-2 rounded border border-border bg-muted px-2 py-1 text-xs">{source.whatItProves}</p> : null}
      <p className="mt-2 line-clamp-4 text-muted-foreground">{source.snippet}</p>
    </>
  );

  if (!safeUrl) {
    return <div className="block rounded-md border border-border bg-background p-3 text-sm">{content}</div>;
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-md border border-border bg-background p-3 text-sm transition hover:border-primary/50"
    >
      {content}
    </a>
  );
}

function ReportViewer({ content, sources }: { content: string; sources: EvidenceSourceItem[] }) {
  const sections = parseReportSections(content);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="hidden rounded-md border border-border bg-muted p-3 text-sm lg:block">
        <div className="mb-2 font-semibold">Sekcje</div>
        <nav className="space-y-1">
          {sections.slice(0, 18).map((section, index) => (
            <a key={`${section.title}-${index}`} href={`#report-section-${index}`} className="block rounded px-2 py-1 text-muted-foreground hover:bg-card hover:text-foreground">
              {section.title}
            </a>
          ))}
        </nav>
      </aside>
      <article className="min-w-0 space-y-3">
        {sections.map((section, index) => (
          <section id={`report-section-${index}`} key={`${section.title}-${index}`} className="rounded-md border border-border bg-muted p-4">
            <h3 className="text-base font-semibold">{section.title}</h3>
            <pre className="repo-report mt-2 whitespace-pre-wrap break-words text-sm leading-6">{section.body}</pre>
          </section>
        ))}
        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">Zrodla i dowody</h3>
            {sources.length ? <Badge>{sources.length} sources</Badge> : null}
          </div>
          <EvidenceSources sources={sources} emptyText="Ten raport nie ma zapisanych zrodel market research." />
        </section>
      </article>
    </div>
  );
}

function ActionItemCard({
  item,
  isPending,
  onComplete,
  onSnooze,
  onDismiss
}: {
  item: ActionItemListItem;
  isPending: boolean;
  onComplete: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const target = item.repoFullName ?? item.ideaTitle ?? item.reportTitle ?? "bez powiazania";

  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{item.title}</h4>
            <Badge>{formatActionItemType(item.type)}</Badge>
            <Badge>{formatActionItemStatus(item.status)}</Badge>
            {item.priority ? <Badge>Priority {item.priority}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{target}</p>
          {item.description ? <p className="mt-2 text-sm">{item.description}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.dueAt ? <span>Due: {formatDate(item.dueAt)}</span> : null}
            {item.snoozedUntil ? <span>Snooze: {formatDate(item.snoozedUntil)}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onComplete} disabled={isPending || item.status === "DONE"}>
            <CheckCircle2 className="h-4 w-4" /> Done
          </Button>
          <Button variant="secondary" onClick={onSnooze} disabled={isPending || item.status === "DONE" || item.status === "DISMISSED"}>
            <CalendarClock className="h-4 w-4" /> Jutro
          </Button>
          <Button variant="danger" onClick={onDismiss} disabled={isPending || item.status === "DISMISSED"}>
            <Trash2 className="h-4 w-4" /> Odrzuc
          </Button>
        </div>
      </div>
    </article>
  );
}

function RadarRepoCompactSection({
  title,
  repositories,
  empty
}: {
  title: string;
  repositories: RepositoryListItem[];
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">
        {repositories.length ? (
          repositories.map((repo) => (
            <article key={repo.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold">{repo.fullName}</h4>
                <Badge>Trend {repo.trendScore}</Badge>
                <Badge>{formatCompactNumber(repo.starsCurrent)} stars</Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{repo.shortSummaryPl ?? repo.description ?? "Brak opisu."}</p>
            </article>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </section>
  );
}

function ScoreBreakdownPanel({ repo }: { repo: RepositoryListItem }) {
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
        <Badge>Trend {repo.trendScore}/100</Badge>
        <Badge>Initial momentum {repo.initialMomentumScore}/100</Badge>
        {repo.discoveryProfiles.map((profile) => (
          <Badge key={profile}>{discoveryProfileLabel(profile)}</Badge>
        ))}
      </div>
      {repo.growth7d === null ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Brak lokalnej historii 7d. RepoRadar pokazuje initial momentum jako osobny fallback, ale nie udaje realnego weekly growth.
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

function SafeRepoLink({ url }: { url: string }) {
  const safeUrl = sanitizeExternalUrl(url);

  if (!safeUrl || !safeUrl.startsWith("https://github.com/")) {
    return (
      <Button variant="ghost" type="button" disabled>
        <ExternalLink className="h-4 w-4" /> Link zablokowany
      </Button>
    );
  }

  return (
    <a href={safeUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
      <Button variant="ghost" type="button">
        <ExternalLink className="h-4 w-4" /> Otworz na GitHubie
      </Button>
    </a>
  );
}

function Metric({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border border-border bg-muted p-2", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
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

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  onSave
}: {
  label: string;
  description: string;
  onSave: (value: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">{label}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          className={cn(
            "h-6 w-11 rounded-full border border-border p-0.5 transition",
            enabled ? "bg-primary" : "bg-muted"
          )}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            onSave(next);
          }}
        >
          <span
            className={cn(
              "block h-4 w-4 rounded-full bg-card transition",
              enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </div>
  );
}
