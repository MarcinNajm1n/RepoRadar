import { describe, expect, it } from "vitest";
import { buildAiJobDedupeKey } from "../../src/lib/db/ai-jobs";

describe("buildAiJobDedupeKey", () => {
  it("builds stable dedupe keys from job identity", () => {
    expect(buildAiJobDedupeKey({ type: "REPORT", repoId: "repo_1" })).toBe("REPORT:repo_1");
  });

  it("honors explicit dedupe keys", () => {
    expect(buildAiJobDedupeKey({ type: "IDEA", repoId: "repo_1", dedupeKey: "custom" })).toBe("custom");
  });
});
