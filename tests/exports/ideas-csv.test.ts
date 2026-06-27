import { describe, expect, it } from "vitest";
import { buildIdeasCsv } from "../../src/lib/exports/ideas-csv";
import type { IdeaListItem } from "../../src/types/repository";

function idea(overrides: Partial<IdeaListItem> = {}): IdeaListItem {
  return {
    id: "idea_1",
    sourceRepoId: "repo_1",
    sourceRepoName: "owner/tool",
    title: 'Workflow "automation"',
    problem: "Manual, slow work",
    proposedSolution: "Automate",
    targetUser: "Developers",
    mvpScope: "Dashboard",
    monetizationPotential: "Subscription",
    difficulty: 2,
    usefulnessScore: 5,
    riskScore: 2,
    confidenceScore: 4,
    opportunityScore: 88,
    opportunityBreakdown: {},
    applicationSummary: null,
    businessRationale: null,
    researchMode: "light",
    marketSummary: null,
    suggestedStack: "Next.js",
    firstSteps: [],
    evidenceIds: [],
    evidenceSources: [],
    status: "CANDIDATE",
    lastResearchAt: null,
    createdAt: "2026-06-16T12:00:00.000Z",
    ...overrides
  };
}

describe("buildIdeasCsv", () => {
  it("exports stable CSV with escaped cells", () => {
    const csv = buildIdeasCsv([idea()]);

    expect(csv.split("\n")[0]).toContain('"title","sourceRepoName","status"');
    expect(csv).toContain('"Workflow ""automation"""');
    expect(csv).toContain('"Manual, slow work"');
  });

  it("prefixes spreadsheet formulas before exporting cells", () => {
    const csv = buildIdeasCsv([
      idea({
        title: "=IMPORTXML(\"https://example.com\")",
        problem: "+SUM(1,1)",
        targetUser: " @external",
        mvpScope: "-2+3"
      })
    ]);

    expect(csv).toContain('"\'=IMPORTXML(""https://example.com"")"');
    expect(csv).toContain(`"'+SUM(1,1)"`);
    expect(csv).toContain('"\' @external"');
    expect(csv).toContain('"\'-2+3"');
  });
});
