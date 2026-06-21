import { prisma } from "./client";
import { safeJsonParse } from "@/lib/utils";

type AuditSnapshot = {
  capturedAt: Date;
  stars: number;
  growth24h: number | null;
  growth7d: number | null;
  growthPercent7d?: number | null;
};

export type AuditRepositoryRecord = {
  id: string;
  fullName: string;
  status: string;
  trendScore: number;
  relevanceScore: number;
  initialMomentumScore: number;
  starsCurrent: number;
  forksCurrent: number;
  watchersCurrent: number;
  openIssues: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  pushedAt: Date | null;
  scoreBreakdownJson: string;
  snapshots?: AuditSnapshot[];
};

type ActionItemAuditRecord = {
  id: string;
  type: string;
  status: string;
  title: string;
  repoId: string | null;
  priority: number;
  dueAt: Date | null;
  createdAt: Date;
  repository?: {
    fullName: string;
    url: string;
  } | null;
};

const SCORE_LABELS: Array<[string, string]> = [
  ["absoluteGrowthPoints", "Growth abs"],
  ["percentageGrowthPoints", "Growth %"],
  ["agePoints", "Wiek"],
  ["totalStarsPoints", "Stars"],
  ["forksPoints", "Forks"],
  ["pushFreshnessPoints", "Fresh push"],
  ["topicRelevancePoints", "Topics"],
  ["readmeQualityPoints", "README"],
  ["keywordRelevancePoints", "Keywords"],
  ["initialMomentumPoints", "Initial momentum"]
];

function formatOptionalNumber(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "brak danych" : `${value}${suffix}`;
}

function formatOptionalDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "brak danych";
}

function formatScoreValue(value: unknown) {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "tak" : "nie";
  }
  return "0";
}

export function buildScoringSnapshotMarkdown(input: {
  repository: AuditRepositoryRecord;
  previousStatus: string;
  nextStatus: string;
  reason?: string | null;
  createdAt?: Date;
}) {
  const { repository, previousStatus, nextStatus, reason } = input;
  const createdAt = input.createdAt ?? new Date();
  const latestSnapshot = repository.snapshots?.[0] ?? null;
  const breakdown = safeJsonParse<Record<string, unknown>>(repository.scoreBreakdownJson, {});
  const breakdownRows = SCORE_LABELS.map(([key, label]) => `- ${label}: ${formatScoreValue(breakdown[key])}`);

  if (typeof breakdown.usedInitialMomentumFallback === "boolean") {
    breakdownRows.push(`- Initial fallback: ${breakdown.usedInitialMomentumFallback ? "tak" : "nie"}`);
  }

  return [
    `# Scoring snapshot - ${repository.fullName}`,
    "",
    "## Kontekst decyzji",
    `- Utworzono: ${createdAt.toISOString()}`,
    `- Status przed: ${previousStatus}`,
    `- Status po: ${nextStatus}`,
    `- Powod: ${reason?.trim() || "brak podanego powodu"}`,
    "",
    "## Wynik",
    `- Trend score: ${repository.trendScore}/100`,
    `- Relevance score: ${repository.relevanceScore}/100`,
    `- Initial momentum: ${repository.initialMomentumScore}/100`,
    "",
    "## Metryki repo",
    `- Stars: ${repository.starsCurrent}`,
    `- Forks: ${repository.forksCurrent}`,
    `- Watchers: ${repository.watchersCurrent}`,
    `- Open issues: ${repository.openIssues}`,
    `- First seen: ${repository.firstSeenAt.toISOString()}`,
    `- Last seen: ${repository.lastSeenAt.toISOString()}`,
    `- Pushed at: ${formatOptionalDate(repository.pushedAt)}`,
    "",
    "## Najnowszy snapshot",
    `- Snapshot at: ${formatOptionalDate(latestSnapshot?.capturedAt)}`,
    `- Stars snapshot: ${formatOptionalNumber(latestSnapshot?.stars)}`,
    `- Growth 24h: ${formatOptionalNumber(latestSnapshot?.growth24h)}`,
    `- Growth 7d: ${formatOptionalNumber(latestSnapshot?.growth7d)}`,
    `- Growth 7d %: ${formatOptionalNumber(latestSnapshot?.growthPercent7d, "%")}`,
    "",
    "## Breakdown scoringu",
    ...breakdownRows
  ].join("\n");
}

