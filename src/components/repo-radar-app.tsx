"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flame,
  Github,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";
import type { DashboardData, EvidenceSourceItem, IdeaListItem, RepositoryListItem } from "@/types/repository";
import { REPOSITORY_STATUSES, formatStatus } from "@/types/status";
import {
  createWeeklyReportAction,
  generateIdeaAction,
  generateOpportunityCandidateAction,
  generateReportAction,
  runScanAction,
  updateSettingAction,
  updateStatusAction
} from "@/app/actions";
import { cn, formatCompactNumber, formatDate, sanitizeExternalUrl } from "@/lib/utils";

type TabKey =
  | "library"
  | "new"
  | "saved"
  | "read"
  | "ignored"
  | "candidates"
  | "ideas"
  | "weekly"
  | "old"
  | "settings";

type SectionKey = "repo" | "ideas";

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; section?: SectionKey }> = [
  { key: "library", label: "Biblioteka", icon: Github, section: "repo" },
  { key: "new", label: "Nowo znalezione", icon: Sparkles, section: "repo" },
  { key: "saved", label: "Zapisane", icon: Star, section: "repo" },
  { key: "read", label: "Przeczytane", icon: BookOpen, section: "repo" },
  { key: "ignored", label: "Ignorowane", icon: Trash2, section: "repo" },
  { key: "ideas", label: "Pomysły", icon: Brain },
  { key: "candidates", label: "Kandydaci", icon: Search, section: "ideas" },
  { key: "weekly", label: "Raporty tygodniowe", icon: FileText, section: "repo" },
  { key: "old", label: "Stare repo", icon: CheckCircle2, section: "repo" },
  { key: "settings", label: "Ustawienia", icon: Settings, section: "repo" }
];

function getTabSection(tab: (typeof tabs)[number]): SectionKey {
  return tab.section ?? (tab.key === "ideas" || tab.key === "candidates" ? "ideas" : "repo");
}

function getTabLabel(tab: (typeof tabs)[number]) {
  if (tab.key === "ideas") {
    return "Pelne pomysly";
  }
  if (tab.key === "candidates") {
    return "Kandydaci";
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

export function RepoRadarApp({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionKey>("repo");
  const [activeTab, setActiveTab] = useState<TabKey>("library");
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
  const candidates = useMemo(() => initialData.ideas.filter((idea) => idea.status === "CANDIDATE"), [initialData.ideas]);
  const fullIdeas = useMemo(() => initialData.ideas.filter((idea) => idea.status !== "CANDIDATE"), [initialData.ideas]);

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
                    setActiveTab(section === "repo" ? "library" : "candidates");
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
                    setActiveTab(section === "repo" ? "library" : "candidates");
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

          {activeTab !== "ideas" && activeTab !== "candidates" && activeTab !== "weekly" && activeTab !== "settings" ? (
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
                              <Search className="h-4 w-4" /> Znajdz okazje
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
                        onClick={(event) => repoAction(event, () => generateIdeaAction(idea.sourceRepoId), "Pelny pomysl zostal utworzony.")}
                        disabled={isPending}
                      >
                        <Brain className="h-4 w-4" /> Rozwin pelny pomysl
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
                  <Info label="HN" value="ENABLE_HN_SOURCE" />
                  <Info label="RSS" value="ENABLE_RSS_SOURCE + MARKET_RESEARCH_RSS_FEEDS" />
                  <Info label="OpenAI web search" value="ENABLE_OPENAI_WEB_SEARCH_SOURCE" />
                  <Info label="Auto opportunity" value="ENABLE_AUTO_OPPORTUNITY_RESEARCH" />
                  <Info label="Reddit OAuth" value="ENABLE_REDDIT_SOURCE + REDDIT_CLIENT_ID/SECRET" />
                  <Info label="Bluesky" value="ENABLE_BLUESKY_SOURCE" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Light uzywa HN/RSS/cache/OpenAI web search. Full moze uzyc Reddit i Bluesky tylko po wlaczeniu ich w .env.
                </p>
              </div>
              <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                GitHub token: Fine-grained PAT, read-only public repositories. OpenAI: pełne raporty i pomysły tylko na żądanie.
                Windows Task Scheduler: `scripts/register-windows-task.ps1`.
              </div>
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
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold">Evidence</h4>
      {sources.length ? (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {sources.map((source) => (
            <EvidenceSourceCard key={source.id} source={source} />
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-md border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function EvidenceSourceCard({ source }: { source: EvidenceSourceItem }) {
  const safeUrl = sanitizeExternalUrl(source.url);
  const content = (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge>{source.sourceType}</Badge>
        {source.sentiment ? <Badge className={sentimentClass(source.sentiment)}>{source.sentiment}</Badge> : null}
        {source.relevanceScore !== null ? <Badge>Rel {source.relevanceScore}/100</Badge> : null}
        {!safeUrl ? <Badge>URL blocked</Badge> : null}
      </div>
      <div className="font-medium leading-5">{source.title}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        {[source.publisher, source.publishedAt ? formatDate(source.publishedAt) : null].filter(Boolean).join(" | ")}
      </p>
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
