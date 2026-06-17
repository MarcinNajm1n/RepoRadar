import type React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "status" | "score" | "source" | "sentiment" | "risk" | "neutral";
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  tone?: BadgeTone;
  className?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
  accent: "border-primary/30 bg-primary/10 text-foreground"
};

const variantClasses: Record<BadgeVariant, string> = {
  status: "font-semibold",
  score: "font-semibold tabular-nums",
  source: "uppercase tracking-wide",
  sentiment: "font-medium",
  risk: "font-semibold",
  neutral: ""
};

export function Badge({ children, variant = "neutral", tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs leading-none",
        toneClasses[tone],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
