import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DialogShell } from "../../src/components/repo-radar/ui/dialog-shell";
import {
  buildReportDisplayMarkdownPreview,
  buildReportRawMarkdownPreview,
  REPORT_DISPLAY_MARKDOWN_LIMIT,
  REPORT_DISPLAY_SECTION_LIMIT,
  REPORT_DISPLAY_SECTION_LINE_LIMIT,
  REPORT_RAW_MARKDOWN_PREVIEW_LIMIT,
  ReportView
} from "../../src/components/repo-radar/report-view";

describe("report print rendering", () => {
  it("renders explicit print classes around report content and chrome", () => {
    const html = renderToStaticMarkup(
      createElement(ReportView, {
        content: `# Repo Report

## Werdykt
Czytac dalej.

## Executive summary
Dobry sygnal do portfolio.`,
        sources: []
      })
    );

    expect(html).toContain("print-report-layout");
    expect(html).toContain("print-report-body");
    expect(html).toContain("print-hidden");
    expect(html).toContain("Podglad surowego raportu");
  });

  it("builds a bounded raw markdown preview for full reports", () => {
    const markdown = `${"a".repeat(REPORT_RAW_MARKDOWN_PREVIEW_LIMIT)}tail-marker`;
    const preview = buildReportRawMarkdownPreview(markdown);

    expect(preview.content).toHaveLength(REPORT_RAW_MARKDOWN_PREVIEW_LIMIT);
    expect(preview.content).not.toContain("tail-marker");
    expect(preview.isTruncated).toBe(true);
    expect(preview.omittedCharacters).toBe("tail-marker".length);
  });

  it("builds a bounded display markdown preview before parsing full reports", () => {
    const markdown = `${"a".repeat(REPORT_DISPLAY_MARKDOWN_LIMIT)}tail-marker`;
    const preview = buildReportDisplayMarkdownPreview(markdown);

    expect(preview.content).toHaveLength(REPORT_DISPLAY_MARKDOWN_LIMIT);
    expect(preview.content).not.toContain("tail-marker");
    expect(preview.isTruncated).toBe(true);
    expect(preview.omittedCharacters).toBe("tail-marker".length);
  });

  it("does not render the full raw markdown when the report is oversized", () => {
    const markdown = `# Huge report\n\n${"a".repeat(REPORT_RAW_MARKDOWN_PREVIEW_LIMIT)}tail-marker`;
    const html = renderToStaticMarkup(createElement(ReportView, { content: markdown, sources: [] }));

    expect(html).toContain("Podglad uciety do");
    expect(html).toContain("to ogranicza tylko podglad raw");
    expect(html).not.toContain("tail-marker");
  });

  it("does not render report sections beyond the display section limit", () => {
    const sectionFiller = "a".repeat(620);
    const sections = Array.from({ length: REPORT_DISPLAY_SECTION_LIMIT + 2 }, (_, index) =>
      [`## Sekcja ${index + 1}`, `${sectionFiller} ${index >= REPORT_DISPLAY_SECTION_LIMIT ? "tail-marker" : ""}`].join("\n")
    ).join("\n\n");
    const html = renderToStaticMarkup(createElement(ReportView, { content: `# Huge report\n\n${sections}`, sources: [] }));

    expect(html).toContain("Widok raportu ograniczony");
    expect(html).toContain("sekcji");
    expect(html).not.toContain("tail-marker");
  });

  it("does not render lines beyond the per-section display limit", () => {
    const lineFiller = "a".repeat(220);
    const lines = Array.from({ length: REPORT_DISPLAY_SECTION_LINE_LIMIT + 2 }, (_, index) =>
      `${lineFiller} ${index >= REPORT_DISPLAY_SECTION_LINE_LIMIT ? "tail-marker" : index}`
    ).join("\n");
    const html = renderToStaticMarkup(createElement(ReportView, { content: `# Huge report\n\n## Sekcja\n${lines}`, sources: [] }));

    expect(html).toContain("Widok raportu ograniczony");
    expect(html).toContain("linii");
    expect(html).not.toContain("tail-marker");
  });

  it("allows report dialogs to expose a print-targeted overlay class", () => {
    const html = renderToStaticMarkup(
      createElement(
        DialogShell,
        {
          titleId: "report-dialog-title",
          onClose: () => undefined,
          className: "print-report-dialog",
          overlayClassName: "print-report-overlay"
        },
        createElement("h2", { id: "report-dialog-title" }, "Raport")
      )
    );

    expect(html).toContain("print-report-overlay");
    expect(html).toContain("print-report-dialog");
  });

  it("defines scoped print CSS for report dialogs", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain("@media print");
    expect(css).toContain(".print-hidden");
    expect(css).toContain(".print-app-frame");
    expect(css).not.toContain(":not(.print-report-overlay)");
    expect(css).toContain(".print-report-body");
    expect(css).toContain(".print-report-surface");
  });
});
