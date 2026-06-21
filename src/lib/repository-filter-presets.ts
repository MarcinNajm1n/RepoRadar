export type RepositoryFilterPreset = {
  id: string;
  label: string;
  description: string;
  query: string;
  status: string;
  language: string;
  profile: string;
  minTrend: number;
  sortKey: string;
  isSaved?: boolean;
};

export const FILTER_PRESET_STORAGE_KEY = "reporadar.filterPresets.v1";

const DEFAULT_FILTERS = {
  query: "",
  status: "ALL",
  language: "ALL",
  profile: "ALL",
  minTrend: 0,
  sortKey: "trend_desc"
};

export const BUILT_IN_REPOSITORY_FILTER_PRESETS: RepositoryFilterPreset[] = [
  {
    id: "ai-agents",
    label: "AI agents",
    description: "Agentowe repo z mocnym trendem.",
    ...DEFAULT_FILTERS,
    profile: "AI_AGENTS",
    minTrend: 55
  },
  {
    id: "mcp",
    label: "MCP",
    description: "Repo zwiazane z MCP i integracjami.",
    ...DEFAULT_FILTERS,
    query: "mcp",
    profile: "MCP",
    minTrend: 35
  },
  {
    id: "high-growth",
    label: "High growth",
    description: "Najpierw repo z najmocniejszym wzrostem 7d.",
    ...DEFAULT_FILTERS,
    minTrend: 70,
    sortKey: "growth7d_desc"
  },
  {
    id: "old-active",
    label: "Old but active",
    description: "Starsze repo, ktore nadal moga byc warte uwagi.",
    ...DEFAULT_FILTERS,
    minTrend: 45,
    sortKey: "pushed_desc"
  }
];

export function createSavedFilterPreset(
  label: string,
  filters: Pick<RepositoryFilterPreset, "query" | "status" | "language" | "profile" | "minTrend" | "sortKey">
): RepositoryFilterPreset {
  const cleanLabel = label.trim().slice(0, 42) || "Moj preset";

  return {
    id: `saved-${slugify(cleanLabel)}-${Date.now().toString(36)}`,
    label: cleanLabel,
    description: "Zapisany lokalnie zestaw filtrow.",
    isSaved: true,
    ...filters
  };
}

export function parseSavedFilterPresets(value: string | null): RepositoryFilterPreset[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizePreset).filter((preset): preset is RepositoryFilterPreset => Boolean(preset));
  } catch {
    return [];
  }
}

export function serializeSavedFilterPresets(presets: RepositoryFilterPreset[]) {
  return JSON.stringify(presets.filter((preset) => preset.isSaved).slice(0, 12));
}

function normalizePreset(value: unknown): RepositoryFilterPreset | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<RepositoryFilterPreset>;
  if (typeof input.id !== "string" || typeof input.label !== "string") {
    return null;
  }

  return {
    id: input.id.slice(0, 80),
    label: input.label.slice(0, 42),
    description: typeof input.description === "string" ? input.description.slice(0, 120) : "Zapisany lokalnie zestaw filtrow.",
    query: typeof input.query === "string" ? input.query.slice(0, 160) : DEFAULT_FILTERS.query,
    status: typeof input.status === "string" ? input.status : DEFAULT_FILTERS.status,
    language: typeof input.language === "string" ? input.language : DEFAULT_FILTERS.language,
    profile: typeof input.profile === "string" ? input.profile : DEFAULT_FILTERS.profile,
    minTrend: clampTrend(input.minTrend),
    sortKey: typeof input.sortKey === "string" ? input.sortKey : DEFAULT_FILTERS.sortKey,
    isSaved: true
  };
}

function clampTrend(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FILTERS.minTrend;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
