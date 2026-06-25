import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countOpenAiAnalysesToday: vi.fn(),
  getConfig: vi.fn(),
  getEvidenceSourcesForReport: vi.fn(),
  generateFullReportForRepository: vi.fn(),
  generateIdeaForRepository: vi.fn(),
  generateOpportunityCandidateForRepository: vi.fn(),
  promoteCandidateToFullIdea: vi.fn(),
  revalidatePath: vi.fn(),
  runAiJob: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("@/lib/config", () => ({
  getConfig: mocks.getConfig
}));

vi.mock("@/lib/db/openai-cache", () => ({
  countOpenAiAnalysesToday: mocks.countOpenAiAnalysesToday
}));

vi.mock("@/lib/db/ai-jobs", () => ({
  runAiJob: mocks.runAiJob
}));

vi.mock("@/lib/openai/repository-analysis", () => ({
  generateFullReportForRepository: mocks.generateFullReportForRepository,
  generateIdeaForRepository: mocks.generateIdeaForRepository,
  generateOpportunityCandidateForRepository: mocks.generateOpportunityCandidateForRepository,
  promoteCandidateToFullIdea: mocks.promoteCandidateToFullIdea
}));

vi.mock("@/lib/db/repositories", () => ({
  getEvidenceSourcesForReport: mocks.getEvidenceSourcesForReport,
  getIdeasPanelData: vi.fn(),
  getRepositoryPage: vi.fn(),
  getSettingsPanelData: vi.fn(),
  getTasksPanelData: vi.fn(),
  getWeeklyReportsPanelData: vi.fn(),
  updateIdeaStatus: vi.fn(),
  updateRepositoryStatus: vi.fn()
}));

vi.mock("@/lib/db/action-items", () => ({
  completeActionItem: vi.fn(),
  createActionItem: vi.fn(),
  dismissActionItem: vi.fn(),
  snoozeActionItem: vi.fn(),
  updateActionItem: vi.fn()
}));

vi.mock("@/lib/db/repository-timeline", () => ({
  getRepositoryTimeline: vi.fn()
}));

vi.mock("@/lib/github/scanner", () => ({
  runDailyScan: vi.fn()
}));

vi.mock("@/lib/exports/ideas-csv", () => ({
  exportIdeasCsv: vi.fn()
}));

vi.mock("@/lib/maintenance", () => ({
  clearExpiredExternalCache: vi.fn(),
  clearOldNotificationLogs: vi.fn(),
  pruneOldSnapshots: vi.fn()
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchTestNotification: vi.fn()
}));

vi.mock("@/lib/reports/briefing", () => ({
  createDailyBriefing: vi.fn()
}));

vi.mock("@/lib/reports/portfolio-brief", () => ({
  createPortfolioBrief: vi.fn()
}));

vi.mock("@/lib/reports/repo-quick-brief", () => ({
  createRepoQuickBrief: vi.fn()
}));

vi.mock("@/lib/reports/weekly", () => ({
  createWeeklyReport: vi.fn()
}));

vi.mock("@/lib/db/settings", () => ({
  setSetting: vi.fn()
}));

import {
  generateIdeaAction,
  generateOpportunityCandidateAction,
  generateReportAction,
  promoteCandidateToFullIdeaAction
} from "../../src/app/actions";

const baseConfig = {
  openAiDailyAnalysisLimit: 2,
  marketResearchEnabled: true,
  marketResearchProvider: "openai" as const,
  openAiApiKey: "test-key"
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getConfig.mockReturnValue(baseConfig);
  mocks.countOpenAiAnalysesToday.mockResolvedValue(0);
  mocks.getEvidenceSourcesForReport.mockResolvedValue([]);
  mocks.generateFullReportForRepository.mockResolvedValue({
    id: "report_1",
    title: "Raport",
    contentMarkdown: "# Raport",
    markdownPath: "reports/report.md",
    createdAt: new Date("2026-06-25T10:00:00Z")
  });
  mocks.generateIdeaForRepository.mockResolvedValue({
    id: "idea_1",
    title: "Pomysl"
  });
  mocks.generateOpportunityCandidateForRepository.mockResolvedValue({
    created: true,
    ideaId: "idea_1",
    opportunityScore: 72
  });
  mocks.promoteCandidateToFullIdea.mockResolvedValue({
    id: "idea_1",
    title: "Pelny pomysl"
  });
  mocks.runAiJob.mockImplementation(
    async (_input: unknown, handler: () => Promise<unknown>) => handler()
  );
});

describe("AI action OpenAI budget preflight", () => {
  it("runs the AI job when the report budget is allowed", async () => {
    await expect(generateReportAction("repo_1")).resolves.toMatchObject({
      id: "report_1",
      title: "Raport"
    });

    expect(mocks.countOpenAiAnalysesToday).toHaveBeenCalledTimes(1);
    expect(mocks.runAiJob).toHaveBeenCalledTimes(1);
    expect(mocks.generateFullReportForRepository).toHaveBeenCalledWith("repo_1", false);
  });

  it("does not create an AI job when the daily OpenAI limit is used up", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(2);

    await expect(generateReportAction("repo_1")).rejects.toThrow("Dzienny limit OpenAI jest juz wykorzystany");

    expect(mocks.runAiJob).not.toHaveBeenCalled();
    expect(mocks.generateFullReportForRepository).not.toHaveBeenCalled();
  });

  it("does not create an AI job for idea generation when the limit is used up", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(2);

    await expect(generateIdeaAction("repo_1")).rejects.toThrow("Dzienny limit OpenAI jest juz wykorzystany");

    expect(mocks.runAiJob).not.toHaveBeenCalled();
    expect(mocks.generateIdeaForRepository).not.toHaveBeenCalled();
  });

  it("does not create an AI job for opportunity research when the limit is used up", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(2);

    await expect(generateOpportunityCandidateAction("repo_1")).rejects.toThrow(
      "Dzienny limit OpenAI jest juz wykorzystany"
    );

    expect(mocks.runAiJob).not.toHaveBeenCalled();
    expect(mocks.generateOpportunityCandidateForRepository).not.toHaveBeenCalled();
  });

  it("does not promote a candidate when the OpenAI limit is used up", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(2);

    await expect(promoteCandidateToFullIdeaAction("idea_1")).rejects.toThrow(
      "Dzienny limit OpenAI jest juz wykorzystany"
    );

    expect(mocks.promoteCandidateToFullIdea).not.toHaveBeenCalled();
  });
});
