export const IDEA_STATUS = {
  CANDIDATE: "CANDIDATE",
  FULL: "FULL",
  SAVED: "SAVED",
  DISMISSED: "DISMISSED",
  IDEA: "IDEA",
  ANALYZED: "ANALYZED"
} as const;

export type IdeaStatus = (typeof IDEA_STATUS)[keyof typeof IDEA_STATUS];

const IDEA_STATUS_VALUES = new Set<string>(Object.values(IDEA_STATUS));
export const LEGACY_IDEA_STATUS_NEW = "NEW";

export const ACTIVE_IDEA_STATUSES: string[] = [
  IDEA_STATUS.CANDIDATE,
  IDEA_STATUS.FULL,
  IDEA_STATUS.SAVED,
  IDEA_STATUS.IDEA,
  IDEA_STATUS.ANALYZED,
  LEGACY_IDEA_STATUS_NEW
];

export const FULL_IDEA_STATUSES: string[] = [
  IDEA_STATUS.FULL,
  IDEA_STATUS.IDEA,
  IDEA_STATUS.ANALYZED,
  LEGACY_IDEA_STATUS_NEW
];

export function isIdeaStatus(value: string): value is IdeaStatus {
  return IDEA_STATUS_VALUES.has(value);
}

export function isActiveIdeaStatus(value: string) {
  return ACTIVE_IDEA_STATUSES.includes(value);
}

export function isFullIdeaStatus(value: string) {
  return FULL_IDEA_STATUSES.includes(value);
}
