import { describe, expect, it } from "vitest";
import { buildResearchQueries } from "../../src/lib/market-research/query";
import type { MarketResearchContext } from "../../src/lib/market-research/types";

const context: MarketResearchContext = {
  kind: "opportunity-candidate",
  mode: "light",
  repoId: "repo_1",
  fullName: "owner/WorkflowAI",
  url: "https://github.com/owner/WorkflowAI",
  description: "AI devtools automation for manual workflow pain and SaaS teams",
  primaryLanguage: "TypeScript",
  topics: ["ai", "devtools", "workflow", "automation"],
  starsCurrent: 1000,
  forksCurrent: 100,
  openIssues: 2,
  trendScore: 80,
  relevanceScore: 90,
  repositoryContext: "Repo context"
};

describe("buildResearchQueries", () => {
  it("builds short deduped opportunity research queries", () => {
    const queries = buildResearchQueries(context);

    expect(queries.length).toBeGreaterThanOrEqual(5);
    expect(queries.length).toBeLessThanOrEqual(8);
    expect(new Set(queries).size).toBe(queries.length);
    expect(queries.every((query) => query.length <= 180)).toBe(true);
    expect(queries.join(" ")).toContain("alternatives pricing");
    expect(queries.join(" ")).toContain("developer workflow pain");
    expect(queries.join(" ")).toContain("manual workflow");
    expect(queries.join(" ")).toContain("SaaS automation");
    expect(queries.join(" ")).toContain("time saving cost saving");
  });
});
