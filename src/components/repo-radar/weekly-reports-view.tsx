"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import type { ReportListItem, WeeklyReportComparison } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { buildWeeklyReportComparison } from "@/lib/reports/weekly-comparison";
import { formatDate } from "@/lib/utils";
import { Badge, Button, EmptyState, MetricPill, SectionCard, TextClamp } from "./ui";

export const WEEKLY_REPORT_SEARCH_QUERY_LIMIT = 120;
export const WEEKLY_REPORT_MARKDOWN_PREVIEW_LIMIT = 12000;
const WEEKLY_REPORT_SEARCH_FIELD_LIMIT = 20000;

export function WeeklyReportsView({ reports, comparison: panelComparison }: { reports: ReportListItem[]; comparison?: WeeklyReportComparison | null }) {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = normalizeWeeklyReportSearchQuery(searchQuery);
  const filteredReports = useMemo(() => filterWeeklyReports(reports, normalizedSearchQuery), [reports, normalizedSearchQuery]);
  const hasActiveSearch = normalizedSearchQuery.length > 0;
  const resetSearch = () => setSearchQuery("");

  if (!reports.length) {
    return (
      <SectionCard title="Raporty tygodniowe" description="Lokalne podsumowania zapisane jako markdown.">
        <EmptyState title="Brak raportow tygodniowych" text="Kliknij Raport tygodniowy, zeby wygenerowac plik markdown." />
      </SectionCard>
    );
  }

  const latestReport = reports[0];
  const previousReport = reports[1] ?? null;
  const comparison = panelComparison ?? buildWeeklyReportComparison(latestReport, previousReport);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricPill label="Raporty" value={reports.length} />
        <MetricPill label="Ostatni" value={formatDate(latestReport.createdAt)} />
        <MetricPill label="Repo w ostatnim" value={latestReport.repoCount} />
      </div>

      <WeeklyComparisonPanel latest={latestReport} previous={previousReport} comparison={comparison} />

      <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Szukaj raportow tygodniowych</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              className="h-9 w-full rounded-md border border-control-border bg-control px-3 pl-9 text-sm text-foreground outline-none transition duration-fast ease-interface focus:border-primary focus:ring-2 focus:ring-focus/30"
              value={searchQuery}
              maxLength={WEEKLY_REPORT_SEARCH_QUERY_LIMIT}
              onChange={(event) => setSearchQuery(event.target.value.slice(0, WEEKLY_REPORT_SEARCH_QUERY_LIMIT))}
              placeholder="Szukaj po tytule, streszczeniu, pliku albo tresci..."
            />
          </label>
          <Button variant="ghost" size="sm" onClick={resetSearch} disabled={!hasActiveSearch} className="h-9">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold uppercase text-muted-foreground">Archiwum raportow</span>
          {hasActiveSearch ? (
            <span className="tabular-nums text-foreground">
              Pokazano {filteredReports.length} z {reports.length}
            </span>
          ) : (
            <span>Wpisz tekst, zeby zawezyc liste raportow.</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filteredReports.length ? (
          filteredReports.map((weeklyReport) => (
            <WeeklyReportArticle key={weeklyReport.id} weeklyReport={weeklyReport} />
          ))
        ) : (
          <EmptyState
            title="Brak raportow dla tego wyszukiwania"
            text="Zmien tekst albo wyczysc wyszukiwanie, zeby zobaczyc wszystkie lokalne raporty tygodniowe."
            primaryAction={
              <Button variant="secondary" size="sm" onClick={resetSearch}>
                Pokaz wszystkie raporty
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
}

function WeeklyReportArticle({ weeklyReport }: { weeklyReport: ReportListItem }) {
  const markdownPreview = buildWeeklyReportMarkdownPreview(weeklyReport.contentMarkdown);

  return (
    <article className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold">{cleanDisplayText(weeklyReport.title, { maxLength: 140 })}</h3>
            <Badge variant="source">{formatDate(weeklyReport.createdAt)}</Badge>
            <Badge variant="score">{weeklyReport.repoCount} repo</Badge>
          </div>
          {weeklyReport.summary ? (
            <TextClamp lines={2} className="mt-2">
              {cleanDisplayText(weeklyReport.summary, { maxLength: 280 })}
            </TextClamp>
          ) : null}
          {weeklyReport.markdownPath ? <p className="mt-2 break-words text-xs text-muted-foreground">Plik: {weeklyReport.markdownPath}</p> : null}
        </div>
      </div>

      <details className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3">
        <summary className="cursor-pointer text-sm font-semibold">Podglad surowego raportu tygodniowego</summary>
        {markdownPreview.isTruncated ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Podglad uciety do {WEEKLY_REPORT_MARKDOWN_PREVIEW_LIMIT.toLocaleString("pl-PL")} znakow. Pominieto{" "}
            {markdownPreview.omittedCharacters.toLocaleString("pl-PL")} znakow; pelny raport pozostaje zapisany lokalnie.
          </p>
        ) : null}
        <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
          {markdownPreview.content}
        </pre>
      </details>
    </article>
  );
}

export function filterWeeklyReports(reports: ReportListItem[], query: string) {
  const normalizedQuery = normalizeWeeklyReportSearchQuery(query);
  if (!normalizedQuery) {
    return reports;
  }

  return reports.filter((report) => buildWeeklyReportSearchText(report).includes(normalizedQuery));
}

export function normalizeWeeklyReportSearchQuery(value: string) {
  return cleanLimitedWeeklyReportText(value, WEEKLY_REPORT_SEARCH_QUERY_LIMIT).toLowerCase();
}

export function buildWeeklyReportMarkdownPreview(markdown: string) {
  const content = markdown.slice(0, WEEKLY_REPORT_MARKDOWN_PREVIEW_LIMIT);
  const omittedCharacters = Math.max(0, markdown.length - content.length);

  return {
    content,
    isTruncated: omittedCharacters > 0,
    omittedCharacters
  };
}

function buildWeeklyReportSearchText(report: ReportListItem) {
  return [
    report.title,
    report.summary,
    report.markdownPath,
    report.contentMarkdown,
    report.createdAt,
    formatDate(report.createdAt),
    `${report.repoCount} repo`
  ]
    .map((value) => cleanLimitedWeeklyReportText(value, WEEKLY_REPORT_SEARCH_FIELD_LIMIT))
    .join(" ")
    .toLowerCase();
}

function cleanLimitedWeeklyReportText(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return "";
  }

  return cleanDisplayText(value.slice(0, maxLength), { maxLength });
}

function WeeklyComparisonPanel({
  latest,
  previous,
  comparison
}: {
  latest: ReportListItem;
  previous: ReportListItem | null;
  comparison: WeeklyReportComparison;
}) {
  if (!previous) {
    return (
      <SectionCard title="Porownanie tydzien do tygodnia" description="Potrzebne sa co najmniej dwa raporty tygodniowe.">
        <EmptyState
          title="Brak poprzedniego raportu"
          text="Wygeneruj kolejny raport tygodniowy, zeby zobaczyc repo, ktore zostaly, doszly albo wypadly z top list."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Porownanie tydzien do tygodnia" description={`${formatDate(latest.createdAt)} vs ${formatDate(previous.createdAt)}`}>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricPill label="Zmiana repo" value={`${formatSignedNumber(comparison.repoCountDelta ?? 0)} (${comparison.currentRepoCount} vs ${comparison.previousRepoCount})`} />
        <MetricPill label="Zostaly w top" value={comparison.retained.length} />
        <MetricPill label="Nowe w top" value={comparison.added.length} />
        <MetricPill label="Wypadly" value={comparison.dropped.length} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <WeeklyRepoGroup title="Nowe sygnaly" names={comparison.added} tone="success" empty="Brak nowych repo w top listach." />
        <WeeklyRepoGroup title="Stabilne sygnaly" names={comparison.retained} tone="info" empty="Brak wspolnych repo w porownaniu." />
        <WeeklyRepoGroup title="Slabsze niz poprzednio" names={comparison.dropped} tone="warning" empty="Nic nie wypadlo z top list." />
      </div>
    </SectionCard>
  );
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function WeeklyRepoGroup({
  title,
  names,
  tone,
  empty
}: {
  title: string;
  names: string[];
  tone: "success" | "info" | "warning";
  empty: string;
}) {
  const visibleNames = names.slice(0, 8);
  const hiddenCount = Math.max(0, names.length - visibleNames.length);

  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-surface-inset p-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {names.length ? (
          visibleNames.map((name) => (
            <Badge key={name} tone={tone} className="max-w-full min-w-0">
              <span className="truncate" title={name}>
                {cleanDisplayText(name, { maxLength: 44 })}
              </span>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
        {hiddenCount ? (
          <Badge tone="neutral" variant="score">
            +{hiddenCount}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
