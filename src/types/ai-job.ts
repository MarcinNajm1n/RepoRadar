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

export type AiJobQueueCount = {
  key: string;
  label: string;
  count: number;
};

export type AiJobListItem = {
  id: string;
  type: string;
  status: string;
  priority: number;
  repoId: string | null;
  ideaId: string | null;
  reportId: string | null;
  repoFullName: string | null;
  dedupeKey: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
};

export type AiJobQueueSummary = {
  generatedAt: string;
  totalJobs: number;
  activeCount: number;
  needsAttentionCount: number;
  retryableFailedCount: number;
  byStatus: AiJobQueueCount[];
  byType: AiJobQueueCount[];
  oldestActiveJob: AiJobListItem | null;
  recentFailures: AiJobListItem[];
};
