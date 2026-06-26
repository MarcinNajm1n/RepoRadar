import type { DiscoveredGitHubRepository, GitHubRepositoryItem, GitHubSearchQuerySpec } from "./types";
import { sanitizeExternalText } from "@/lib/utils";

function itemFullNameKey(item: GitHubRepositoryItem) {
  return sanitizeExternalText(item.full_name, 300)?.toLowerCase() ?? "";
}

export function dedupeGitHubRepositories(items: GitHubRepositoryItem[]) {
  const byId = new Map<number, GitHubRepositoryItem>();
  const seenNames = new Set<string>();

  for (const item of items) {
    const normalizedName = itemFullNameKey(item);
    if (byId.has(item.id) || (normalizedName && seenNames.has(normalizedName))) {
      continue;
    }

    byId.set(item.id, item);
    if (normalizedName) {
      seenNames.add(normalizedName);
    }
  }

  return [...byId.values()];
}

export function mergeDiscoveredGitHubRepository(
  discovered: DiscoveredGitHubRepository[],
  item: GitHubRepositoryItem,
  spec: GitHubSearchQuerySpec
) {
  const idKey = `id:${item.id}`;
  const normalizedName = itemFullNameKey(item);
  const nameKey = normalizedName ? `name:${normalizedName}` : null;
  const existing = discovered.find(
    (entry) => `id:${entry.item.id}` === idKey || (nameKey !== null && `name:${itemFullNameKey(entry.item)}` === nameKey)
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
