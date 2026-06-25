import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countOpenAiAnalysesToday: vi.fn(),
  getConfig: vi.fn()
}));

vi.mock("@/lib/db/openai-cache", () => ({
  countOpenAiAnalysesToday: mocks.countOpenAiAnalysesToday
}));

vi.mock("@/lib/config", () => ({
  getConfig: mocks.getConfig
}));

import {
  assertOpenAiBudgetForAction,
  getOpenAiBudgetStatus,
  getRequiredOpenAiCallsForAction
} from "../../src/lib/openai/budget-status";

const baseConfig = {
  openAiDailyAnalysisLimit: 5,
  marketResearchEnabled: true,
  marketResearchProvider: "openai" as const,
  openAiApiKey: "test-key"
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getConfig.mockReturnValue(baseConfig);
});

describe("OpenAI budget status", () => {
  it("allows an action when the required calls fit today's limit", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(3);

    await expect(getOpenAiBudgetStatus("repo-report")).resolves.toMatchObject({
      action: "repo-report",
      label: "Full report",
      requiredCalls: 2,
      dailyLimit: 5,
      usedToday: 3,
      allowed: true,
      warning: null
    });
  });

  it("blocks an action when the daily OpenAI limit is already used up", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(5);

    await expect(assertOpenAiBudgetForAction("idea")).rejects.toThrow("Dzienny limit OpenAI jest juz wykorzystany");
  });

  it("blocks an action when remaining budget is insufficient", async () => {
    mocks.countOpenAiAnalysesToday.mockResolvedValue(4);

    await expect(assertOpenAiBudgetForAction("repo-report")).rejects.toThrow("Za malo dziennego limitu OpenAI");
  });

  it("uses reduced required calls when market research cannot use OpenAI", () => {
    const config = {
      ...baseConfig,
      marketResearchEnabled: false
    };

    expect(getRequiredOpenAiCallsForAction("repo-report", config)).toBe(1);
    expect(getRequiredOpenAiCallsForAction("opportunity-research", config)).toBe(0);
  });

  it("does not reserve a research OpenAI call for hybrid HN/RSS-only research", () => {
    const config = {
      ...baseConfig,
      marketResearchProvider: "hybrid" as const,
      marketResearchMode: "light" as const,
      enableHnSource: true,
      enableRssSource: true,
      enableOpenAiWebSearchSource: false,
      openAiApiKey: undefined
    };

    expect(getRequiredOpenAiCallsForAction("repo-report", config)).toBe(1);
    expect(getRequiredOpenAiCallsForAction("idea", config)).toBe(1);
  });

  it("reserves the research OpenAI call for hybrid MCP fallback", () => {
    const config = {
      ...baseConfig,
      marketResearchProvider: "hybrid" as const,
      marketResearchMode: "full" as const,
      enableHnSource: false,
      enableRssSource: false,
      enableOpenAiWebSearchSource: false,
      enableRedditSource: false,
      enableBlueskySource: false,
      openAiApiKey: undefined,
      mcpWebResearchServerUrl: "http://127.0.0.1:8765"
    };

    expect(getRequiredOpenAiCallsForAction("repo-report", config)).toBe(2);
    expect(getRequiredOpenAiCallsForAction("idea-promote", config)).toBe(2);
  });
});
