import { describe, expect, it } from "vitest";
import { normalizeActionItemStatus, normalizeActionItemType } from "../../src/lib/db/action-items";

describe("action item validation", () => {
  it("accepts known action item types and statuses", () => {
    expect(normalizeActionItemType("READ_README")).toBe("READ_README");
    expect(normalizeActionItemStatus("SNOOZED")).toBe("SNOOZED");
  });

  it("rejects unknown action item values", () => {
    expect(() => normalizeActionItemType("BAD")).toThrow("Unsupported action item type");
    expect(() => normalizeActionItemStatus("BAD")).toThrow("Unsupported action item status");
  });
});
