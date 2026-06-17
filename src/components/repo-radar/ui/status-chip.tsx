import { Badge } from "./badge";
import type { DisplayTone, StatusDisplay } from "@/lib/display/status-display";

const toneMap: Record<DisplayTone, "neutral" | "info" | "success" | "warning" | "danger" | "accent"> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  accent: "accent"
};

export function StatusChip({ status }: { status: StatusDisplay }) {
  return (
    <Badge variant="status" tone={toneMap[status.tone]}>
      {status.label}
    </Badge>
  );
}
