export function repoReportPath(owner: string, repo: string) {
  return `repos/${owner}__${repo}.md`;
}

export function repoQuickBriefPath(owner: string, repo: string) {
  return `repos/${owner}__${repo}__quick-brief.md`;
}
