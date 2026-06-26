import { describe, expect, it } from "vitest";
import {
  buildClearExpiredExternalCacheConfirmation,
  buildClearOldNotificationLogsConfirmation,
  buildPruneSnapshotsConfirmation,
  getNotificationLogDaysToKeep
} from "../src/lib/maintenance-confirmations";

describe("maintenance confirmation copy", () => {
  it("uses dry-run cache counts before clearing expired research cache", () => {
    const message = buildClearExpiredExternalCacheConfirmation({ expiredEntries: 3 });

    expect(message).toContain("3 wygaslych wpisow research cache");
    expect(message).toContain("Dry-run");
    expect(message).toContain("lokalny cache");
  });

  it("uses preview retention for notification log cleanup", () => {
    const message = buildClearOldNotificationLogsConfirmation({
      daysToKeep: 45,
      cutoff: "2026-05-12T00:00:00.000Z",
      oldEntries: 7
    });

    expect(getNotificationLogDaysToKeep({ daysToKeep: 45, cutoff: "2026-05-12T00:00:00.000Z", oldEntries: 7 })).toBe(45);
    expect(message).toContain("7 logow powiadomien starszych niz 45 dni");
    expect(message).toContain("2026-05-12T00:00:00.000Z");
  });

  it("falls back to 30 days for notification logs when preview is unavailable", () => {
    expect(getNotificationLogDaysToKeep()).toBe(30);
    expect(buildClearOldNotificationLogsConfirmation()).toContain("starsze niz 30 dni");
  });

  it("keeps snapshot prune warnings explicit", () => {
    const message = buildPruneSnapshotsConfirmation({
      daysToKeep: 180,
      cutoff: "2025-12-27T12:00:00.000Z",
      oldEntries: 12,
      affectedRepositories: 5,
      repositoriesLosingAllSnapshots: 2
    });

    expect(message).toContain("12 snapshotow z 5 repo");
    expect(message).toContain("2 repo straci wszystkie snapshoty");
  });
});
