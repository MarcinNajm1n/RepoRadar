import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DialogShell } from "../../src/components/repo-radar/ui/dialog-shell";
import { ReportView } from "../../src/components/repo-radar/report-view";

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
    expect(html).toContain("Surowy raport");
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
