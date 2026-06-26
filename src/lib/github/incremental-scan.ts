import type { DiscoveredGitHubRepository } from "./types";
import { sanitizeGitHubCount, sanitizeOptionalGitHubDate } from "./sanitize";
import { sanitizeExternalText } from "@/lib/utils";

export type ExistingGitHubRepositoryState = {
  githubId: number;
  fullName: string;
  pushedAt: Date | null;
  starsCurrent: number;
};

function itemPushedAtMs(discovered: DiscoveredGitHubRepository) {
  return sanitizeOptionalGitHubDate(discovered.item.pushed_at)?.getTime() ?? null;
}

function itemStars(discovered: DiscoveredGitHubRepository) {
  return sanitizeGitHubCount(discovered.item.stargazers_count);
}

function itemFullNameKey(discovered: DiscoveredGitHubRepository) {
  return sanitizeExternalText(discovered.item.full_name, 300)?.toLowerCase() ?? "";
}

function isChanged(discovered: DiscoveredGitHubRepository, existing: ExistingGitHubRepositoryState) {
  const pushedAtMs = itemPushedAtMs(discovered);
  const existingPushedAtMs = existing.pushedAt?.getTime() ?? null;

  return itemStars(discovered) !== existing.starsCurrent || pushedAtMs !== existingPushedAtMs;
}

function priority(discovered: DiscoveredGitHubRepository, existing: ExistingGitHubRepositoryState | undefined) {
  if (!existing) {
    return 0;
  }

  return isChanged(discovered, existing) ? 1 : 2;
}

export function prioritizeIncrementalScanItems(
  discovered: DiscoveredGitHubRepository[],
  existingRepositories: ExistingGitHubRepositoryState[]
) {
  const byGitHubId = new Map(existingRepositories.map((repo) => [repo.githubId, repo]));
  const byFullName = new Map(existingRepositories.map((repo) => [repo.fullName.toLowerCase(), repo]));

  return discovered
    .map((item, index) => {
      const existing = byGitHubId.get(item.item.id) ?? byFullName.get(itemFullNameKey(item));
      return { item, index, priority: priority(item, existing) };
    })
    .sort((a, b) => a.priority - b.priority || itemStars(b.item) - itemStars(a.item) || a.index - b.index)
    .map(({ item }) => item);
}
