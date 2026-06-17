import { cn } from "@/lib/utils";

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-border bg-muted text-muted-foreground";
  }
  if (score >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (score >= 60) {
    return "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200";
  }
  return "border-border bg-muted text-muted-foreground";
}

export function ScoreChip({ label, score, suffix = "/100", className }: { label: string; score: number | null | undefined; suffix?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums", scoreTone(score), className)}>
      <span>{label}</span>
      <span>{score === null || score === undefined ? "brak" : `${score}${suffix}`}</span>
    </span>
  );
}
