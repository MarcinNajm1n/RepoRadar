import type React from "react";
import { StatStrip } from "./stat-strip";
import type { StatStripItem } from "./stat-strip";

export function TopBar({
  title,
  description,
  actions,
  message,
  stats
}: {
  title: string;
  description: string;
  actions: React.ReactNode;
  message: string | null;
  stats: StatStripItem[];
}) {
  return (
    <header className="mb-4 rounded-lg border border-border bg-card p-4 shadow-soft">
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
      {message ? (
        <div className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" role="status">
          {message}
        </div>
      ) : null}
    </header>
  );
}
