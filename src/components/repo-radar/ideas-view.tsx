import type React from "react";
import type { IdeaListItem } from "@/types/repository";
import { EmptyState } from "./ui";
import { CandidateCard } from "./candidate-card";
import { FullIdeaCard } from "./full-idea-card";
import { IdeaCard } from "./idea-card";

export type IdeasViewMode = "candidates" | "full" | "saved" | "dismissed";

export function IdeasView({
  mode,
  ideas,
  isPending,
  emptyTitle,
  emptyText,
  onPromote,
  onSave,
  onDismiss,
  onRestore,
  onOpenDetail,
  renderEvidence
}: {
  mode: IdeasViewMode;
  ideas: IdeaListItem[];
  isPending: boolean;
  emptyTitle: string;
  emptyText: string;
  onPromote: (ideaId: string) => void;
  onSave: (ideaId: string) => void;
  onDismiss: (ideaId: string) => void;
  onRestore: (ideaId: string) => void;
  onOpenDetail: (idea: IdeaListItem) => void;
  renderEvidence?: (idea: IdeaListItem) => React.ReactNode;
}) {
  if (!ideas.length) {
    return (
      <section className="space-y-3">
        <EmptyState title={emptyTitle} text={emptyText} />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {ideas.map((idea) => {
        if (mode === "candidates") {
          return (
            <CandidateCard
              key={idea.id}
              idea={idea}
              isPending={isPending}
              onPromote={() => onPromote(idea.id)}
              onSave={() => onSave(idea.id)}
              onDismiss={() => onDismiss(idea.id)}
              onOpenDetail={() => onOpenDetail(idea)}
            />
          );
        }

        if (mode === "full") {
          return (
            <FullIdeaCard
              key={idea.id}
              idea={idea}
              evidence={renderEvidence?.(idea)}
              onOpenDetail={() => onOpenDetail(idea)}
            />
          );
        }

        return (
          <IdeaCard
            key={idea.id}
            idea={idea}
            isPending={isPending}
            muted={mode === "dismissed"}
            onOpenDetail={() => onOpenDetail(idea)}
            onDismiss={mode === "saved" ? () => onDismiss(idea.id) : undefined}
            onRestore={mode === "dismissed" ? () => onRestore(idea.id) : undefined}
          />
        );
      })}
    </section>
  );
}
