import { describe, expect, it } from "vitest";
import { buildWeeklyReportComparison, extractWeeklyReportRepoNames } from "../../src/components/repo-radar/weekly-reports-view";
import type { ReportListItem } from "../../src/types/repository";

function report(id: string, markdown: string): ReportListItem {
  return {
    id,
    type: "weekly",
    repoId: null,
    title: `Weekly ${id}`,
    markdownPath: null,
    contentMarkdown: markdown,
    summary: null,
    repoCount: 0,
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
    const current = report("current", "- [owner/alpha](https://github.com/owner/alpha)\n- [owner/gamma](https://github.com/owner/gamma)");
    const previous = report("previous", "- [owner/alpha](https://github.com/owner/alpha)\n- [owner/beta](https://github.com/owner/beta)");

    expect(buildWeeklyReportComparison(current, previous)).toMatchObject({
      retained: ["owner/alpha"],
      added: ["owner/gamma"],
      dropped: ["owner/beta"]
    });
  });
});
