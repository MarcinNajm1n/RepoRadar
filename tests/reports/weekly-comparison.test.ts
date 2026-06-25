import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeeklyReportsView } from "../../src/components/repo-radar/weekly-reports-view";
import { buildWeeklyReportComparison, extractWeeklyReportRepoNames } from "../../src/lib/reports/weekly-comparison";
import type { ReportListItem } from "../../src/types/repository";

function report(id: string, markdown: string, repoCount = 0): ReportListItem {
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
    createdAt: "2026-06-21T12:00:00.000Z"
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
});
