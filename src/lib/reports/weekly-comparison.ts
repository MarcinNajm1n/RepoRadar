import type { ReportListItem, WeeklyReportComparison } from "@/types/repository";

export function extractWeeklyReportRepoNames(markdown: string) {
  const names = new Set<string>();
  const linkPattern = /^-\s+\[([^\]]+)\]\([^)]+\)/gm;
  let match = linkPattern.exec(markdown);

  while (match) {
    names.add(match[1]);
    match = linkPattern.exec(markdown);
  }

  return [...names].slice(0, 20);
}

export function buildWeeklyReportComparison(current: ReportListItem, previous: ReportListItem | null): WeeklyReportComparison {
  const currentNames = extractWeeklyReportRepoNames(current.contentMarkdown);
  const previousNames = previous ? extractWeeklyReportRepoNames(previous.contentMarkdown) : [];
  const currentRepoCount = current.repoCount;

  if (!previous) {
    return {
      currentNames,
      previousNames,
      retained: [],
      added: [],
      dropped: [],
      currentRepoCount,
      previousRepoCount: null,
      repoCountDelta: null
    };
  }

  const previousRepoCount = previous.repoCount;
  const previousSet = new Set(previousNames);
  const currentSet = new Set(currentNames);

  return {
    currentNames,
    previousNames,
    retained: currentNames.filter((name) => previousSet.has(name)),
    added: currentNames.filter((name) => !previousSet.has(name)),
    dropped: previousNames.filter((name) => !currentSet.has(name)),
    currentRepoCount,
    previousRepoCount,
    repoCountDelta: currentRepoCount - previousRepoCount
  };
}
