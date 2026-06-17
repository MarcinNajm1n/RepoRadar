import { describe, expect, it } from "vitest";
import { parseReportForDisplay } from "../../src/lib/display/report-display";

describe("parseReportForDisplay", () => {
  it("detects decision and executive summary sections in new reports", () => {
    const report = parseReportForDisplay(`# Repo Report: owner/tool

## Werdykt
- Decyzja: READ
- Powod: strong signal

## Executive summary
Short summary.

## Ryzyka
- Risk one`);

    expect(report.title).toBe("Repo Report: owner/tool");
    expect(report.hasDecisionSection).toBe(true);
    expect(report.hasExecutiveSummary).toBe(true);
    expect(report.sections.map((section) => section.kind)).toContain("risks");
  });

  it("keeps old raw markdown usable as generic sections", () => {
    const report = parseReportForDisplay("Old report body without headings.");

    expect(report.sections).toHaveLength(1);
    expect(report.sections[0]).toMatchObject({ title: "Raport", kind: "generic" });
    expect(report.rawMarkdown).toContain("Old report body");
  });
});
