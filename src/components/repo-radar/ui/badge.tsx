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
  neutral: "border-border-subtle bg-surface-inset text-muted-foreground",
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning-foreground",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
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
