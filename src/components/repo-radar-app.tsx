"use client";

import { useMemo, useState, useTransition } from "react";
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
import type { DashboardData, RepositoryListItem } from "@/types/repository";
import { REPOSITORY_STATUSES, formatStatus } from "@/types/status";
import {
  createWeeklyReportAction,
  generateIdeaAction,
  generateReportAction,
  runScanAction,
  updateSettingAction,
  updateStatusAction
} from "@/app/actions";
import { cn, formatCompactNumber, formatDate } from "@/lib/utils";

type TabKey =
  | "library"
  | "new"
  | "saved"
  | "read"
  | "ignored"
  | "ideas"
  | "weekly"
  | "old"
  | "settings";

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "library", label: "Biblioteka", icon: Github },
  { key: "new", label: "Nowo znalezione", icon: Sparkles },
  { key: "saved", label: "Zapisane", icon: Star },
  { key: "read", label: "Przeczytane", icon: BookOpen },
  { key: "ignored", label: "Ignorowane", icon: Trash2 },
  { key: "ideas", label: "Pomysły", icon: Brain },
  { key: "weekly", label: "Raporty tygodniowe", icon: FileText },
  { key: "old", label: "Stare repo", icon: CheckCircle2 },
  { key: "settings", label: "Ustawienia", icon: Settings }
];

type ReportState = {
  title: string;
  content: string;
  path: string | null;
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
  const [activeTab, setActiveTab] = useState<TabKey>("library");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [minTrend, setMinTrend] = useState(0);
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);
  const [report, setReport] = useState<ReportState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const languages = useMemo(
    () =>
      [...new Set(initialData.repositories.map((repo) => repo.primaryLanguage).filter(Boolean) as string[])].sort(),
    [initialData.repositories]
  );

  const visibleRepositories = useMemo(() => {
    return filterByTab(activeTab, initialData.repositories)
      .filter((repo) => repoMatchesQuery(repo, query))
      .filter((repo) => (statusFilter === "ALL" ? true : repo.status === statusFilter))
      .filter((repo) => (languageFilter === "ALL" ? true : repo.primaryLanguage === languageFilter))
      .filter((repo) => repo.trendScore >= minTrend);
  }, [activeTab, initialData.repositories, languageFilter, minTrend, query, statusFilter]);

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
        path: generated.markdownPath
      });
    }, force ? "Raport został zregenerowany." : "Raport jest gotowy.");
  }

  function repoAction(event: React.MouseEvent, action: () => Promise<unknown>, success: string) {
    event.stopPropagation();
    runAction(action, success);
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
            <nav className="space-y-1">
              {tabs.map((tab) => {
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
                      {tab.label}
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
            <select
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm font-medium shadow-soft"
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as TabKey)}
            >
              {tabs.map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {tab.label}
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
                </div>
                <h2 className="text-2xl font-semibold">{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
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

          {activeTab !== "ideas" && activeTab !== "weekly" && activeTab !== "settings" ? (
            <>
              <section className="mb-4 rounded-lg border border-border bg-card p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_160px]">
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
                          </div>
                          <p className="text-sm text-muted-foreground">{repo.description ?? "Brak opisu w GitHub metadata."}</p>
                          {repo.shortSummaryPl ? (
                            <p className="mt-3 text-sm leading-6">{repo.shortSummaryPl}</p>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Krótki opis PL nie został jeszcze wygenerowany.</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {repo.topics.slice(0, 8).map((topic) => (
                              <Badge key={topic}>{topic}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid min-w-[280px] grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:text-right">
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
                            <Info label="Źródło" value={repo.source} />
                          </div>
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
                              variant="danger"
                              onClick={(event) => repoAction(event, () => updateStatusAction(repo.id, "IGNORED"), "Repo przeniesione do ignorowanych.")}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" /> Ignoruj
                            </Button>
                            <a href={repo.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                              <Button variant="ghost" type="button">
                                <ExternalLink className="h-4 w-4" /> Otwórz na GitHubie
                              </Button>
                            </a>
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

          {activeTab === "ideas" ? (
            <section className="space-y-3">
              {initialData.ideas.length ? (
                initialData.ideas.map((idea) => (
                  <article key={idea.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{idea.title}</h3>
                      <Badge>{idea.sourceRepoName}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{idea.problem}</p>
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      <Info label="Dla kogo" value={idea.targetUser} />
                      <Info label="Trudność" value={`${idea.difficulty}/5`} />
                      <Info label="Potencjał" value={`${idea.usefulnessScore}/5`} />
                    </div>
                    <p className="mt-3 text-sm">{idea.proposedSolution}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Stack: {idea.suggestedStack}</p>
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
              <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                GitHub token: Fine-grained PAT, read-only public repositories. OpenAI: pełne raporty i pomysły tylko na żądanie.
                Windows Task Scheduler: `scripts/register-windows-task.ps1`.
              </div>
            </section>
          ) : null}
        </section>
      </div>

      {report ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={() => setReport(null)}>
          <div
            className="mx-auto max-h-[92vh] max-w-5xl overflow-auto rounded-lg border border-border bg-card p-5 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{report.title}</h2>
                {report.path ? <p className="text-sm text-muted-foreground">Zapisano: {report.path}</p> : null}
              </div>
              <Button variant="secondary" onClick={() => setReport(null)}>
                Zamknij
              </Button>
            </div>
            <article className="repo-report rounded-md bg-muted p-4 text-sm">{report.content}</article>
          </div>
        </div>
      ) : null}
    </main>
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
