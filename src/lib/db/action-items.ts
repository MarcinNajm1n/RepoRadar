import { prisma } from "./client";
import { ACTION_ITEM_STATUSES, isActionItemStatus, isActionItemType } from "@/types/action-item";
import type { ActionItemListItem, ActionItemStatus, ActionItemType } from "@/types/action-item";
import { safeJsonParse } from "@/lib/utils";

export const ACTIVE_ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "SNOOZED"
];

type ActionItemRecord = Awaited<ReturnType<typeof prisma.actionItem.findMany>>[number] & {
  repository?: { fullName: string; url: string } | null;
  idea?: { title: string } | null;
  report?: { title: string } | null;
};

export function mapActionItem(item: ActionItemRecord): ActionItemListItem {
  return {
    id: item.id,
    type: item.type,
    status: item.status,
    title: item.title,
    description: item.description,
    repoId: item.repoId,
    repoFullName: item.repository?.fullName ?? null,
    repoUrl: item.repository?.url ?? null,
    ideaId: item.ideaId,
    ideaTitle: item.idea?.title ?? null,
    reportId: item.reportId,
    reportTitle: item.report?.title ?? null,
    priority: item.priority,
    dueAt: item.dueAt?.toISOString() ?? null,
    snoozedUntil: item.snoozedUntil?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    dismissedAt: item.dismissedAt?.toISOString() ?? null,
    dedupeKey: item.dedupeKey,
    metadata: safeJsonParse<Record<string, unknown>>(item.metadataJson, {}),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function normalizeActionItemType(type: string): ActionItemType {
  if (!isActionItemType(type)) {
    throw new Error(`Unsupported action item type: ${type}`);
  }

  return type;
}

export function normalizeActionItemStatus(status: string): ActionItemStatus {
  if (!isActionItemStatus(status)) {
    throw new Error(`Unsupported action item status: ${status}`);
  }

  return status;
}

export async function getActionItems(limit = 50) {
  const rows = await prisma.actionItem.findMany({
    where: {
      status: {
        in: Object.keys(ACTION_ITEM_STATUSES)
      }
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      repository: { select: { fullName: true, url: true } },
      idea: { select: { title: true } },
      report: { select: { title: true } }
    }
  });

  return rows.map(mapActionItem);
}
export async function getActiveActionItems(limit = 20) {
  const now = new Date();
  const rows = await prisma.actionItem.findMany({
    where: {
      OR: [
        { status: { in: ["OPEN", "IN_PROGRESS"] } },
        {
          status: "SNOOZED",
          OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }]
        }
      ]
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      repository: { select: { fullName: true, url: true } },
      idea: { select: { title: true } },
      report: { select: { title: true } }
    }
  });

  return rows.map(mapActionItem);
}
