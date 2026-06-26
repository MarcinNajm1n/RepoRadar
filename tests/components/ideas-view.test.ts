import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { IdeaListItem } from "../../src/types/repository";
import { filterIdeas, IdeasView } from "../../src/components/repo-radar/ideas-view";

const now = "2026-06-16T12:00:00.000Z";
const noop = () => undefined;

function idea(overrides: Partial<IdeaListItem> = {}): IdeaListItem {
  return {
    id: "idea_1",
    sourceRepoId: "repo_1",
    sourceRepoName: "owner/tool",
    title: "Workflow automation",
    problem: "Manual developer workflow",
    proposedSolution: "Automate the repeated steps",
    targetUser: "Developers",
    mvpScope: "Small dashboard",
    monetizationPotential: "B2B subscription",
    difficulty: 2,
    usefulnessScore: 4,
    riskScore: 2,
    confidenceScore: 4,
    opportunityScore: 80,
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
    createdAt: now,
    ...overrides
  };
}

describe("IdeasView filters", () => {
  const ideas = [
    idea({ id: "low", title: "Low signal CRM", opportunityScore: 45, confidenceScore: 2, sourceRepoName: "owner/crm" }),
    idea({
      id: "devops",
      title: "DevOps workflow radar",
      problem: "Developers lose time checking release signals",
      opportunityScore: 92,
      confidenceScore: 5,
      sourceRepoName: "owner/devops-radar"
    }),
    idea({ id: "unknown", title: "Unscored local tool", opportunityScore: null, confidenceScore: null, sourceRepoName: "owner/local-tool" })
  ];

  it("filters ideas by text, opportunity and confidence", () => {
    expect(
      filterIdeas(ideas, {
        query: "devops",
        minOpportunity: 80,
        minConfidence: 4
      }).map((item) => item.id)
    ).toEqual(["devops"]);

    expect(
      filterIdeas(ideas, {
        query: "owner",
        minOpportunity: 40,
        minConfidence: 2
      }).map((item) => item.id)
    ).toEqual(["low", "devops"]);

    expect(
      filterIdeas(ideas, {
        query: "local",
        minOpportunity: 1,
        minConfidence: 0
      }).map((item) => item.id)
    ).toEqual([]);
  });

  it("renders compact idea filter controls with visible counts", () => {
    const html = renderToStaticMarkup(
      React.createElement(IdeasView, {
        mode: "candidates",
        ideas,
        isPending: false,
        emptyTitle: "Brak kandydatow",
        emptyText: "Brak danych.",
        onPromote: noop,
        onSave: noop,
        onDismiss: noop,
        onRestore: noop,
        onOpenDetail: noop
      })
    );

    expect(html).toContain("Filtry pomyslow");
    expect(html).toContain("Szukaj tytulu, repo, problemu...");
    expect(html).toContain("Opportunity");
    expect(html).toContain("Confidence");
    expect(html).toContain("Brak aktywnych filtrow");
    expect(html).toContain("Do oceny");
  });
});
