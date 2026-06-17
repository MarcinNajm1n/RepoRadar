import { ClipboardList } from "lucide-react";
import type { ActionItemListItem } from "@/types/action-item";
import { ActionItemCard } from "./action-item-card";
import { Button, EmptyState, SectionCard } from "./ui";

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
  return (
    <section className="space-y-4">
      <SectionCard
        title="Zadania"
        description="Kolejka decyzji, researchu i recznego sprawdzenia repo."
        action={
          <Button variant="secondary" onClick={onCreateManualTask} disabled={isPending}>
            <ClipboardList className="h-4 w-4" /> Dodaj zadanie
          </Button>
        }
      >
        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                isPending={isPending}
                onComplete={() => onComplete(item.id)}
                onSnooze={() => onSnooze(item.id)}
                onDismiss={() => onDismiss(item.id)}
              />
            ))
          ) : (
            <EmptyState title="Brak zadan" text="Dodaj zadanie reczne albo skorzystaj z quick actions przy repo." />
          )}
        </div>
      </SectionCard>
    </section>
  );
}
