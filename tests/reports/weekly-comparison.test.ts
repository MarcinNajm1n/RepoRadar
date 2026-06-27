import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  filterWeeklyReports,
  normalizeWeeklyReportSearchQuery,
  WEEKLY_REPORT_SEARCH_QUERY_LIMIT,
  WeeklyReportsView
} from "../../src/components/repo-radar/weekly-reports-view";
import { buildWeeklyReportComparison, extractWeeklyReportRepoNames } from "../../src/lib/reports/weekly-comparison";
import type { ReportListItem } from "../../src/types/repository";

function report(id: string, markdown: string, repoCount = 0, overrides: Partial<ReportListItem> = {}): ReportListItem {
  return {
    id,
    type: "weekly",
    repoId: null,
    title: `Weekly ${id}`,
    markdownPath: null,
    contentMarkdown: markdown,
    summary: null,
    repoCount,
    topRepoIds: [],
    createdAt: "2026-06-21T12:00:00.000Z",
    ...overrides
  };
}

describe("weekly report comparison", () => {
  it("extracts markdown repository links once", () => {
    const names = extractWeeklyReportRepoNames(
      [
        "- [owner/alpha](https://github.com/owner/alpha) - score 90",
        "- [owner/beta](https://github.com/owner/beta) - score 80",
        "- [owner/alpha](https://github.com/owner/alpha) - duplicate"
      ].join("\n")
    );

    expect(names).toEqual(["owner/alpha", "owner/beta"]);
  });

  it("separates added, retained and dropped repositories", () => {
    const current = report("current", "- [owner/alpha](https://github.com/owner/alpha)\n- [owner/gamma](https://github.com/owner/gamma)", 6);
    const previous = report("previous", "- [owner/alpha](https://github.com/owner/alpha)\n- [owner/beta](https://github.com/owner/beta)", 4);

    expect(buildWeeklyReportComparison(current, previous)).toMatchObject({
      retained: ["owner/alpha"],
      added: ["owner/gamma"],
      dropped: ["owner/beta"],
      currentRepoCount: 6,
      previousRepoCount: 4,
      repoCountDelta: 2
    });
  });

  it("handles missing previous report without counting all current repositories as new", () => {
    const current = report("current", "- [owner/alpha](https://github.com/owner/alpha)\n- [owner/gamma](https://github.com/owner/gamma)", 2);

    expect(buildWeeklyReportComparison(current, null)).toMatchObject({
      currentNames: ["owner/alpha", "owner/gamma"],
      previousNames: [],
      retained: [],
      added: [],
      dropped: [],
      currentRepoCount: 2,
      previousRepoCount: null,
      repoCountDelta: null
    });
  });

  it("shows an overflow count when comparison groups exceed visible badges", () => {
    const markdown = Array.from({ length: 10 }, (_, index) => `- [owner/repo-${index}](https://github.com/owner/repo-${index})`).join(
      "\n"
    );
    const html = renderToStaticMarkup(React.createElement(WeeklyReportsView, { reports: [report("current", markdown, 10), report("previous", "", 0)] }));

    expect(html).toContain("Nowe sygnaly");
    expect(html).toContain("owner/repo-0");
    expect(html).toContain("+2");
  });

  it("filters weekly report archive by title, summary, path and markdown content", () => {
    const reports = [
      report("alpha", "- [owner/alpha](https://github.com/owner/alpha)", 3, {
        title: "Agent momentum",
        summary: "New local automation signals",
        markdownPath: "reports/alpha.md"
      }),
      report("beta", "Market validation notes for beta repo", 2, {
        title: "MCP weekly",
        summary: "Connector research",
        markdownPath: "reports/beta-market.md"
      })
    ];

    expect(filterWeeklyReports(reports, "automation")).toEqual([reports[0]]);
    expect(filterWeeklyReports(reports, "beta-market")).toEqual([reports[1]]);
    expect(filterWeeklyReports(reports, "owner/alpha")).toEqual([reports[0]]);
    expect(filterWeeklyReports(reports, "   ")).toBe(reports);
  });

  it("normalizes weekly report search queries before matching", () => {
    const normalized = normalizeWeeklyReportSearchQuery(`<b>${"A".repeat(WEEKLY_REPORT_SEARCH_QUERY_LIMIT + 20)}</b>`);

    expect(normalized.length).toBeLessThanOrEqual(WEEKLY_REPORT_SEARCH_QUERY_LIMIT);
    expect(normalized).not.toContain("<b>");
    expect(normalized).toBe(normalized.toLowerCase());
  });

  it("limits markdown text considered by weekly report search", () => {
    const reportWithHugeMarkdown = report("huge", `${"a".repeat(20000)} unique-tail-marker`, 1);

    expect(filterWeeklyReports([reportWithHugeMarkdown], "unique-tail-marker")).toEqual([]);
  });

  it("renders weekly report archive search controls", () => {
    const html = renderToStaticMarkup(React.createElement(WeeklyReportsView, { reports: [report("current", "AI agent notes", 1)] }));

    expect(html).toContain("Szukaj raportow tygodniowych");
    expect(html).toContain("Szukaj po tytule, streszczeniu, pliku albo tresci");
    expect(html).toContain("Archiwum raportow");
  });
});
