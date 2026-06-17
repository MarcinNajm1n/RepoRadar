import type { ReportDisplaySection } from "@/lib/display/report-display";
import { Badge, SectionCard } from "./ui";

export function ReportSection({ section, index }: { section: ReportDisplaySection; index: number }) {
  return (
    <SectionCard
      title={section.title}
      action={section.kind !== "generic" ? <Badge>{section.kind.replaceAll("_", " ")}</Badge> : undefined}
    >
      <div id={`report-section-${index}`} className="space-y-2 text-sm leading-6">
        {section.lines.length ? (
          section.lines.map((line, lineIndex) => <p key={`${section.title}-${lineIndex}`}>{line}</p>)
        ) : (
          <p className="text-muted-foreground">Brak tresci w tej sekcji.</p>
        )}
      </div>
    </SectionCard>
  );
}
