"use client";

import { useState } from "react";
import type { EvidenceSourceItem } from "@/types/repository";
import { getEvidenceSummary, groupEvidenceSourcesForDisplay } from "@/lib/display/evidence-display";
import { Button, EmptyState } from "./ui";
import { EvidenceCard } from "./evidence-card";
import { EvidenceSummary } from "./evidence-summary";

export function EvidencePanel({
  sources,
  emptyText,
  visiblePerGroup = 2
}: {
  sources: EvidenceSourceItem[];
  emptyText: string;
  visiblePerGroup?: number;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const summary = getEvidenceSummary(sources);
  const groups = groupEvidenceSourcesForDisplay(sources, visiblePerGroup);

  if (!sources.length) {
    return (
      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">Evidence</h4>
        </div>
        <EmptyState
          title="Brak evidence"
          text={`${emptyText} Research moze byc wylaczony, provider mogl nie zwrocic wynikow albo uzyto cache bez zapisanych zrodel.`}
        />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Evidence</h4>
        <EvidenceSummary summary={summary} />
      </div>
      <div className="mt-3 space-y-3">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          const visibleSources = isExpanded ? group.sources : group.visibleSources;

          return (
            <section key={group.key} className="rounded-md border border-border bg-background p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="text-sm font-semibold">{group.label}</h5>
                  <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">{group.sources.length}</span>
                </div>
                {group.hiddenCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExpandedGroups((current) => {
                        const next = new Set(current);
                        if (next.has(group.key)) {
                          next.delete(group.key);
                        } else {
                          next.add(group.key);
                        }
                        return next;
                      });
                    }}
                  >
                    {isExpanded ? "Pokaz mniej" : `Pokaz wiecej (${group.hiddenCount})`}
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {visibleSources.map((source) => (
                  <EvidenceCard key={source.id} source={source} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
