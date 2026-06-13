import { describe, expect, it } from "vitest";
import { buildRepositoryContext } from "../../src/lib/openai/prompts";

describe("buildRepositoryContext", () => {
  it("limits README context length before sending to OpenAI", () => {
    const context = buildRepositoryContext({
      fullName: "owner/repo",
      url: "https://github.com/owner/repo",
      description: "AI agent repo",
      primaryLanguage: "TypeScript",
      topics: ["ai", "agent"],
      starsCurrent: 1000,
      forksCurrent: 100,
      openIssues: 5,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      pushedAt: new Date("2026-06-01T00:00:00Z"),
      trendScore: 80,
      relevanceScore: 90,
      readmeExcerpt: "x".repeat(25000)
    });

    expect(context.length).toBeLessThanOrEqual(18000);
    expect(context).toContain("README excerpt");
  });
});
