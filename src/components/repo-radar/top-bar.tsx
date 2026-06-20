"use client";

import type React from "react";
import { StatStrip } from "./stat-strip";
import type { StatStripItem } from "./stat-strip";
import { FeedbackBanner, type FeedbackState } from "./ui";

export function TopBar({
  title,
  description,
  actions,
  feedback,
  stats
}: {
  title: string;
  description: string;
  actions: React.ReactNode;
  feedback: FeedbackState | null;
  stats: StatStripItem[];
}) {
  return (
    <header className="sticky top-4 z-20 mb-4 rounded-lg border border-border-subtle bg-surface-panel/95 p-4 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      <div className="mt-4">
        <StatStrip items={stats} />
      </div>
      <FeedbackBanner feedback={feedback} />
    </header>
  );
}
