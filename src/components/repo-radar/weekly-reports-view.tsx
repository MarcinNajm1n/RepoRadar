"use client";

import type { ReportListItem } from "@/types/repository";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDate } from "@/lib/utils";
import { Badge, EmptyState, MetricPill, SectionCard, TextClamp } from "./ui";

export function WeeklyReportsView({ reports }: { reports: ReportListItem[] }) {
  if (!reports.length) {
    return (
      <SectionCard title="Raporty tygodniowe" description="Lokalne podsumowania zapisane jako markdown.">
        <EmptyState title="Brak raportow tygodniowych" text="Kliknij Raport tygodniowy, zeby wygenerowac plik markdown." />
      </SectionCard>
    );
  }

  const latestReport = reports[0];

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricPill label="Raporty" value={reports.length} />
        <MetricPill label="Ostatni" value={formatDate(latestReport.createdAt)} />
        <MetricPill label="Repo w ostatnim" value={latestReport.repoCount} />
      </div>

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
