"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, RotateCcw, Search } from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import { ACTION_ITEM_STATUSES, ACTION_ITEM_TYPES, formatActionItemStatus, formatActionItemType } from "@/types/action-item";
import { cn } from "@/lib/utils";
import { ActionItemCard } from "./action-item-card";
import { Badge, Button, EmptyState, MetricPill, SectionCard } from "./ui";

const ALL_FILTER_VALUE = "ALL";
export const TASK_FILTER_STORAGE_KEY = "reporadar.taskFilters.v1";

export type TaskFilterState = {
  query: string;
  type: string;
  status: string;
  minPriority: number;
};

const DEFAULT_TASK_FILTERS: TaskFilterState = {
  query: "",
  type: ALL_FILTER_VALUE,
  status: ALL_FILTER_VALUE,
  minPriority: 0
};

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
  const [initialFilters] = useState(readPersistedTaskFilters);
  const [query, setQuery] = useState(initialFilters.query);
  const [typeFilter, setTypeFilter] = useState(initialFilters.type);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);
  const [minPriority, setMinPriority] = useState(initialFilters.minPriority);
  const filters = useMemo(
    () => ({ query, type: typeFilter, status: statusFilter, minPriority }),
    [query, typeFilter, statusFilter, minPriority]
  );
  const hasActiveFilters = hasActiveTaskFilters(filters);
  const activeFilterLabels = buildTaskFilterLabels(filters);
  const filteredItems = useMemo(() => filterQueueItems(items, filters), [items, filters]);
  const readyItems = sortQueueItems(filteredItems.filter((item) => item.status !== "DONE" && item.status !== "DISMISSED" && item.status !== "SNOOZED"));
  const snoozedItems = sortQueueItems(filteredItems.filter((item) => item.status === "SNOOZED"));
  const closedItems = sortQueueItems(filteredItems.filter((item) => item.status === "DONE" || item.status === "DISMISSED"));
  const resetFilters = () => {
    setQuery("");
    setTypeFilter(ALL_FILTER_VALUE);
    setStatusFilter(ALL_FILTER_VALUE);
    setMinPriority(0);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (hasActiveFilters) {
        window.localStorage.setItem(TASK_FILTER_STORAGE_KEY, serializeTaskFilterState(filters));
      } else {
        window.localStorage.removeItem(TASK_FILTER_STORAGE_KEY);
      }
    } catch {
      // Filters still work for the current session when localStorage is unavailable.
    }
  }, [filters, hasActiveFilters]);

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
          <MetricPill label="Widoczne" value={`${filteredItems.length}/${items.length}`} />
        </div>

        <div className="mt-4 rounded-md border border-border-subtle bg-surface-inset p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_180px_160px_130px_auto]">
            <label className="relative min-w-0">
              <span className="sr-only">Szukaj zadan</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={controlClassName("pl-9")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Szukaj tytulu, repo, pomyslu..."
              />
            </label>

            <label>
              <span className="sr-only">Typ zadania</span>
              <select className={controlClassName()} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value={ALL_FILTER_VALUE}>Wszystkie typy</option>
                {Object.keys(ACTION_ITEM_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {formatActionItemType(type)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Status zadania</span>
              <select className={controlClassName()} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value={ALL_FILTER_VALUE}>Wszystkie statusy</option>
                {Object.keys(ACTION_ITEM_STATUSES).map((status) => (
                  <option key={status} value={status}>
                    {formatActionItemStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex h-9 items-center gap-2 rounded-md border border-control-border bg-control px-3 text-xs font-medium text-muted-foreground">
              Priorytet
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none"
                type="number"
                min={0}
                max={100}
                value={minPriority}
                onChange={(event) => setMinPriority(clampPriority(event.target.value))}
              />
            </label>

            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!hasActiveFilters} className="h-9">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold uppercase text-muted-foreground">Filtry zadan</span>
            {hasActiveFilters ? (
              <>
                <span className="tabular-nums text-foreground">
                  Pokazano {filteredItems.length} z {items.length}
                </span>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {activeFilterLabels.map((filter) => (
                    <Badge key={filter} tone="info" className="max-w-full truncate">
                      {filter}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <span>Brak aktywnych filtrow</span>
            )}
          </div>
        </div>
      </SectionCard>

      {filteredItems.length === 0 && hasActiveFilters ? (
        <SectionCard title="Wyniki filtrowania">
          <EmptyState
            title="Brak zadan dla tych filtrow"
            text="Zmien tekst, typ, status albo minimalny priorytet, zeby zobaczyc wiecej elementow kolejki."
            primaryAction={
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Resetuj filtry
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <>
          {!hasActiveFilters || readyItems.length ? (
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
          ) : null}

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
            hasActiveFilters ? (
              <QueueGroup
                title="Zamkniete"
                items={closedItems}
                isPending={isPending}
                onComplete={onComplete}
                onSnooze={onSnooze}
                onDismiss={onDismiss}
              />
            ) : (
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
            )
          ) : null}
        </>
      )}
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

export function filterQueueItems(items: ActionItemListItem[], filters: TaskFilterState) {
  const normalizedQuery = normalizeFilterText(filters.query);

  return items.filter((item) => {
    if (filters.type !== ALL_FILTER_VALUE && item.type !== filters.type) {
      return false;
    }

    if (filters.status !== ALL_FILTER_VALUE && item.status !== filters.status) {
      return false;
    }

    if (filters.minPriority > 0 && item.priority < filters.minPriority) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      item.title,
      item.description,
      item.repoFullName,
      item.ideaTitle,
      item.reportTitle,
      formatActionItemType(item.type),
      formatActionItemStatus(item.status)
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeFilterText(value).includes(normalizedQuery));
  });
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

function hasActiveTaskFilters(filters: TaskFilterState) {
  return filters.query.trim().length > 0 || filters.type !== ALL_FILTER_VALUE || filters.status !== ALL_FILTER_VALUE || filters.minPriority > 0;
}

function buildTaskFilterLabels(filters: TaskFilterState) {
  return [
    filters.query.trim() ? `Szukaj: ${filters.query.trim()}` : null,
    filters.type !== ALL_FILTER_VALUE ? `Typ: ${formatActionItemType(filters.type)}` : null,
    filters.status !== ALL_FILTER_VALUE ? `Status: ${formatActionItemStatus(filters.status)}` : null,
    filters.minPriority > 0 ? `Priorytet >= ${filters.minPriority}` : null
  ].filter((value): value is string => Boolean(value));
}

function normalizeFilterText(value: string) {
  return value.trim().toLowerCase();
}

function clampPriority(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return clampPriorityValue(parsed);
}

export function parseTaskFilterState(value: string | null): TaskFilterState {
  if (!value) {
    return DEFAULT_TASK_FILTERS;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_TASK_FILTERS;
    }

    const input = parsed as Partial<TaskFilterState>;
    return {
      query: typeof input.query === "string" ? input.query.slice(0, 160) : DEFAULT_TASK_FILTERS.query,
      type: normalizeTaskTypeFilter(input.type),
      status: normalizeTaskStatusFilter(input.status),
      minPriority: clampPriorityValue(input.minPriority)
    };
  } catch {
    return DEFAULT_TASK_FILTERS;
  }
}

export function serializeTaskFilterState(filters: TaskFilterState) {
  return JSON.stringify({
    query: filters.query.trim().slice(0, 160),
    type: normalizeTaskTypeFilter(filters.type),
    status: normalizeTaskStatusFilter(filters.status),
    minPriority: clampPriorityValue(filters.minPriority)
  });
}

function readPersistedTaskFilters() {
  if (typeof window === "undefined") {
    return DEFAULT_TASK_FILTERS;
  }

  try {
    return parseTaskFilterState(window.localStorage.getItem(TASK_FILTER_STORAGE_KEY));
  } catch {
    return DEFAULT_TASK_FILTERS;
  }
}

function normalizeTaskTypeFilter(value: unknown) {
  return typeof value === "string" && (value === ALL_FILTER_VALUE || Object.prototype.hasOwnProperty.call(ACTION_ITEM_TYPES, value))
    ? value
    : DEFAULT_TASK_FILTERS.type;
}

function normalizeTaskStatusFilter(value: unknown) {
  return typeof value === "string" && (value === ALL_FILTER_VALUE || Object.prototype.hasOwnProperty.call(ACTION_ITEM_STATUSES, value))
    ? value
    : DEFAULT_TASK_FILTERS.status;
}

function clampPriorityValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TASK_FILTERS.minPriority;
  }

  return Math.max(0, Math.min(100, Math.floor(parsed)));
}

function controlClassName(className?: string) {
  return cn(
    "h-9 w-full rounded-md border border-control-border bg-control px-3 text-sm text-foreground outline-none transition duration-fast ease-interface",
    "focus:border-primary focus:ring-2 focus:ring-focus/30",
    className
  );
}
