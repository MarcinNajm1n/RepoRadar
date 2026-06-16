export const ACTION_ITEM_TYPES = {
  READ_README: { label: "Przeczytaj README" },
  CHECK_DEMO: { label: "Sprawdz demo" },
  GENERATE_REPORT: { label: "Wygeneruj raport" },
  RESEARCH_OPPORTUNITY: { label: "Zbadaj szanse" },
  PROMOTE_IDEA: { label: "Rozwin pomysl" },
  CHECK_COMPETITION: { label: "Sprawdz konkurencje" },
  CLONE_LATER: { label: "Clone later" },
  PLAN_MVP: { label: "Zaplanuj MVP" },
  VALIDATE_MARKET: { label: "Zweryfikuj rynek" },
  DISMISS_DECISION: { label: "Podejmij decyzje odrzucenia" },
  CUSTOM: { label: "Wlasne zadanie" }
} as const;

export type ActionItemType = keyof typeof ACTION_ITEM_TYPES;

export const ACTION_ITEM_STATUSES = {
  OPEN: { label: "Otwarte" },
  IN_PROGRESS: { label: "W toku" },
  DONE: { label: "Zrobione" },
  SNOOZED: { label: "Odlozone" },
  DISMISSED: { label: "Odrzucone" }
} as const;

export type ActionItemStatus = keyof typeof ACTION_ITEM_STATUSES;

const ACTION_ITEM_TYPE_VALUES = new Set<string>(Object.keys(ACTION_ITEM_TYPES));
const ACTION_ITEM_STATUS_VALUES = new Set<string>(Object.keys(ACTION_ITEM_STATUSES));

export function isActionItemType(value: string): value is ActionItemType {
  return ACTION_ITEM_TYPE_VALUES.has(value);
}

export function isActionItemStatus(value: string): value is ActionItemStatus {
  return ACTION_ITEM_STATUS_VALUES.has(value);
}

export function formatActionItemType(type: string) {
  return isActionItemType(type) ? ACTION_ITEM_TYPES[type].label : type;
}

export function formatActionItemStatus(status: string) {
  return isActionItemStatus(status) ? ACTION_ITEM_STATUSES[status].label : status;
}

export type ActionItemListItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  repoId: string | null;
  repoFullName: string | null;
  repoUrl: string | null;
  ideaId: string | null;
  ideaTitle: string | null;
  reportId: string | null;
  reportTitle: string | null;
  priority: number;
  dueAt: string | null;
  snoozedUntil: string | null;
  completedAt: string | null;
  dismissedAt: string | null;
  dedupeKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
