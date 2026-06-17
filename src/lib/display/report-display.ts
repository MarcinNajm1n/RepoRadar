import { cleanDisplayText } from "./clean-display-text";

export type ReportSectionKind =
  | "title"
  | "goal"
  | "decision"
  | "executive_summary"
  | "problem"
  | "target_users"
  | "solution"
  | "mvp"
  | "monetization"
  | "risks"
  | "first_steps"
  | "evidence"
  | "generic";

export type ReportDisplaySection = {
  title: string;
  body: string;
  kind: ReportSectionKind;
  lines: string[];
};

export type ReportDisplay = {
  title: string;
  sections: ReportDisplaySection[];
  rawMarkdown: string;
  hasDecisionSection: boolean;
  hasExecutiveSummary: boolean;
};

function sectionKind(title: string): ReportSectionKind {
  const normalized = title.toLowerCase();
  if (normalized.includes("cel raportu")) {
    return "goal";
  }
  if (normalized.includes("werdykt") || normalized.includes("decision")) {
    return "decision";
  }
  if (normalized.includes("executive summary") || normalized.includes("tl;dr")) {
    return "executive_summary";
  }
  if (normalized.includes("problem")) {
    return "problem";
  }
  if (normalized.includes("dla kogo") || normalized.includes("target users")) {
    return "target_users";
  }
  if (normalized.includes("solution") || normalized.includes("rozwiazanie")) {
    return "solution";
  }
  if (normalized.includes("mvp")) {
    return "mvp";
  }
  if (normalized.includes("monetization") || normalized.includes("monetyzacja")) {
    return "monetization";
  }
  if (normalized.includes("ryzyka") || normalized.includes("risks")) {
    return "risks";
  }
  if (normalized.includes("następne kroki") || normalized.includes("nastepne kroki") || normalized.includes("first")) {
    return "first_steps";
  }
  if (normalized.includes("evidence") || normalized.includes("zrodla") || normalized.includes("źródła")) {
    return "evidence";
  }
  return "generic";
}

function cleanReportLine(line: string) {
  return cleanDisplayText(line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""), { maxLength: 700 });
}

export function parseReportForDisplay(content: string): ReportDisplay {
  const rawMarkdown = content ?? "";
  const lines = rawMarkdown.split(/\r?\n/);
  const sections: ReportDisplaySection[] = [];
  let documentTitle = "Raport";
  let currentTitle = "Raport";
  let currentBody: string[] = [];

  function flushSection() {
    const body = currentBody.join("\n").trim();
    if (!body) {
      return;
    }

    sections.push({
      title: cleanDisplayText(currentTitle, { fallback: "Sekcja" }),
      body,
      kind: sectionKind(currentTitle),
      lines: body.split(/\r?\n/).map(cleanReportLine).filter(Boolean)
    });
  }

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) {
      currentBody.push(line);
      continue;
    }

    const title = match[2].trim();
    if (match[1] === "#" && documentTitle === "Raport") {
      documentTitle = cleanDisplayText(title, { fallback: "Raport" });
    }

    flushSection();
    currentTitle = title;
    currentBody = [];
  }

  flushSection();

  const normalizedSections = sections.length
    ? sections
    : [
        {
          title: "Raport",
          body: rawMarkdown,
          kind: "generic" as const,
          lines: rawMarkdown.split(/\r?\n/).map(cleanReportLine).filter(Boolean)
        }
      ];

  return {
    title: documentTitle,
    sections: normalizedSections,
    rawMarkdown,
    hasDecisionSection: normalizedSections.some((section) => section.kind === "decision"),
    hasExecutiveSummary: normalizedSections.some((section) => section.kind === "executive_summary")
  };
}
