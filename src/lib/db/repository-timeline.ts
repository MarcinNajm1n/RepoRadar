import { prisma } from "./client";
import type { RepositoryTimelineItem } from "@/types/repository";

type RepositoryTimelineRecord = {
  id: string;
  fullName: string;
  status: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  updatedDbAt: Date;
  ignoredRecord?: { ignoredAt: Date; reason: string | null } | null;
  snapshots: Array<{
    id: string;
    capturedAt: Date;
    stars: number;
    growth24h: number | null;
    growth7d: number | null;
  }>;
  reports: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: Date;
  }>;
  actionItems: Array<{
    id: string;
    type: string;
    status: string;
    title: string;
    createdAt: Date;
    completedAt: Date | null;
    dismissedAt: Date | null;
  }>;
};

function toTimelineDate(value: Date) {
  return value.toISOString();
}

function actionTimestamp(action: RepositoryTimelineRecord["actionItems"][number]) {
  return action.completedAt ?? action.dismissedAt ?? action.createdAt;
}

function reportTimelineTitle(report: RepositoryTimelineRecord["reports"][number]) {
  if (report.type === "repo_quick_brief") {
    return "Quick brief";
  }
  if (report.type === "scoring_snapshot") {
    return "Snapshot scoringu";
  }
  if (report.type === "decision_log") {
    return "Decyzja uzytkownika";
  }
  return report.title;
}

function reportTimelineDetail(report: RepositoryTimelineRecord["reports"][number]) {
  if (report.type === "repo_quick_brief") {
    return "Szybki brief przed pelnym raportem.";
  }
  if (report.type === "scoring_snapshot") {
    return "Zapisany stan scoringu i metryk w momencie decyzji.";
  }
  if (report.type === "decision_log") {
    return "Zapis lokalnej decyzji lub akcji uzytkownika.";
  }
  return "Raport zapisany w lokalnej historii.";
}

export function buildRepositoryTimelineItems(repository: RepositoryTimelineRecord): RepositoryTimelineItem[] {
  const items: RepositoryTimelineItem[] = [
    {
      id: `first-seen:${repository.id}`,
      type: "scan",
      title: "Pierwszy scan",
      detail: `${repository.fullName} pierwszy raz trafilo do RepoRadar.`,
      timestamp: toTimelineDate(repository.firstSeenAt),
      tone: "positive"
    },
    {
      id: `last-seen:${repository.id}`,
      type: "scan",
      title: "Ostatni scan",
      detail: "Repo zostalo odswiezone w lokalnej bazie.",
      timestamp: toTimelineDate(repository.lastSeenAt),
      tone: "neutral"
    },
    {
      id: `status:${repository.id}`,
      type: "status",
      title: `Status: ${repository.status}`,
      detail: "Biezacy status repozytorium w lokalnym workflow.",
      timestamp: toTimelineDate(repository.updatedDbAt),
      tone: repository.status === "IGNORED" ? "warning" : "neutral"
    }
  ];

  if (repository.ignoredRecord) {
    items.push({
      id: `ignored:${repository.id}`,
      type: "status",
      title: "Repo zignorowane",
      detail: repository.ignoredRecord.reason ?? "Repo zostalo przeniesione do ignorowanych.",
      timestamp: toTimelineDate(repository.ignoredRecord.ignoredAt),
      tone: "warning"
    });
  }

  for (const snapshot of repository.snapshots) {
    const growth7d = snapshot.growth7d === null ? "brak 7d" : `+${snapshot.growth7d} / 7d`;
    const growth24h = snapshot.growth24h === null ? "brak 24h" : `+${snapshot.growth24h} / 24h`;
    items.push({
      id: `snapshot:${snapshot.id}`,
      type: "snapshot",
      title: `${snapshot.stars} stars`,
      detail: `${growth24h}, ${growth7d}`,
      timestamp: toTimelineDate(snapshot.capturedAt),
      tone: snapshot.growth7d && snapshot.growth7d > 0 ? "positive" : "neutral"
    });
  }

  for (const report of repository.reports) {
    items.push({
      id: `report:${report.id}`,
      type: "report",
      title: reportTimelineTitle(report),
      detail: reportTimelineDetail(report),
      timestamp: toTimelineDate(report.createdAt),
      tone: "positive"
    });
  }

  for (const action of repository.actionItems) {
    items.push({
      id: `action:${action.id}`,
      type: "action",
      title: action.title,
      detail: `${action.type} | ${action.status}`,
      timestamp: toTimelineDate(actionTimestamp(action)),
      tone: action.status === "DONE" ? "positive" : action.status === "DISMISSED" ? "warning" : "neutral"
    });
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getRepositoryTimeline(repoId: string): Promise<RepositoryTimelineItem[]> {
  const repository = await prisma.repository.findUniqueOrThrow({
    where: { id: repoId },
    select: {
      id: true,
      fullName: true,
      status: true,
      firstSeenAt: true,
      lastSeenAt: true,
      updatedDbAt: true,
      ignoredRecord: {
        select: {
          ignoredAt: true,
          reason: true
        }
      },
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 8,
        select: {
          id: true,
          capturedAt: true,
          stars: true,
          growth24h: true,
          growth7d: true
        }
      },
      reports: {
        where: { type: { in: ["repo", "repo_quick_brief", "scoring_snapshot", "decision_log"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true
        }
      },
      actionItems: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          type: true,
          status: true,
          title: true,
          createdAt: true,
          completedAt: true,
          dismissedAt: true
        }
      }
    }
  });

  return buildRepositoryTimelineItems(repository);
}
