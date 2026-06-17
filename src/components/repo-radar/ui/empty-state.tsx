import type React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  text,
  primaryAction,
  secondaryAction,
  className
}: {
  title: string;
  text: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-border bg-muted p-5 text-sm", className)}>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-2xl text-muted-foreground">{text}</p>
      {primaryAction || secondaryAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
