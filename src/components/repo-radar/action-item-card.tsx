import { CalendarClock, CheckCircle2, Trash2 } from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import { formatActionItemStatus, formatActionItemType } from "@/types/action-item";
import { cleanDisplayText } from "@/lib/display/clean-display-text";
import { formatDisplayDate } from "@/lib/display/formatters";
import { Badge, Button, TextClamp } from "./ui";

export function ActionItemCard({
  item,
  isPending,
  onComplete,
  onSnooze,
  onDismiss
}: {
  item: ActionItemListItem;
  isPending: boolean;
  onComplete: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const target = item.repoFullName ?? item.ideaTitle ?? item.reportTitle ?? "bez powiazania";

  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words font-semibold">{cleanDisplayText(item.title, { maxLength: 120 })}</h4>
            <Badge>{formatActionItemType(item.type)}</Badge>
            <Badge>{formatActionItemStatus(item.status)}</Badge>
            {item.priority ? <Badge>Priority {item.priority}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{cleanDisplayText(target, { maxLength: 160 })}</p>
          {item.description ? (
            <TextClamp lines={2} className="mt-2">
              {cleanDisplayText(item.description, { maxLength: 220 })}
            </TextClamp>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.dueAt ? <span>Due: {formatDisplayDate(item.dueAt)}</span> : null}
            {item.snoozedUntil ? <span>Snooze: {formatDisplayDate(item.snoozedUntil)}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onComplete} disabled={isPending || item.status === "DONE"}>
            <CheckCircle2 className="h-4 w-4" /> Done
          </Button>
          <Button variant="secondary" onClick={onSnooze} disabled={isPending || item.status === "DONE" || item.status === "DISMISSED"}>
            <CalendarClock className="h-4 w-4" /> Jutro
          </Button>
          <Button variant="danger" onClick={onDismiss} disabled={isPending || item.status === "DISMISSED"}>
            <Trash2 className="h-4 w-4" /> Odrzuc
          </Button>
        </div>
      </div>
    </article>
  );
}
