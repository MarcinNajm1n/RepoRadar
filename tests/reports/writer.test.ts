import { describe, expect, it } from "vitest";
import { repoReportPath } from "../../src/lib/reports/writer";

describe("repoReportPath", () => {
  it("uses the owner__repo markdown convention", () => {
    expect(repoReportPath("openai", "agents")).toBe("repos/openai__agents.md");
  });
});
