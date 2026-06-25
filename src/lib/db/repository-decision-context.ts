import { prisma } from "./client";
import { sanitizeExternalText } from "@/lib/utils";
import { REPORT_TYPES } from "@/types/status";
import type { RepositoryDecisionContext, RepositoryDecisionNextAction } from "@/types/repository";

const ACTIVE_TASK_STATUSES = new Set(["OPEN", "IN_PROGRESS", "SNOOZED"]);
const UNDECIDED_STATUSES = new Set(["NEW", "TO_REVIEW", "HOT", "ANALYZED"]);
const QUICK_BRIEF_TYPE = REPORT_TYPES.REPO_QUICK_BRIEF;
const FULL_REPORT_TYPE = REPORT_TYPES.REPO;

export type RepositoryDecisionContextRecord = {
  id: string;
  fullName: string;
  status: string;
  lastAnalyzedAt: Date | null;
  trendScore: number;
  relevanceScore: number;
  initialMomentumScore: number;
  growth24h: number | null;
  growth7d: number | null;
  growthPercent7d: number | null;
  reports: {
    id: string;
    type: string;
    title: string;
    summary: string | null;
    createdAt: Date;
  }[];
  actionItems: {
    id: string;
    type: string;
    status: string;
    title: string;
    priority: number;
    dueAt: Date | null;
    snoozedUntil: Date | null;
    createdAt: Date;
  }[];
  marketResearchSources: {
    id: string;
    sourceType: string;
    title: string;
    publisher: string | null;
    retrievedAt: Date;
    evidenceKind: string | null;
    whatItProves: string | null;
    sourceConfidence: number | null;
  }[];
  marketResearchRuns: {
    id: string;
    status: string;
    mode: string;
    provider: string;
    sourceCount: number;
    startedAt: Date;
    finishedAt: Date | null;
  }[];
  snapshots: {
    id: string;
    capturedAt: Date;
    growth24h: number | null;
    growth7d: number | null;
    growthPercent7d: number | null;
  }[];
  _count?: {
    reports?: number;
    actionItems?: number;
    marketResearchSources?: number;
    marketResearchRuns?: number;
    snapshots?: number;
  };
};

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function cleanText(value: string | null | undefined, fallback: string, maxLength = 180) {
  return sanitizeExternalText(value, maxLength) ?? fallback;
}

function formatCount(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function formatGrowthSignal(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "brak historii";
  }

  return value > 0 ? `+${value}` : "0";
}

function latestDate(values: Array<Date | null | undefined>) {
  const timestamps = values.map((value) => value?.getTime() ?? Number.NaN).filter(Number.isFinite);
  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps));
}

function isUndecidedStatus(status: string) {
  return UNDECIDED_STATUSES.has(status);
}

function isOpenTaskStatus(status: string) {
  return ACTIVE_TASK_STATUSES.has(status);
}

function isActionItemVisibleNow(item: RepositoryDecisionContextRecord["actionItems"][number], now: Date) {
  if (!isOpenTaskStatus(item.status)) {
    return false;
  }

  if (item.status !== "SNOOZED") {
    return true;
  }

  return !item.snoozedUntil || item.snoozedUntil.getTime() <= now.getTime();
}

function buildEvidenceSummary(input: {
  sourceCount: number;
  researchRunCount: number;
  sourceTypes: string[];
  latestSourceTitle: string | null;
}) {
  if (input.sourceCount === 0) {
    return input.researchRunCount > 0
      ? "Research byl uruchamiany, ale nie ma zapisanych zrodel evidence dla tego repo."
      : "Brak lokalnych zrodel evidence i research runow dla tego repo.";
  }

  const types = input.sourceTypes.length ? ` (${input.sourceTypes.join(", ")})` : "";
  const latest = input.latestSourceTitle ? ` Najnowszy sygnal: ${input.latestSourceTitle}.` : "";
  return `${formatCount(input.sourceCount, "zrodlo", "zrodel")} evidence${types}.${latest}`;
}

