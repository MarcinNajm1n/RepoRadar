export const REPOSITORY_STATUSES = {
  NEW: { emoji: "🆕", label: "Nowe" },
  READ: { emoji: "📖", label: "Przeczytane" },
  SAVED: { emoji: "⭐", label: "Zapisane" },
  IGNORED: { emoji: "🚫", label: "Ignorowane" },
  IDEA: { emoji: "🧠", label: "Pomysł" },
  HOT: { emoji: "🔥", label: "Hot" },
  OLD: { emoji: "🧊", label: "Stare repo" },
  TO_REVIEW: { emoji: "🕒", label: "Do sprawdzenia" },
  ANALYZED: { emoji: "✅", label: "Przeanalizowane" }
} as const;

export type RepositoryStatus = keyof typeof REPOSITORY_STATUSES;

export const REPORT_TYPES = {
  DAILY: "daily",
  DAILY_BRIEFING: "daily_briefing",
  WEEKLY: "weekly",
  REPO_QUICK_BRIEF: "repo_quick_brief",
  REPO: "repo"
} as const;

export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

export function isRepositoryStatus(value: string): value is RepositoryStatus {
  return value in REPOSITORY_STATUSES;
}

export function formatStatus(status: string) {
  if (!isRepositoryStatus(status)) {
    return status;
  }

  const meta = REPOSITORY_STATUSES[status];
  return `${meta.emoji} ${meta.label}`;
}
