import type { EvidenceSourceItem } from "@/types/repository";
import { parseReportForDisplay } from "@/lib/display/report-display";
import { EvidencePanel } from "./evidence-panel";
import { DecisionBox } from "./decision-box";
import { ExecutiveSummary } from "./executive-summary";
import { ReportSection } from "./report-section";
import { SectionCard } from "./ui";

export function ReportView({ content, sources }: { content: string; sources: EvidenceSourceItem[] }) {
  const report = parseReportForDisplay(content);
  const decisionSection = report.sections.find((section) => section.kind === "decision") ?? null;
  const executiveSummary = report.sections.find((section) => section.kind === "executive_summary") ?? null;
  const structuralSections = report.sections.filter((section) => section !== decisionSection && section !== executiveSummary);

  return (
    <div className="print-report-layout grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="print-hidden hidden rounded-md border border-border bg-muted p-3 text-sm lg:block">
        <div className="mb-2 font-semibold">Sekcje</div>
        <nav className="space-y-1">
          {structuralSections.slice(0, 18).map((section, index) => (
            <a key={`${section.title}-${index}`} href={`#report-section-${index}`} className="block rounded px-2 py-1 text-muted-foreground hover:bg-card hover:text-foreground">
              {section.title}
            </a>
          ))}
        </nav>
      </aside>
      <article className="print-report-body min-w-0 space-y-4">
        <DecisionBox section={decisionSection} />
        <ExecutiveSummary section={executiveSummary} />
        {structuralSections.map((section, index) => (
          <ReportSection key={`${section.title}-${index}`} section={section} index={index} />
        ))}
        <SectionCard title="Zrodla i dowody">
          <EvidencePanel sources={sources} emptyText="Ten raport nie ma zapisanych zrodel market research." />
        </SectionCard>
        <details className="print-hidden rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">Surowy raport</summary>
          <pre className="repo-report mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs leading-5">
            {report.rawMarkdown}
          </pre>
        </details>
      </article>
    </div>
  );
}
