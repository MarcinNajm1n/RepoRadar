import { cn } from "@/lib/utils";

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-border-subtle bg-surface-inset text-muted-foreground";
  }
  if (score >= 80) {
    return "border-success/30 bg-success/10 text-success";
  }
  if (score >= 60) {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  return "border-border-subtle bg-surface-inset text-muted-foreground";
}

export function ScoreChip({ label, score, suffix = "/100", className }: { label: string; score: number | null | undefined; suffix?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums", scoreTone(score), className)}>
      <span>{label}</span>
      <span>{score === null || score === undefined ? "brak" : `${score}${suffix}`}</span>
    </span>
  );
}