export function buildDecisionLogMarkdown(input: {
  repositoryFullName: string;
  action: string;
  actor?: string;
  previousStatus?: string | null;
  nextStatus?: string | null;
  reason?: string | null;
  metadata?: Array<[string, string | number | null | undefined]>;
  createdAt?: Date;
}) {
  const createdAt = input.createdAt ?? new Date();
  const metadataRows = input.metadata?.length
    ? input.metadata.map(([label, value]) => `- ${label}: ${value === null || value === undefined || value === "" ? "brak danych" : value}`)
    : ["- brak dodatkowych metadanych"];

  return [
    `# Decision log - ${input.repositoryFullName}`,
    "",
    "## Decyzja",
    `- Utworzono: ${createdAt.toISOString()}`,
    `- Akcja: ${input.action}`,
    `- Aktor: ${input.actor ?? "local-user"}`,
    `- Status przed: ${input.previousStatus ?? "brak danych"}`,
    `- Status po: ${input.nextStatus ?? "brak danych"}`,
    `- Powod: ${input.reason?.trim() || "brak podanego powodu"}`,
    "",
    "## Metadane",
    ...metadataRows
  ].join("\n");
}

export async function recordRepositoryStatusAudit(input: {
  repository: AuditRepositoryRecord;
  previousStatus: string;
  nextStatus: string;
  reason?: string | null;
}) {
  if (input.previousStatus === input.nextStatus && !input.reason?.trim()) {
    return;
  }

  const createdAt = new Date();
  const scoringMarkdown = buildScoringSnapshotMarkdown({ ...input, createdAt });
  const decisionMarkdown = buildDecisionLogMarkdown({
    repositoryFullName: input.repository.fullName,
    action: "status_change",
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    reason: input.reason,
    createdAt
  });

  await prisma.$transaction([
    prisma.report.create({
      data: {
        type: "scoring_snapshot",
        repoId: input.repository.id,
        title: `Scoring snapshot: ${input.repository.fullName}`,
        contentMarkdown: scoringMarkdown,
        summary: `Trend ${input.repository.trendScore}/100, status ${input.previousStatus} -> ${input.nextStatus}.`,
        repoCount: 1,
        topRepoIdsJson: JSON.stringify([input.repository.id])
      }
    }),
    prisma.report.create({
      data: {
        type: "decision_log",
        repoId: input.repository.id,
        title: `Decision log: ${input.repository.fullName}`,
        contentMarkdown: decisionMarkdown,
        summary: `Status ${input.previousStatus} -> ${input.nextStatus}.`,
        repoCount: 1,
        topRepoIdsJson: JSON.stringify([input.repository.id])
      }
    })
  ]);
}

export async function recordActionItemDecision(item: ActionItemAuditRecord) {
  if (!item.repoId) {
    return;
  }

  const fullName = item.repository?.fullName ?? "nieznane repo";
  const markdown = buildDecisionLogMarkdown({
    repositoryFullName: fullName,
    action: "action_item_created",
    nextStatus: item.status,
    reason: item.title,
    createdAt: item.createdAt,
    metadata: [
      ["Task type", item.type],
      ["Task priority", item.priority],
      ["Due at", formatOptionalDate(item.dueAt)]
    ]
  });

  await prisma.report.create({
    data: {
      type: "decision_log",
      repoId: item.repoId,
      title: `Decision log: ${fullName}`,
      contentMarkdown: markdown,
      summary: `Dodano zadanie: ${item.title}.`,
      repoCount: 1,
      topRepoIdsJson: JSON.stringify([item.repoId])
    }
  });
}
