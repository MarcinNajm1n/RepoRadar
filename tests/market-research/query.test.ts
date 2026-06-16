import { describe, expect, it } from "vitest";
import { buildResearchQueries, buildResearchQuerySpecs } from "../../src/lib/market-research/query";
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
  it("builds short deduped light opportunity research queries", () => {
    const specs = buildResearchQuerySpecs(context, "light");
    const queries = buildResearchQueries(context);

    expect(specs).toHaveLength(4);
    expect(queries).toHaveLength(4);
    expect(specs.map((spec) => spec.intent)).toEqual(["base", "pain", "alternatives", "manual_workflow"]);
    expect(new Set(queries).size).toBe(queries.length);
    expect(queries.every((query) => query.length <= 180)).toBe(true);
    expect(queries.join(" ")).toContain("alternatives pricing");
    expect(queries.join(" ")).toContain("manual workflow");
  });

  it("builds full research query specs with evidence intents", () => {
    const specs = buildResearchQuerySpecs({ ...context, mode: "full" }, "full");

    expect(specs).toHaveLength(8);
    expect(specs.map((spec) => spec.intent)).toEqual([
      "base",
      "pain",
      "alternatives",
      "manual_workflow",
      "automation",
      "pricing",
      "competitors",
      "risks"
    ]);
    expect(specs.every((spec) => spec.query.length <= 180)).toBe(true);
  });
});
