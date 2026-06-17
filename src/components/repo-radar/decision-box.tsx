import type { ReportDisplaySection } from "@/lib/display/report-display";
import { Badge, SectionCard } from "./ui";

export function DecisionBox({ section }: { section: ReportDisplaySection | null }) {
  if (!section) {
    return (
      <SectionCard title="Werdykt" className="border-primary/20 bg-primary/5">
        <p className="text-sm text-muted-foreground">Ten raport nie ma osobnej sekcji werdyktu. Sprawdz podsumowanie i kolejne sekcje.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Werdykt"
      action={<Badge tone="accent">decision</Badge>}
      className="border-primary/20 bg-primary/5"
    >
      <div className="space-y-2 text-sm leading-6">
        {section.lines.length ? section.lines.map((line, index) => <p key={`${section.title}-${index}`}>{line}</p>) : <p>{section.body}</p>}
      </div>
    </SectionCard>
  );
}
