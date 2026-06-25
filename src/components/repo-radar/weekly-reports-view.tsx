"use client";

import type { ReportListItem, WeeklyReportComparison } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { buildWeeklyReportComparison } from "@/lib/reports/weekly-comparison";
import { formatDate } from "@/lib/utils";
import { Badge, EmptyState, MetricPill, SectionCard, TextClamp } from "./ui";

export function WeeklyReportsView({ reports, comparison: panelComparison }: { reports: ReportListItem[]; comparison?: WeeklyReportComparison | null }) {
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

      <div className="space-y-3">
        {reports.map((weeklyReport) => (
          <article key={weeklyReport.id} className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-base font-semibold">
                    {cleanDisplayText(weeklyReport.title, { maxLength: 140 })}
                  </h3>
                  <Badge variant="source">{formatDate(weeklyReport.createdAt)}</Badge>
                  <Badge variant="score">{weeklyReport.repoCount} repo</Badge>
                </div>
                {weeklyReport.summary ? (
                  <TextClamp lines={2} className="mt-2">
                    {cleanDisplayText(weeklyReport.summary, { maxLength: 280 })}
                  </TextClamp>
                ) : null}
                {weeklyReport.markdownPath ? (
                  <p className="mt-2 break-words text-xs text-muted-foreground">Plik: {weeklyReport.markdownPath}</p>
                ) : null}
              </div>
            </div>

            <details className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3">
              <summary className="cursor-pointer text-sm font-semibold">Surowy raport tygodniowy</summary>
              <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
                {weeklyReport.contentMarkdown}
              </pre>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
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
