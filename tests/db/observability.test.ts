import { describe, expect, it } from "vitest";
import { buildScanObservability } from "../../src/lib/db/observability";

describe("buildScanObservability", () => {
  it("summarizes latest scan duration and recent failures", () => {
    const now = new Date("2026-06-21T12:00:00.000Z");
    const summary = buildScanObservability(
      [
        {
          startedAt: new Date("2026-06-21T11:58:00.000Z"),
          finishedAt: new Date("2026-06-21T12:00:00.000Z"),
          status: "SUCCESS",
          reposFound: 120,
          reposUpdated: 80,
          errorMessage: null
        },
        {
          startedAt: new Date("2026-06-21T08:00:00.000Z"),
          finishedAt: new Date("2026-06-21T08:01:00.000Z"),
          status: "FAILED",
          reposFound: 10,
          reposUpdated: 0,
          errorMessage: "rate limit"
        }
      ],
      now
    );

    expect(summary.lastScan).toMatchObject({
      status: "SUCCESS",
      durationMs: 120000,
      reposFound: 120,
      reposUpdated: 80
    });
    expect(summary.failedScans24h).toBe(1);
    expect(summary.averageScanDurationMs).toBe(90000);
  });
});
