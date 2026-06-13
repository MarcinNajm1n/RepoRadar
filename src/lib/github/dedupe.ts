import type { GitHubRepositoryItem } from "./types";

export function dedupeGitHubRepositories(items: GitHubRepositoryItem[]) {
  const byId = new Map<number, GitHubRepositoryItem>();
  const seenNames = new Set<string>();

  for (const item of items) {
    const normalizedName = item.full_name.toLowerCase();
    if (byId.has(item.id) || seenNames.has(normalizedName)) {
      continue;
    }

    byId.set(item.id, item);
    seenNames.add(normalizedName);
  }

  return [...byId.values()];
}
