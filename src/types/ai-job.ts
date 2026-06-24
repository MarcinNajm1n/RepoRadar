export const AI_JOB_TYPES = {
  REPORT: "Raport",
  IDEA: "Pomysł",
  SUMMARY: "Streszczenie",
  RESEARCH: "Badanie"
} as const;

export const AI_JOB_STATUSES = {
  QUEUED: "W kolejce",
  RUNNING: "W toku",
  DONE: "Gotowe",
  FAILED: "Błąd"
} as const;

export type AiJobType = keyof typeof AI_JOB_TYPES;
export type AiJobStatus = keyof typeof AI_JOB_STATUSES;

export type AiJobSummary = {
  queued: number;
  running: number;
  done24h: number;
  failed24h: number;
};

export type AiJobListItem = {
  id: string;
  type: string;
  status: string;
  priority: number;
  repoFullName: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
};
