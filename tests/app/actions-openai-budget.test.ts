import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countOpenAiAnalysesToday: vi.fn(),
  getConfig: vi.fn(),
  getEvidenceSourcesForReport: vi.fn(),
  generateFullReportForRepository: vi.fn(),
  generateIdeaForRepository: vi.fn(),
  generateOpportunityCandidateForRepository: vi.fn(),
  generateShortSummaryForRepository: vi.fn(),
  promoteCandidateToFullIdea: vi.fn(),
  clearExpiredExternalCache: vi.fn(),
  clearOldNotificationLogs: vi.fn(),
  pruneOldSnapshots: vi.fn(),
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
  generateShortSummaryForRepository: mocks.generateShortSummaryForRepository,
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

vi.mock("@/lib/db/repository-decision-context", () => ({
  getRepositoryDecisionContext: vi.fn()
}));

vi.mock("@/lib/github/scanner", () => ({
  runDailyScan: vi.fn()
}));

vi.mock("@/lib/exports/ideas-csv", () => ({
  exportIdeasCsv: vi.fn()
}));

vi.mock("@/lib/maintenance", () => ({
  clearExpiredExternalCache: mocks.clearExpiredExternalCache,
  clearOldNotificationLogs: mocks.clearOldNotificationLogs,
  pruneOldSnapshots: mocks.pruneOldSnapshots
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
  clearExpiredExternalCacheAction,
  clearOldNotificationLogsAction,
  generateIdeaAction,
  generateOpportunityCandidateAction,
  generateReportAction,
  generateShortSummaryAction,
  pruneOldSnapshotsAction,
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
  mocks.generateShortSummaryForRepository.mockResolvedValue("Krotkie streszczenie");
  mocks.promoteCandidateToFullIdea.mockResolvedValue({
    id: "idea_1",
    title: "Pelny pomysl"
  });
  mocks.clearExpiredExternalCache.mockResolvedValue({ deletedCount: 3 });
  mocks.clearOldNotificationLogs.mockResolvedValue({ deletedCount: 4, cutoff: "2026-05-12T00:00:00.000Z" });
  mocks.pruneOldSnapshots.mockResolvedValue({ deletedCount: 5, cutoff: "2025-06-25T00:00:00.000Z" });
  mocks.runAiJob.mockImplementation(
    async (_input: unknown, handler: () => Promise<unknown>) => handler()
  );
});

describe("maintenance action confirmations", () => {
  it("requires explicit confirmation before clearing expired external research cache", async () => {
    await expect(clearExpiredExternalCacheAction()).rejects.toThrow("External research cache cleanup requires explicit confirmation");

    expect(mocks.clearExpiredExternalCache).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects truthy non-boolean confirmation payloads", async () => {
    await expect(clearExpiredExternalCacheAction({ confirmed: "true" } as unknown as { confirmed?: boolean })).rejects.toThrow(
      "External research cache cleanup requires explicit confirmation"
    );
    await expect(
      clearOldNotificationLogsAction({ daysToKeep: 45, confirmed: 1 } as unknown as { daysToKeep?: number; confirmed?: boolean })
    ).rejects.toThrow("Notification log cleanup requires explicit confirmation");
    await expect(
      pruneOldSnapshotsAction({ daysToKeep: 365, confirmed: "false" } as unknown as { daysToKeep?: number; confirmed?: boolean })
    ).rejects.toThrow("Snapshot pruning requires explicit confirmation");

    expect(mocks.clearExpiredExternalCache).not.toHaveBeenCalled();
    expect(mocks.clearOldNotificationLogs).not.toHaveBeenCalled();
    expect(mocks.pruneOldSnapshots).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("clears expired external research cache when confirmed", async () => {
    await expect(clearExpiredExternalCacheAction({ confirmed: true })).resolves.toEqual({ deletedCount: 3 });

    expect(mocks.clearExpiredExternalCache).toHaveBeenCalledWith({ confirmed: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("requires explicit confirmation before clearing old notification logs", async () => {
    await expect(clearOldNotificationLogsAction({ daysToKeep: 45 })).rejects.toThrow(
      "Notification log cleanup requires explicit confirmation"
    );

    expect(mocks.clearOldNotificationLogs).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("passes the confirmed retention window to notification log cleanup", async () => {
    await expect(clearOldNotificationLogsAction({ daysToKeep: 45, confirmed: true })).resolves.toEqual({
      deletedCount: 4,
      cutoff: "2026-05-12T00:00:00.000Z"
    });

    expect(mocks.clearOldNotificationLogs).toHaveBeenCalledWith({ daysToKeep: 45, confirmed: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("requires explicit confirmation before pruning old snapshots", async () => {
    await expect(pruneOldSnapshotsAction({ daysToKeep: 365 })).rejects.toThrow("Snapshot pruning requires explicit confirmation");

    expect(mocks.pruneOldSnapshots).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("passes the confirmed snapshot retention window to snapshot pruning", async () => {
    await expect(pruneOldSnapshotsAction({ daysToKeep: 365, confirmed: true })).resolves.toEqual({
      deletedCount: 5,
      cutoff: "2025-06-25T00:00:00.000Z"
    });

    expect(mocks.pruneOldSnapshots).toHaveBeenCalledWith({ daysToKeep: 365, confirmed: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });
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

  it("keeps force retries on the same per-repo dedupe keys", async () => {
    await generateReportAction("repo_1", true);
    await generateIdeaAction("repo_1", true);
    await generateOpportunityCandidateAction("repo_1", true);
    await generateShortSummaryAction("repo_1", true);

    expect(mocks.runAiJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "REPORT", repoId: "repo_1", dedupeKey: "report:repo_1" }),
      expect.any(Function),
      expect.any(Function)
    );
    expect(mocks.runAiJob).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "IDEA", repoId: "repo_1", dedupeKey: "idea:repo_1" }),
      expect.any(Function),
      expect.any(Function)
    );
    expect(mocks.runAiJob).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: "RESEARCH", repoId: "repo_1", dedupeKey: "research:repo_1" }),
      expect.any(Function),
      expect.any(Function)
    );
    expect(mocks.runAiJob).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ type: "SUMMARY", repoId: "repo_1", dedupeKey: "summary:repo_1" }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("runs the summary AI job through budget preflight", async () => {
    await expect(generateShortSummaryAction("repo_1")).resolves.toEqual({
      repoId: "repo_1",
      summary: "Krotkie streszczenie"
    });

    expect(mocks.countOpenAiAnalysesToday).toHaveBeenCalledTimes(1);
    expect(mocks.runAiJob).toHaveBeenCalledTimes(1);
    expect(mocks.generateShortSummaryForRepository).toHaveBeenCalledWith("repo_1", false);
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

  it("does not create an AI job for summary when the limit is used up", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(2);

    await expect(generateShortSummaryAction("repo_1")).rejects.toThrow("Dzienny limit OpenAI jest juz wykorzystany");

    expect(mocks.runAiJob).not.toHaveBeenCalled();
    expect(mocks.generateShortSummaryForRepository).not.toHaveBeenCalled();
  });

  it("does not promote a candidate when the OpenAI limit is used up", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(2);

    await expect(promoteCandidateToFullIdeaAction("idea_1")).rejects.toThrow(
      "Dzienny limit OpenAI jest juz wykorzystany"
    );

    expect(mocks.promoteCandidateToFullIdea).not.toHaveBeenCalled();
  });
});
