import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoReportPath } from "../../src/lib/reports/paths";
import { writeMarkdownReport } from "../../src/lib/reports/writer";

describe("repoReportPath", () => {
  it("uses the owner__repo markdown convention", () => {
    expect(repoReportPath("openai", "agents")).toBe("repos/openai__agents.md");
  });

  it("writes reports inside the configured reports directory", async () => {
    const previousReportsDir = process.env.REPORTS_DIR;
    const reportsDir = await fs.mkdtemp(path.join(os.tmpdir(), "reporadar-reports-"));
    process.env.REPORTS_DIR = reportsDir;

    try {
      const returnedPath = await writeMarkdownReport("daily/report.md", "# Daily");
      const targetPath = path.join(reportsDir, "daily", "report.md");

      await expect(fs.readFile(targetPath, "utf8")).resolves.toBe("# Daily");
      expect(returnedPath).toBe(path.relative(process.cwd(), targetPath).replace(/\\/g, "/"));
    } finally {
      if (previousReportsDir === undefined) {
        delete process.env.REPORTS_DIR;
      } else {
        process.env.REPORTS_DIR = previousReportsDir;
      }
    }
  });

  it("rejects report paths outside the configured reports directory", async () => {
    const previousReportsDir = process.env.REPORTS_DIR;
    const reportsDir = await fs.mkdtemp(path.join(os.tmpdir(), "reporadar-reports-"));
    process.env.REPORTS_DIR = reportsDir;

    try {
      await expect(writeMarkdownReport("../outside.md", "# Escape")).rejects.toThrow("Report path must stay inside REPORTS_DIR");
    } finally {
      if (previousReportsDir === undefined) {
        delete process.env.REPORTS_DIR;
      } else {
        process.env.REPORTS_DIR = previousReportsDir;
      }
    }
  });

  it("rejects non-markdown report paths", async () => {
    const previousReportsDir = process.env.REPORTS_DIR;
    const reportsDir = await fs.mkdtemp(path.join(os.tmpdir(), "reporadar-reports-"));
    process.env.REPORTS_DIR = reportsDir;

    try {
      await expect(writeMarkdownReport("daily/report.html", "<h1>Daily</h1>")).rejects.toThrow(
        "Report path must use a .md extension"
      );
    } finally {
      if (previousReportsDir === undefined) {
        delete process.env.REPORTS_DIR;
      } else {
        process.env.REPORTS_DIR = previousReportsDir;
      }
    }
  });

  it("rejects helper-generated repository paths that would escape the reports directory", async () => {
    const previousReportsDir = process.env.REPORTS_DIR;
    const reportsDir = await fs.mkdtemp(path.join(os.tmpdir(), "reporadar-reports-"));
    process.env.REPORTS_DIR = reportsDir;

    try {
      await expect(writeMarkdownReport(repoReportPath("../../outside", "repo"), "# Escape")).rejects.toThrow(
        "Report path must stay inside REPORTS_DIR"
      );
    } finally {
      if (previousReportsDir === undefined) {
        delete process.env.REPORTS_DIR;
      } else {
        process.env.REPORTS_DIR = previousReportsDir;
      }
    }
  });
});
