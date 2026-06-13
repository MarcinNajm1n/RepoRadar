import { describe, expect, it } from "vitest";
import { calculateGrowth } from "../../src/lib/scoring/growth";

describe("calculateGrowth", () => {
  it("returns null growth when only baseline data exists", () => {
    const now = new Date("2026-06-14T09:00:00Z");
    const result = calculateGrowth({ capturedAt: now, stars: 1500 }, [], now);

    expect(result.growth24h).toBeNull();
    expect(result.growth7d).toBeNull();
    expect(result.growthPercent7d).toBeNull();
    expect(result.hasSevenDayHistory).toBe(false);
  });

  it("calculates 24h and 7d growth from local snapshots", () => {
    const now = new Date("2026-06-14T09:00:00Z");
    const result = calculateGrowth(
      { capturedAt: now, stars: 3000 },
      [
        { capturedAt: new Date("2026-06-06T09:00:00Z"), stars: 2000 },
        { capturedAt: new Date("2026-06-13T08:00:00Z"), stars: 2800 }
      ],
      now
    );

    expect(result.growth24h).toBe(200);
    expect(result.growth7d).toBe(1000);
    expect(result.growthPercent7d).toBe(50);
    expect(result.hasSevenDayHistory).toBe(true);
  });
});