function buildNextAction(input: {
  hasQuickBrief: boolean;
  hasFullReport: boolean;
  openTasks: RepositoryDecisionContextRecord["actionItems"];
  sourceCount: number;
  needsStatusDecision: boolean;
}): RepositoryDecisionNextAction {
  if (!input.hasQuickBrief) {
    return {
      id: "decision:quick-brief",
      kind: "quick_brief",
      title: "Zrob quick brief",
      description: "Repo nie ma jeszcze lokalnego szybkiego briefu.",
      reason: "Najpierw potrzebny jest tani, deterministyczny punkt odniesienia przed pelnym raportem.",
      actionLabel: "Quick brief",
      tone: "warning",
      taskId: null
    };
  }

  if (!input.hasFullReport) {
    return {
      id: "decision:full-report",
      kind: "full_report",
      title: "Uzupelnij pelny raport",
      description: "Quick brief juz istnieje, ale brakuje pelnego raportu repo.",
      reason: "Pelny raport jest nastepnym artefaktem przed decyzja produktowa lub odrzuceniem.",
      actionLabel: "Pelny raport",
      tone: "warning",
      taskId: null
    };
  }

  const topTask = input.openTasks[0];
  if (topTask) {
    return {
      id: `decision:task:${topTask.id}`,
      kind: "open_task",
      title: cleanText(topTask.title, "Otwarte zadanie"),
      description: `${topTask.type} | ${topTask.status} | priorytet ${topTask.priority}`,
      reason: "Otwarte zadanie ma pierwszenstwo przed generowaniem kolejnych artefaktow.",
      actionLabel: "Zamknij zadanie",
      tone: "info",
      taskId: topTask.id
    };
  }

  if (input.sourceCount === 0) {
    return {
      id: "decision:research-evidence",
      kind: "research_evidence",
      title: "Dodaj evidence",
      description: "Brakuje zapisanych zrodel market research dla tego repo.",
      reason: "Bez evidence latwo przecenic trend i stworzyc slaby pomysl produktowy.",
      actionLabel: "Research light",
      tone: "warning",
      taskId: null
    };
  }

  if (input.needsStatusDecision) {
    return {
      id: "decision:status",
      kind: "status_decision",
      title: "Podejmij decyzje statusu",
      description: "Repo ma artefakty i evidence, ale nadal jest w statusie roboczym.",
      reason: "Zamknij triage: zapisz, oznacz jako przeczytane, rozwin w pomysl albo odrzuc.",
      actionLabel: "Zmien status",
      tone: "info",
      taskId: null
    };
  }

  return {
    id: "decision:monitor",
    kind: "monitor",
    title: "Monitoruj",
    description: "Repo ma podstawowy kontekst decyzyjny i nie blokuje kolejki.",
    reason: "Brak brakujacych artefaktow, otwartych zadan i pilnej decyzji statusu.",
    actionLabel: "Obserwuj",
    tone: "success",
    taskId: null
  };
}

