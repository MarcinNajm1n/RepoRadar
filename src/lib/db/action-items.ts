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
const MAX_ACTION_ITEM_METADATA_KEYS = 30;
const MAX_ACTION_ITEM_METADATA_KEY_LENGTH = 80;
const MAX_ACTION_ITEM_METADATA_STRING_LENGTH = 500;
const MAX_ACTION_ITEM_METADATA_ARRAY_ITEMS = 20;
const MAX_ACTION_ITEM_METADATA_DEPTH = 2;
const MAX_ACTION_ITEM_METADATA_BYTES = 20_000;

type CleanMetadataValue =
  | string
  | number
  | boolean
  | null
  | CleanMetadataValue[]
  | { [key: string]: CleanMetadataValue };

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

function cleanOptionalId(value: unknown) {
  return sanitizeExternalText(value, 120) || null;
}

function cleanRequiredId(value: unknown) {
  const id = cleanOptionalId(value);
  if (!id) {
    throw new Error("Action item id is required.");
  }

  return id;
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

function cleanMetadataValue(value: unknown, depth: number): CleanMetadataValue | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return sanitizeExternalText(value, MAX_ACTION_ITEM_METADATA_STRING_LENGTH) ?? "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ACTION_ITEM_METADATA_ARRAY_ITEMS)
      .map((item) => cleanMetadataValue(item, depth + 1))
      .filter((item): item is CleanMetadataValue => item !== undefined);
  }

  if (typeof value === "object" && value && depth < MAX_ACTION_ITEM_METADATA_DEPTH) {
    return cleanMetadataRecord(value as Record<string, unknown>, depth + 1);
  }

  return undefined;
}

function cleanMetadataRecord(metadata: Record<string, unknown>, depth = 0): Record<string, CleanMetadataValue> {
  const cleaned: Record<string, CleanMetadataValue> = {};

  for (const [rawKey, rawValue] of Object.entries(metadata).slice(0, MAX_ACTION_ITEM_METADATA_KEYS)) {
    const key = sanitizeExternalText(rawKey, MAX_ACTION_ITEM_METADATA_KEY_LENGTH);
    if (!key) {
      continue;
    }

    const value = cleanMetadataValue(rawValue, depth);
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function cleanMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "{}";
  }

  const json = JSON.stringify(cleanMetadataRecord(metadata));
  return new TextEncoder().encode(json).length <= MAX_ACTION_ITEM_METADATA_BYTES ? json : "{}";
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
    repoId: cleanOptionalId(input.repoId),
    ideaId: cleanOptionalId(input.ideaId),
    reportId: cleanOptionalId(input.reportId),
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
    ...(input.repoId !== undefined ? { repoId: cleanOptionalId(input.repoId) } : {}),
    ...(input.ideaId !== undefined ? { ideaId: cleanOptionalId(input.ideaId) } : {}),
    ...(input.reportId !== undefined ? { reportId: cleanOptionalId(input.reportId) } : {}),
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
    where: { id: cleanRequiredId(id) },
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
