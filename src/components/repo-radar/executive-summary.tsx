import type { ReportDisplaySection } from "@/lib/display/report-display";
import { SectionCard } from "./ui";

export function ExecutiveSummary({ section }: { section: ReportDisplaySection | null }) {
  if (!section) {
    return null;
  }

  return (
    <SectionCard title="Executive summary">
      <div className="space-y-2 text-sm leading-6">
        {section.lines.map((line, index) => (
          <p key={`${section.title}-${index}`}>{line}</p>
        ))}
      </div>
    </SectionCard>
  );
}
