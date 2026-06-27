import { prisma } from "@/lib/db/client";
import type { IdeaListItem } from "@/types/repository";
import { toIsoDate } from "@/lib/utils";

const CSV_FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = CSV_FORMULA_PREFIX_PATTERN.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function buildIdeasCsv(ideas: IdeaListItem[]) {
  const header = [
    "title",
    "sourceRepoName",
    "status",
    "opportunityScore",
    "confidenceScore",
    "difficulty",
    "usefulnessScore",
    "riskScore",
    "problem",
    "targetUser",
    "mvpScope",
    "monetizationPotential",
    "suggestedStack"
  ];
  const rows = ideas.map((idea) => [
    idea.title,
    idea.sourceRepoName,
    idea.status,
    idea.opportunityScore ?? "",
    idea.confidenceScore ?? "",
    idea.difficulty,
    idea.usefulnessScore,
    idea.riskScore,
    idea.problem,
    idea.targetUser,
    idea.mvpScope,
    idea.monetizationPotential,
    idea.suggestedStack
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export async function exportIdeasCsv(now = new Date()) {
  const ideas = await prisma.idea.findMany({
    orderBy: [{ opportunityScore: "desc" }, { createdAt: "desc" }],
    include: {
      repository: { select: { fullName: true } }
    }
  });
  const csv = buildIdeasCsv(
    ideas.map((idea) => ({
      id: idea.id,
      sourceRepoId: idea.sourceRepoId,
      sourceRepoName: idea.repository.fullName,
      title: idea.title,
      problem: idea.problem,
      proposedSolution: idea.proposedSolution,
      targetUser: idea.targetUser,
      mvpScope: idea.mvpScope,
      monetizationPotential: idea.monetizationPotential,
      difficulty: idea.difficulty,
      usefulnessScore: idea.usefulnessScore,
      riskScore: idea.riskScore,
      confidenceScore: idea.confidenceScore,
      opportunityScore: idea.opportunityScore,
      opportunityBreakdown: {},
      applicationSummary: idea.applicationSummary,
      businessRationale: idea.businessRationale,
      researchMode: idea.researchMode,
      marketSummary: idea.marketSummary,
      suggestedStack: idea.suggestedStack,
      firstSteps: [],
      evidenceIds: [],
      evidenceSources: [],
      status: idea.status,
      lastResearchAt: idea.lastResearchAt?.toISOString() ?? null,
      createdAt: idea.createdAt.toISOString()
    }))
  );

  return {
    filename: `reporadar-ideas-${toIsoDate(now)}.csv`,
    content: csv
  };
}
