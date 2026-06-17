import { formatActionItemStatus } from "@/types/action-item";
import { IDEA_STATUS } from "@/types/idea-status";
import { formatStatus } from "@/types/status";

export type DisplayTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export type StatusDisplay = {
  label: string;
  tone: DisplayTone;
};

const REPO_STATUS_TONES: Record<string, DisplayTone> = {
  NEW: "info",
  HOT: "success",
  TO_REVIEW: "warning",
  SAVED: "accent",
  READ: "neutral",
  IGNORED: "danger",
  OLD: "neutral",
  ANALYZED: "success",
  IDEA: "accent"
};

const IDEA_STATUS_LABELS: Record<string, string> = {
  [IDEA_STATUS.CANDIDATE]: "Kandydat",
  [IDEA_STATUS.FULL]: "Pelny pomysl",
  [IDEA_STATUS.SAVED]: "Zapisany",
  [IDEA_STATUS.DISMISSED]: "Odrzucony",
  [IDEA_STATUS.IDEA]: "Pomysl",
  [IDEA_STATUS.ANALYZED]: "Przeanalizowany",
  NEW: "Nowy"
};

const IDEA_STATUS_TONES: Record<string, DisplayTone> = {
  CANDIDATE: "info",
  FULL: "success",
  SAVED: "accent",
  DISMISSED: "danger",
  IDEA: "accent",
  ANALYZED: "success",
  NEW: "info"
};

export function getRepositoryStatusDisplay(status: string): StatusDisplay {
  return {
    label: formatStatus(status),
    tone: REPO_STATUS_TONES[status] ?? "neutral"
  };
}

export function getIdeaStatusDisplay(status: string): StatusDisplay {
  return {
    label: IDEA_STATUS_LABELS[status] ?? status,
    tone: IDEA_STATUS_TONES[status] ?? "neutral"
  };
}

export function getActionStatusDisplay(status: string): StatusDisplay {
  return {
    label: formatActionItemStatus(status),
    tone: status === "DONE" ? "success" : status === "DISMISSED" ? "danger" : status === "SNOOZED" ? "warning" : "info"
  };
}
