import { describe, expect, it } from "vitest";
import {
  OPENAI_PROMPT_CACHE_VERSION,
  buildLegacyOpenAiCacheInputHash,
  buildOpenAiCacheInputHash,
  buildRepositoryCacheFingerprint
} from "../../src/lib/openai/cache-keys";

const repository = {
  fullName: "owner/repo",
  url: "https://github.com/owner/repo",
  description: "AI repo",
  primaryLanguage: "TypeScript",
  topicsJson: JSON.stringify(["ai", "agents"]),
  starsCurrent: 100,
  forksCurrent: 10,
  openIssues: 2,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  pushedAt: new Date("2026-06-01T00:00:00Z"),
  trendScore: 80,
  relevanceScore: 90,
  readmeHash: "readme-a",
  readmeExcerpt: "README"
};

describe("OpenAI cache keys", () => {
  it("changes repository fingerprint when README hash changes", () => {
    const first = buildRepositoryCacheFingerprint(repository);
    const second = buildRepositoryCacheFingerprint({ ...repository, readmeHash: "readme-b" });

    expect(first).not.toBe(second);
  });

  it("separates current prompt-versioned hash from legacy context hash", () => {
    const context = "repo context";
    const fingerprint = buildRepositoryCacheFingerprint(repository);
    const current = buildOpenAiCacheInputHash({ kind: "summary", context, repositoryFingerprint: fingerprint });
    const legacy = buildLegacyOpenAiCacheInputHash("summary", context);

    expect(OPENAI_PROMPT_CACHE_VERSION).toContain("repo-radar");
    expect(current).not.toBe(legacy);
  });
});
