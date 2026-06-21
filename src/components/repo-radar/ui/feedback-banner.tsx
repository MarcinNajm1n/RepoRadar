import type React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedbackTone = "success" | "error" | "info";

export type FeedbackState = {
  tone: FeedbackTone;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

const toneClasses: Record<FeedbackTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info"
};

const icons: Record<FeedbackTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export function FeedbackBanner({ feedback, className }: { feedback: FeedbackState | null; className?: string }) {
  if (!feedback) {
    return null;
  }

  const Icon = icons[feedback.tone];
  const isError = feedback.tone === "error";

  return (
    <div
      className={cn(
        "mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        toneClasses[feedback.tone],
        className
      )}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{feedback.message}</span>
      {feedback.action ? (
        <button
          type="button"
          className="ml-auto shrink-0 rounded-md border border-current/30 px-2 py-1 text-xs font-semibold transition hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          onClick={feedback.action.onClick}
        >
          {feedback.action.label}
        </button>
      ) : null}
    </div>
  );
}
