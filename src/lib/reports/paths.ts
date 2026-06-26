function cleanReportPathSegment(value: string) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F\u007F]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "unknown";
}

export function repoReportPath(owner: string, repo: string) {
  return `repos/${cleanReportPathSegment(owner)}__${cleanReportPathSegment(repo)}.md`;
}

export function repoQuickBriefPath(owner: string, repo: string) {
  return `repos/${cleanReportPathSegment(owner)}__${cleanReportPathSegment(repo)}__quick-brief.md`;
}
