import { describe, expect, it } from "vitest";
import {
  ACTIVE_IDEA_STATUSES,
  FULL_IDEA_STATUSES,
  IDEA_STATUS,
  LEGACY_IDEA_STATUS_NEW,
  isActiveIdeaStatus,
  isFullIdeaStatus,
  isIdeaStatus
} from "../../src/types/idea-status";

describe("idea statuses", () => {
  it("validates supported workflow statuses", () => {
    expect(isIdeaStatus(IDEA_STATUS.CANDIDATE)).toBe(true);
    expect(isIdeaStatus(IDEA_STATUS.FULL)).toBe(true);
    expect(isIdeaStatus(IDEA_STATUS.SAVED)).toBe(true);
    expect(isIdeaStatus(IDEA_STATUS.DISMISSED)).toBe(true);
    expect(isIdeaStatus("NEW")).toBe(false);
  });

  it("treats dismissed ideas as inactive for automatic regeneration", () => {
    expect(ACTIVE_IDEA_STATUSES).toContain(IDEA_STATUS.CANDIDATE);
    expect(ACTIVE_IDEA_STATUSES).toContain(IDEA_STATUS.FULL);
    expect(ACTIVE_IDEA_STATUSES).toContain(IDEA_STATUS.SAVED);
    expect(ACTIVE_IDEA_STATUSES).toContain(LEGACY_IDEA_STATUS_NEW);
    expect(ACTIVE_IDEA_STATUSES).not.toContain(IDEA_STATUS.DISMISSED);
    expect(isActiveIdeaStatus(IDEA_STATUS.FULL)).toBe(true);
    expect(isActiveIdeaStatus(LEGACY_IDEA_STATUS_NEW)).toBe(true);
    expect(isActiveIdeaStatus(IDEA_STATUS.DISMISSED)).toBe(false);
  });

  it("keeps legacy NEW ideas visible in the full ideas view", () => {
    expect(FULL_IDEA_STATUSES).toContain(LEGACY_IDEA_STATUS_NEW);
    expect(isFullIdeaStatus(IDEA_STATUS.FULL)).toBe(true);
    expect(isFullIdeaStatus(LEGACY_IDEA_STATUS_NEW)).toBe(true);
    expect(isFullIdeaStatus(IDEA_STATUS.CANDIDATE)).toBe(false);
  });
});
