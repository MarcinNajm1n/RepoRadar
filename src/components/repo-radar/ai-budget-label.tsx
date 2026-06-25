import type { OpenAiActionKind } from "@/lib/openai/token-budgets";
import { formatOpenAiBudgetBadgeLabel } from "@/lib/openai/token-budgets";
import { Badge } from "./ui";

export function formatAiBudgetActionLabel(label: string, action: OpenAiActionKind) {
  return `${label}. ${formatOpenAiBudgetBadgeLabel(action)}`;
}

export function AiBudgetLabel({ action }: { action: OpenAiActionKind }) {
  const label = formatOpenAiBudgetBadgeLabel(action);

  return (
    <Badge tone="warning" variant="score" className="whitespace-nowrap text-[10px]">
      {label}
    </Badge>
  );
}
