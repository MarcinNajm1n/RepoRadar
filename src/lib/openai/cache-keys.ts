import { stableHash } from "@/lib/hash";

export const OPENAI_PROMPT_CACHE_VERSION = "repo-radar-openai-v2";

export type RepositoryCacheFingerprintInput = {
  fullName: string;
  url: string;
  description?: string | null;
  primaryLanguage?: string | null;
  topicsJson: string;
  starsCurrent: number;
  forksCurrent: number;
  openIssues: number;
  createdAt: Date;
  pushedAt?: Date | null;
  trendScore: number;
  relevanceScore: number;
  readmeHash?: string | null;
  readmeExcerpt?: string | null;
};

export function buildRepositoryCacheFingerprint(repository: RepositoryCacheFingerprintInput) {
  return stableHash(
    JSON.stringify({
      fullName: repository.fullName,
      url: repository.url,
      description: repository.description ?? null,
      primaryLanguage: repository.primaryLanguage ?? null,
      topicsJson: repository.topicsJson,
      starsCurrent: repository.starsCurrent,
      forksCurrent: repository.forksCurrent,
      openIssues: repository.openIssues,
      createdAt: repository.createdAt.toISOString(),
      pushedAt: repository.pushedAt?.toISOString() ?? null,
      trendScore: repository.trendScore,
      relevanceScore: repository.relevanceScore,
      readmeHash: repository.readmeHash ?? stableHash(repository.readmeExcerpt ?? "")
    })
  );
}

export function buildOpenAiCacheInputHash(input: {
  kind: string;
  context: string;
  repositoryFingerprint: string;
  promptVersion?: string;
}) {
  return stableHash(
    [
      input.promptVersion ?? OPENAI_PROMPT_CACHE_VERSION,
      input.kind,
      input.repositoryFingerprint,
      stableHash(input.context)
    ].join("\n")
  );
}

export function buildLegacyOpenAiCacheInputHash(kind: string, context: string) {
  return stableHash(`${kind}\n${context}`);
}
