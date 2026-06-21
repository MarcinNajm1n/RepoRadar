export const AI_JOB_TYPES = {
  REPORT: "Raport",
  IDEA: "Pomysl",
  SUMMARY: "Summary",
  RESEARCH: "Research"
} as const;

export const AI_JOB_STATUSES = {
  QUEUED: "W kolejce",
  RUNNING: "W toku",
  DONE: "Gotowe",
  FAILED: "Blad"
} as const;

export type AiJobType = keyof typeof AI_JOB_TYPES;
export type AiJobStatus = keyof typeof AI_JOB_STATUSES;

export type AiJobSummary = {
  queued: number;
  running: number;
  done24h: number;
  failed24h: number;
};
