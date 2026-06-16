import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    marketResearchEnabled: true,
    enableAutoOpportunityResearch: true,
    autoOpportunityResearchTopRepos: 8
  },
  prisma: {
    scanRun: {
      findUniqueOrThrow: vi.fn()
    },
    repository: {
      findMany: vi.fn()
    }
  },
  generateOpportunityCandidateForRepository: vi.fn(),
  dispatchOpportunityCandidateNotification: vi.fn()
}));

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/openai/repository-analysis", () => ({
  generateOpportunityCandidateForRepository: mocks.generateOpportunityCandidateForRepository
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchOpportunityCandidateNotification: mocks.dispatchOpportunityCandidateNotification
}));

import { runAutoOpportunityResearch } from "../../src/lib/market-research/auto-opportunities";

describe("runAutoOpportunityResearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.marketResearchEnabled = true;
    mocks.config.enableAutoOpportunityResearch = true;
    mocks.config.autoOpportunityResearchTopRepos = 8;
    mocks.prisma.scanRun.findUniqueOrThrow.mockResolvedValue({ id: "scan_1", startedAt: new Date("2026-06-16T08:00:00Z") });
    mocks.prisma.repository.findMany.mockResolvedValue([
      { id: "repo_1", fullName: "owner/one" },
      { id: "repo_2", fullName: "owner/two" }
    ]);
    mocks.generateOpportunityCandidateForRepository.mockResolvedValueOnce({ created: true, ideaId: "idea_1" });
    mocks.generateOpportunityCandidateForRepository.mockResolvedValueOnce({ created: false, reason: "below threshold" });
    mocks.dispatchOpportunityCandidateNotification.mockResolvedValue([]);
  });

  it("does nothing unless automatic opportunity research is enabled", async () => {
    mocks.config.enableAutoOpportunityResearch = false;

    await expect(runAutoOpportunityResearch("scan_1")).resolves.toEqual([]);
    expect(mocks.prisma.repository.findMany).not.toHaveBeenCalled();
    expect(mocks.generateOpportunityCandidateForRepository).not.toHaveBeenCalled();
  });

  it("caps top repositories at 3 and ranks by trend, initial momentum, relevance and stars", async () => {
    const results = await runAutoOpportunityResearch("scan_1");

    expect(mocks.prisma.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { trendScore: "desc" },
          { initialMomentumScore: "desc" },
          { relevanceScore: "desc" },
          { starsCurrent: "desc" }
        ],
        take: 3,
        where: expect.objectContaining({
          isDeletedFromView: false,
          status: { not: "IGNORED" },
          ideas: {
            none: expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ status: expect.any(Object) }),
                expect.objectContaining({ lastResearchAt: expect.any(Object) })
              ])
            })
          }
        })
      })
    );
    expect(mocks.generateOpportunityCandidateForRepository).toHaveBeenCalledWith("repo_1");
    expect(mocks.generateOpportunityCandidateForRepository).toHaveBeenCalledWith("repo_2");
    expect(mocks.dispatchOpportunityCandidateNotification).toHaveBeenCalledWith("idea_1");
    expect(results).toHaveLength(2);
  });
});
