import type { EvidenceSourceItem } from "@/types/repository";
import { parseReportForDisplay, type ReportDisplaySection } from "@/lib/display/report-display";
import { EvidencePanel } from "./evidence-panel";
import { DecisionBox } from "./decision-box";
import { ExecutiveSummary } from "./executive-summary";
import { ReportSection } from "./report-section";
import { SectionCard } from "./ui";

export const REPORT_DISPLAY_MARKDOWN_LIMIT = 40000;
export const REPORT_DISPLAY_SECTION_LIMIT = 32;
export const REPORT_DISPLAY_SECTION_LINE_LIMIT = 80;
export const REPORT_RAW_MARKDOWN_PREVIEW_LIMIT = 16000;

export function ReportView({ content, sources }: { content: string; sources: EvidenceSourceItem[] }) {
  const displayMarkdown = buildReportDisplayMarkdownPreview(content);
  const report = parseReportForDisplay(displayMarkdown.content);
  const decisionSection = limitNullableReportSectionLines(report.sections.find((section) => section.kind === "decision") ?? null);
  const executiveSummary = limitNullableReportSectionLines(report.sections.find((section) => section.kind === "executive_summary") ?? null);
  const rawStructuralSections = report.sections.filter((section) => section.kind !== "decision" && section.kind !== "executive_summary");
  const visibleStructuralSections = rawStructuralSections.slice(0, REPORT_DISPLAY_SECTION_LIMIT).map(limitReportSectionLines);
  const omittedStructuralSections = Math.max(0, rawStructuralSections.length - visibleStructuralSections.length);
  const omittedRenderedLines =
    countOmittedSectionLines([decisionSection, executiveSummary]) + countOmittedSectionLines(visibleStructuralSections);
  const rawMarkdownPreview = buildReportRawMarkdownPreview(content);
  const isDisplayLimited = displayMarkdown.isTruncated || omittedStructuralSections > 0 || omittedRenderedLines > 0;

  return (
    <div className="print-report-layout grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="print-hidden hidden rounded-md border border-border bg-muted p-3 text-sm lg:block">
        <div className="mb-2 font-semibold">Sekcje</div>
        <nav className="space-y-1">
          {visibleStructuralSections.slice(0, 18).map((section, index) => (
            <a key={`${section.title}-${index}`} href={`#report-section-${index}`} className="block rounded px-2 py-1 text-muted-foreground hover:bg-card hover:text-foreground">
              {section.title}
            </a>
          ))}
        </nav>
      </aside>
      <article className="print-report-body min-w-0 space-y-4">
        {isDisplayLimited ? (
          <SectionCard title="Widok raportu ograniczony">
            <p className="text-sm leading-6 text-muted-foreground">
              UI pokazuje skrocony widok bardzo duzego raportu: pominieto {displayMarkdown.omittedCharacters.toLocaleString("pl-PL")} znakow wejscia,{" "}
              {omittedStructuralSections.toLocaleString("pl-PL")} sekcji i {omittedRenderedLines.toLocaleString("pl-PL")} linii. To ogranicza tylko renderowanie widoku.
            </p>
          </SectionCard>
        ) : null}
        <DecisionBox section={decisionSection} />
        <ExecutiveSummary section={executiveSummary} />
        {visibleStructuralSections.map((section, index) => (
          <ReportSection key={`${section.title}-${index}`} section={section} index={index} />
        ))}
        <SectionCard title="Zrodla i dowody">
          <EvidencePanel sources={sources} emptyText="Ten raport nie ma zapisanych zrodel market research." />
        </SectionCard>
        <details className="print-hidden rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">Podglad surowego raportu</summary>
          {rawMarkdownPreview.isTruncated ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Podglad uciety do {REPORT_RAW_MARKDOWN_PREVIEW_LIMIT.toLocaleString("pl-PL")} znakow. Pominieto{" "}
              {rawMarkdownPreview.omittedCharacters.toLocaleString("pl-PL")} znakow; to ogranicza tylko podglad raw.
            </p>
          ) : null}
          <pre className="repo-report mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs leading-5">
            {rawMarkdownPreview.content}
          </pre>
        </details>
      </article>
    </div>
  );
}

export function buildReportDisplayMarkdownPreview(markdown: string) {
  const content = markdown.slice(0, REPORT_DISPLAY_MARKDOWN_LIMIT);
  const omittedCharacters = Math.max(0, markdown.length - content.length);

  return {
    content,
    isTruncated: omittedCharacters > 0,
    omittedCharacters
  };
}

export function buildReportRawMarkdownPreview(markdown: string) {
  const content = markdown.slice(0, REPORT_RAW_MARKDOWN_PREVIEW_LIMIT);
  const omittedCharacters = Math.max(0, markdown.length - content.length);

  return {
    content,
    isTruncated: omittedCharacters > 0,
    omittedCharacters
  };
}

type LimitedReportDisplaySection = ReportDisplaySection & { omittedLines: number };

function limitNullableReportSectionLines(section: ReportDisplaySection | null) {
  if (!section) {
    return null;
  }

  return limitReportSectionLines(section);
}

function limitReportSectionLines(section: ReportDisplaySection): LimitedReportDisplaySection {
  const lines = section.lines.slice(0, REPORT_DISPLAY_SECTION_LINE_LIMIT);
  return {
    ...section,
    lines,
    omittedLines: Math.max(0, section.lines.length - lines.length)
  };
}

function countOmittedSectionLines(sections: Array<LimitedReportDisplaySection | null>) {
  return sections.reduce((total, section) => total + (section?.omittedLines ?? 0), 0);
}
