"use client";

import { ClipboardList } from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import { ActionItemCard } from "./action-item-card";
import { Button, EmptyState, MetricPill, SectionCard } from "./ui";

export function TasksView({
  items,
  isPending,
  onCreateManualTask,
  onComplete,
  onSnooze,
  onDismiss
}: {
  items: ActionItemListItem[];
  isPending: boolean;
  onCreateManualTask: () => void;
  onComplete: (itemId: string) => void;
  onSnooze: (itemId: string) => void;
  onDismiss: (itemId: string) => void;
}) {
  const readyItems = sortQueueItems(items.filter((item) => item.status !== "DONE" && item.status !== "DISMISSED" && item.status !== "SNOOZED"));
  const snoozedItems = sortQueueItems(items.filter((item) => item.status === "SNOOZED"));
  const closedItems = sortQueueItems(items.filter((item) => item.status === "DONE" || item.status === "DISMISSED"));

  return (
    <section className="space-y-4">
      <SectionCard
        title="Kolejka akcji"
        description="Repo, pomysly i raporty wymagajace decyzji albo sprawdzenia."
        action={
          <Button variant="secondary" onClick={onCreateManualTask} disabled={isPending}>
            <ClipboardList className="h-4 w-4" /> Dodaj zadanie
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <MetricPill label="Do zrobienia" value={readyItems.length} />
          <MetricPill label="Odlozone" value={snoozedItems.length} />
          <MetricPill label="Zamkniete" value={closedItems.length} />
          <MetricPill label="Razem" value={items.length} />
        </div>
      </SectionCard>

      <QueueGroup
        title="Do zrobienia"
        emptyTitle="Brak aktywnych zadan"
        emptyText="Dodaj zadanie reczne albo skorzystaj z quick actions przy repo."
        items={readyItems}
        isPending={isPending}
        onComplete={onComplete}
        onSnooze={onSnooze}
        onDismiss={onDismiss}
      />

      {snoozedItems.length ? (
        <QueueGroup
          title="Odlozone"
          items={snoozedItems}
          isPending={isPending}
          onComplete={onComplete}
          onSnooze={onSnooze}
          onDismiss={onDismiss}
        />
      ) : null}

      {closedItems.length ? (
        <details className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
          <summary className="cursor-pointer text-base font-semibold">Zamkniete ({closedItems.length})</summary>
          <div className="mt-3 space-y-3">
            {closedItems.map((item, index) => (
              <ActionItemCard
                key={item.id}
                item={item}
                position={index + 1}
                isPending={isPending}
                onComplete={() => onComplete(item.id)}
                onSnooze={() => onSnooze(item.id)}
                onDismiss={() => onDismiss(item.id)}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function QueueGroup({
  title,
  emptyTitle,
  emptyText,
  items,
  isPending,
  onComplete,
  onSnooze,
  onDismiss
}: {
  title: string;
  emptyTitle?: string;
  emptyText?: string;
  items: ActionItemListItem[];
  isPending: boolean;
  onComplete: (itemId: string) => void;
  onSnooze: (itemId: string) => void;
  onDismiss: (itemId: string) => void;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <ActionItemCard
              key={item.id}
              item={item}
              position={index + 1}
              isPending={isPending}
              onComplete={() => onComplete(item.id)}
              onSnooze={() => onSnooze(item.id)}
              onDismiss={() => onDismiss(item.id)}
            />
          ))
        ) : (
          <EmptyState title={emptyTitle ?? "Brak zadan"} text={emptyText ?? "Ta czesc kolejki jest pusta."} />
        )}
      </div>
    </SectionCard>
  );
}

function sortQueueItems(items: ActionItemListItem[]) {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) {
      return aDue - bDue;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
