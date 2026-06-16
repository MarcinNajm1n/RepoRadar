import type { DiscoveredGitHubRepository, GitHubRepositoryItem, GitHubSearchQuerySpec } from "./types";

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

export function mergeDiscoveredGitHubRepository(
  discovered: DiscoveredGitHubRepository[],
  item: GitHubRepositoryItem,
  spec: GitHubSearchQuerySpec
) {
  const idKey = `id:${item.id}`;
  const nameKey = `name:${item.full_name.toLowerCase()}`;
  const existing = discovered.find(
    (entry) => `id:${entry.item.id}` === idKey || `name:${entry.item.full_name.toLowerCase()}` === nameKey
  );

  if (!existing) {
    discovered.push({
      item,
      matchedProfiles: [spec.profile],
      minStarsMatched: spec.minStars
    });
    return;
  }

  if (!existing.matchedProfiles.includes(spec.profile)) {
    existing.matchedProfiles.push(spec.profile);
  }
  existing.minStarsMatched = Math.min(existing.minStarsMatched, spec.minStars);
}
