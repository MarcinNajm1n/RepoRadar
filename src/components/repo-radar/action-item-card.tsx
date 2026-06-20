"use client";

import { CalendarClock, CheckCircle2, Trash2 } from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import { formatActionItemStatus, formatActionItemType } from "@/types/action-item";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDisplayDate } from "@/lib/display/formatters";
import { cn } from "@/lib/utils";
import { Badge, Button, TextClamp } from "./ui";
import type { BadgeTone } from "./ui";

export function ActionItemCard({
  item,
  position,
  isPending,
  onComplete,
  onSnooze,
  onDismiss
}: {
  item: ActionItemListItem;
  position?: number;
  isPending: boolean;
  onComplete: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const target = item.repoFullName ?? item.ideaTitle ?? item.reportTitle ?? "bez powiazania";
  const isClosed = item.status === "DONE" || item.status === "DISMISSED";

  return (
    <article
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-raised p-3",
        isClosed && "opacity-75"
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[2rem_minmax(0,1fr)_auto]">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-surface-inset text-xs font-semibold tabular-nums text-muted-foreground">
          {position ?? item.priority}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words font-semibold">{cleanDisplayText(item.title, { maxLength: 120 })}</h4>
            <Badge variant="status" tone={statusTone(item.status)}>
              {formatActionItemStatus(item.status)}
            </Badge>
            <Badge variant="source">{formatActionItemType(item.type)}</Badge>
            {item.priority ? <Badge variant="score">P{item.priority}</Badge> : null}
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">{cleanDisplayText(target, { maxLength: 160 })}</p>
          {item.description ? (
            <TextClamp lines={2} className="mt-2">
              {cleanDisplayText(item.description, { maxLength: 220 })}
            </TextClamp>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.dueAt ? <span>Termin: {formatDisplayDate(item.dueAt)}</span> : null}
            {item.snoozedUntil ? <span>Odlozone do: {formatDisplayDate(item.snoozedUntil)}</span> : null}
            {item.completedAt ? <span>Zrobione: {formatDisplayDate(item.completedAt)}</span> : null}
            {item.dismissedAt ? <span>Odrzucone: {formatDisplayDate(item.dismissedAt)}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
          <Button variant="secondary" size="sm" onClick={onComplete} disabled={isPending || item.status === "DONE"}>
            <CheckCircle2 className="h-4 w-4" /> Zrobione
          </Button>
          <Button variant="secondary" size="sm" onClick={onSnooze} disabled={isPending || item.status === "DONE" || item.status === "DISMISSED"}>
            <CalendarClock className="h-4 w-4" /> Jutro
          </Button>
          <Button variant="danger" size="sm" onClick={onDismiss} disabled={isPending || item.status === "DISMISSED"}>
            <Trash2 className="h-4 w-4" /> Odrzuc
          </Button>
        </div>
      </div>
    </article>
  );
}

function statusTone(status: string): BadgeTone {
  if (status === "DONE") {
    return "success";
  }
  if (status === "SNOOZED") {
    return "warning";
  }
  if (status === "DISMISSED") {
    return "danger";
  }
  if (status === "IN_PROGRESS") {
    return "info";
  }
  return "accent";
}
