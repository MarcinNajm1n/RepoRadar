import type { DiscoveredGitHubRepository } from "./types";

export type ExistingGitHubRepositoryState = {
  githubId: number;
  fullName: string;
  pushedAt: Date | null;
  starsCurrent: number;
};

function itemPushedAtMs(discovered: DiscoveredGitHubRepository) {
  return discovered.item.pushed_at ? new Date(discovered.item.pushed_at).getTime() : null;
}

function isChanged(discovered: DiscoveredGitHubRepository, existing: ExistingGitHubRepositoryState) {
  const pushedAtMs = itemPushedAtMs(discovered);
  const existingPushedAtMs = existing.pushedAt?.getTime() ?? null;

  return discovered.item.stargazers_count !== existing.starsCurrent || pushedAtMs !== existingPushedAtMs;
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
      const existing = byGitHubId.get(item.item.id) ?? byFullName.get(item.item.full_name.toLowerCase());
      return { item, index, priority: priority(item, existing) };
    })
    .sort((a, b) => a.priority - b.priority || b.item.item.stargazers_count - a.item.item.stargazers_count || a.index - b.index)
    .map(({ item }) => item);
}