export function buildRepositoryDecisionContext(
  repository: RepositoryDecisionContextRecord,
  now = new Date()
): RepositoryDecisionContext {
  const reports = repository.reports;
  const quickBriefCount = reports.filter((report) => report.type === QUICK_BRIEF_TYPE).length;
  const fullReportCount = reports.filter((report) => report.type === FULL_REPORT_TYPE).length;
  const decisionLogCount = reports.filter((report) => report.type === "decision_log").length;
  const scoringSnapshotCount = reports.filter((report) => report.type === "scoring_snapshot").length;
  const openTasks = repository.actionItems.filter((item) => isActionItemVisibleNow(item, now));
  const latestSnapshot = repository.snapshots[0] ?? null;
  const growth24h = repository.growth24h ?? latestSnapshot?.growth24h ?? null;
  const growth7d = repository.growth7d ?? latestSnapshot?.growth7d ?? null;
  const growthPercent7d = repository.growthPercent7d ?? latestSnapshot?.growthPercent7d ?? null;
  const sourceCount = repository._count?.marketResearchSources ?? repository.marketResearchSources.length;
  const researchRunCount = repository._count?.marketResearchRuns ?? repository.marketResearchRuns.length;
  const reportCount = repository._count?.reports ?? reports.length;
  const snapshotCount = repository._count?.snapshots ?? repository.snapshots.length;
  const sourceTypes = [...new Set(repository.marketResearchSources.map((source) => source.sourceType))].sort();
  const lastResearchAt = latestDate([
    ...repository.marketResearchSources.map((source) => source.retrievedAt),
    ...repository.marketResearchRuns.map((run) => run.finishedAt ?? run.startedAt)
  ]);
  const needsStatusDecision = isUndecidedStatus(repository.status);
  const nextAction = buildNextAction({
    hasQuickBrief: quickBriefCount > 0,
    hasFullReport: fullReportCount > 0,
    openTasks,
    sourceCount,
    needsStatusDecision
  });

  return {
    repoId: repository.id,
    generatedAt: now.toISOString(),
    nextAction,
    signals: [
      {
        id: "trend",
        label: "Trend",
        value: `${repository.trendScore}/100`,
        tone: repository.trendScore >= 80 ? "success" : repository.trendScore >= 60 ? "info" : "neutral"
      },
      {
        id: "growth-7d",
        label: "Growth 7d",
        value: formatGrowthSignal(growth7d),
        tone: growth7d === null ? "warning" : growth7d > 0 ? "success" : "neutral"
      },
      {
        id: "reports",
        label: "Raporty",
        value: `${fullReportCount} pelne / ${quickBriefCount} brief`,
        tone: quickBriefCount > 0 && fullReportCount > 0 ? "success" : "warning"
      },
      {
        id: "tasks",
        label: "Zadania",
        value: formatCount(openTasks.length, "otwarte", "otwartych"),
        tone: openTasks.length ? "warning" : "success"
      },
      {
        id: "evidence",
        label: "Evidence",
        value: formatCount(sourceCount, "zrodlo", "zrodel"),
        tone: sourceCount ? "success" : "warning"
      },
      {
        id: "status",
        label: "Status",
        value: repository.status,
        tone: needsStatusDecision ? "warning" : "neutral"
      }
    ],
    reports: {
      totalCount: reportCount,
      quickBriefCount,
      fullReportCount,
      decisionLogCount,
      scoringSnapshotCount,
      recent: reports.slice(0, 4).map((report) => ({
        id: report.id,
        type: report.type,
        title: cleanText(report.title, "Raport", 160),
        summary: sanitizeExternalText(report.summary, 220),
        createdAt: report.createdAt.toISOString()
      }))
    },
    tasks: {
      openCount: openTasks.length,
      recentOpen: openTasks.slice(0, 4).map((task) => ({
        id: task.id,
        type: task.type,
        status: task.status,
        title: cleanText(task.title, "Otwarte zadanie", 160),
        priority: task.priority,
        dueAt: toIsoDate(task.dueAt),
        snoozedUntil: toIsoDate(task.snoozedUntil),
        createdAt: task.createdAt.toISOString()
      }))
    },
    evidence: {
      sourceCount,
      researchRunCount,
      lastResearchAt: toIsoDate(lastResearchAt),
      sourceTypes,
      summary: buildEvidenceSummary({
        sourceCount,
        researchRunCount,
        sourceTypes,
        latestSourceTitle: repository.marketResearchSources[0]?.title ?? null
      }),
      topSources: repository.marketResearchSources.slice(0, 4).map((source) => ({
        id: source.id,
        sourceType: source.sourceType,
        title: cleanText(source.title, "Zrodlo evidence", 160),
        publisher: sanitizeExternalText(source.publisher, 80),
        retrievedAt: source.retrievedAt.toISOString(),
        evidenceKind: source.evidenceKind,
        whatItProves: sanitizeExternalText(source.whatItProves, 220),
        sourceConfidence: source.sourceConfidence
      }))
    },
    snapshots: {
      totalCount: snapshotCount,
      latestCapturedAt: toIsoDate(latestSnapshot?.capturedAt),
      growth24h,
      growth7d,
      growthPercent7d
    },
    status: {
      current: repository.status,
      needsDecision: needsStatusDecision,
      lastAnalyzedAt: toIsoDate(repository.lastAnalyzedAt)
    }
  };
}

export async function getRepositoryDecisionContext(repoId: string): Promise<RepositoryDecisionContext> {
  const repository = await prisma.repository.findUniqueOrThrow({
    where: { id: repoId },
    select: {
      id: true,
      fullName: true,
      status: true,
      lastAnalyzedAt: true,
      trendScore: true,
      relevanceScore: true,
      initialMomentumScore: true,
      growth24h: true,
      growth7d: true,
      growthPercent7d: true,
      reports: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          createdAt: true
        }
      },
      actionItems: {
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          type: true,
          status: true,
          title: true,
          priority: true,
          dueAt: true,
          snoozedUntil: true,
          createdAt: true
        }
      },
      marketResearchSources: {
        orderBy: [{ sourceRank: "desc" }, { sourceConfidence: "desc" }, { relevanceScore: "desc" }, { retrievedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          sourceType: true,
          title: true,
          publisher: true,
          retrievedAt: true,
          evidenceKind: true,
          whatItProves: true,
          sourceConfidence: true
        }
      },
      marketResearchRuns: {
        orderBy: { startedAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          mode: true,
          provider: true,
          sourceCount: true,
          startedAt: true,
          finishedAt: true
        }
      },
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 8,
        select: {
          id: true,
          capturedAt: true,
          growth24h: true,
          growth7d: true,
          growthPercent7d: true
        }
      },
      _count: {
        select: {
          reports: true,
          actionItems: true,
          marketResearchSources: true,
          marketResearchRuns: true,
          snapshots: true
        }
      }
    }
  });

  return buildRepositoryDecisionContext(repository);
}
