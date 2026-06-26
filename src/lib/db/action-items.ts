import { prisma } from "./client";
import { ACTION_ITEM_STATUSES, isActionItemStatus, isActionItemType } from "@/types/action-item";
import { recordActionItemDecision } from "./repository-audit";
import type {
  ActionItemListItem,
  ActionItemStatus,
  ActionItemType,
  CreateActionItemInput,
  UpdateActionItemInput
} from "@/types/action-item";
import { clamp, safeJsonParse, sanitizeExternalText } from "@/lib/utils";

export const ACTIVE_ACTION_ITEM_STATUSES: ActionItemStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "SNOOZED"
];
const DEFAULT_ACTION_ITEM_LIMIT = 50;
const DEFAULT_ACTIVE_ACTION_ITEM_LIMIT = 20;
const MAX_ACTION_ITEM_LIMIT = 100;

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

function cleanTitle(title: string) {
  const cleaned = sanitizeExternalText(title, 160);
  if (!cleaned) {
    throw new Error("Action item title is required.");
  }

  return cleaned;
}

function cleanOptionalText(value: string | null | undefined, maxLength: number) {
  return sanitizeExternalText(value, maxLength);
}

function cleanOptionalDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid action item date.");
  }

  return date;
}

function cleanMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return "{}";
  }

  return JSON.stringify(metadata);
}

function cleanPriority(priority: unknown) {
  if (typeof priority !== "number" || !Number.isFinite(priority)) {
    return 0;
  }

  return Math.round(clamp(priority, -100, 100));
}

function cleanLimit(limit: unknown, fallback: number) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return fallback;
  }

  return Math.floor(clamp(limit, 1, MAX_ACTION_ITEM_LIMIT));
}

function buildCreateData(input: CreateActionItemInput) {
  return {
    type: normalizeActionItemType(input.type),
    title: cleanTitle(input.title),
    description: cleanOptionalText(input.description, 1000),
    repoId: input.repoId || null,
    ideaId: input.ideaId || null,
    reportId: input.reportId || null,
    priority: cleanPriority(input.priority),
    dueAt: cleanOptionalDate(input.dueAt),
    dedupeKey: cleanOptionalText(input.dedupeKey, 200),
    metadataJson: cleanMetadata(input.metadata)
  };
}

function buildUpdateData(input: UpdateActionItemInput) {
  return {
    ...(input.type !== undefined ? { type: normalizeActionItemType(input.type) } : {}),
    ...(input.status !== undefined ? { status: normalizeActionItemStatus(input.status) } : {}),
    ...(input.title !== undefined ? { title: cleanTitle(input.title) } : {}),
    ...(input.description !== undefined ? { description: cleanOptionalText(input.description, 1000) } : {}),
    ...(input.repoId !== undefined ? { repoId: input.repoId || null } : {}),
    ...(input.ideaId !== undefined ? { ideaId: input.ideaId || null } : {}),
    ...(input.reportId !== undefined ? { reportId: input.reportId || null } : {}),
    ...(input.priority !== undefined ? { priority: cleanPriority(input.priority) } : {}),
    ...(input.dueAt !== undefined ? { dueAt: cleanOptionalDate(input.dueAt) } : {}),
    ...(input.snoozedUntil !== undefined ? { snoozedUntil: cleanOptionalDate(input.snoozedUntil) } : {}),
    ...(input.completedAt !== undefined ? { completedAt: cleanOptionalDate(input.completedAt) } : {}),
    ...(input.dismissedAt !== undefined ? { dismissedAt: cleanOptionalDate(input.dismissedAt) } : {}),
    ...(input.dedupeKey !== undefined ? { dedupeKey: cleanOptionalText(input.dedupeKey, 200) } : {}),
    ...(input.metadata !== undefined ? { metadataJson: cleanMetadata(input.metadata) } : {})
  };
}

export async function getActionItems(limit: number | null = DEFAULT_ACTION_ITEM_LIMIT) {
  const take = limit === null ? null : cleanLimit(limit, DEFAULT_ACTION_ITEM_LIMIT);
  const rows = await prisma.actionItem.findMany({
    where: {
      status: {
        in: Object.keys(ACTION_ITEM_STATUSES)
      }
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    ...(take === null ? {} : { take }),
    include: {
      repository: { select: { fullName: true, url: true } },
      idea: { select: { title: true } },
      report: { select: { title: true } }
    }
  });

  return rows.map(mapActionItem);
}
export async function getActiveActionItems(limit = DEFAULT_ACTIVE_ACTION_ITEM_LIMIT) {
  const now = new Date();
  const take = cleanLimit(limit, DEFAULT_ACTIVE_ACTION_ITEM_LIMIT);
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
    take,
    include: {
      repository: { select: { fullName: true, url: true } },
      idea: { select: { title: true } },
      report: { select: { title: true } }
    }
  });

  return rows.map(mapActionItem);
}

export async function createActionItem(input: CreateActionItemInput) {
  const data = buildCreateData(input);
  const include = {
    repository: { select: { fullName: true, url: true } },
    idea: { select: { title: true } },
    report: { select: { title: true } }
  };
  const item = data.dedupeKey
    ? await prisma.actionItem.upsert({
        where: { dedupeKey: data.dedupeKey },
        update: data,
        create: data,
        include
      })
    : await prisma.actionItem.create({
        data,
        include
      });

  await recordActionItemDecision(item);

  return mapActionItem(item);
}

export async function updateActionItem(id: string, input: UpdateActionItemInput) {
  const item = await prisma.actionItem.update({
    where: { id },
    data: buildUpdateData(input),
    include: {
      repository: { select: { fullName: true, url: true } },
      idea: { select: { title: true } },
      report: { select: { title: true } }
    }
  });

  return mapActionItem(item);
}

export async function completeActionItem(id: string) {
  return updateActionItem(id, {
    status: "DONE",
    completedAt: new Date().toISOString(),
    dismissedAt: null,
    snoozedUntil: null
  });
}

export async function snoozeActionItem(id: string, snoozedUntil: string | Date) {
  return updateActionItem(id, {
    status: "SNOOZED",
    snoozedUntil
  });
}

export async function dismissActionItem(id: string) {
  return updateActionItem(id, {
    status: "DISMISSED",
    completedAt: null,
    dismissedAt: new Date().toISOString(),
    snoozedUntil: null
  });
}
