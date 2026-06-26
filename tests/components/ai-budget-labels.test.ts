import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CandidateCard } from "../../src/components/repo-radar/candidate-card";
import { CommandPalette } from "../../src/components/repo-radar/command-palette";
import { RepoCardActions } from "../../src/components/repo-radar/repo-card-actions";
import {
  formatOpenAiBudgetBadgeLabel,
  formatOpenAiBudgetCommandDescription
} from "../../src/lib/openai/token-budgets";
import type { IdeaListItem } from "../../src/types/repository";

const noop = () => undefined;

function idea(overrides: Partial<IdeaListItem> = {}): IdeaListItem {
  return {
    id: "idea_1",
    sourceRepoId: "repo_1",
    sourceRepoName: "owner/repo",
    title: "Automate dev workflow",
    problem: "Manual workflow",
    proposedSolution: "Build a local tool",
    targetUser: "Indie devs",
    mvpScope: "CLI plus dashboard",
    monetizationPotential: "Subscription",
    difficulty: 3,
    usefulnessScore: 4,
    riskScore: 2,
    confidenceScore: 4,
    opportunityScore: 82,
    opportunityBreakdown: {},
    applicationSummary: "A focused automation idea",
    businessRationale: "Clear repeated pain",
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

describe("AI budget labels", () => {
  it("renders visible budget badges beside costly repository actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(RepoCardActions, {
        repoUrl: "https://github.com/owner/repo",
        isPending: false,
        onSave: noop,
        onMarkRead: noop,
        onOpenQuickBrief: noop,
        onOpenReport: noop,
        onRegenerateReport: noop,
        onGenerateIdea: noop,
        onResearch: noop,
        onAddCloneTask: noop,
        onAddDemoTask: noop,
        onValidateMarket: noop,
        onIgnore: noop
      })
    );

    expect(html).toContain("Brief</button>");
    expect(html).not.toContain(formatOpenAiBudgetBadgeLabel("summary"));
    expect(html).toContain(formatOpenAiBudgetBadgeLabel("repo-report"));
    expect(html).toContain(formatOpenAiBudgetBadgeLabel("idea"));
    expect(html).toContain(formatOpenAiBudgetBadgeLabel("opportunity-research"));
    expect(html).toContain(`aria-label="Raport. ${formatOpenAiBudgetBadgeLabel("repo-report")}"`);
    expect(html).toContain(`aria-label="Pomysl. ${formatOpenAiBudgetBadgeLabel("idea")}"`);
    expect(html).toContain(`aria-label="Research. ${formatOpenAiBudgetBadgeLabel("opportunity-research")}"`);
  });

  it("renders the promotion budget beside candidate promotion actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(CandidateCard, {
        idea: idea(),
        isPending: false,
        onPromote: noop,
        onSave: noop,
        onDismiss: noop,
        onOpenDetail: noop
      })
    );

    expect(html).toContain(formatOpenAiBudgetBadgeLabel("idea-promote"));
    expect(html).toContain(`aria-label="Rozwin. ${formatOpenAiBudgetBadgeLabel("idea-promote")}"`);
  });

  it("includes budget info in costly command palette descriptions", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, {
        isOpen: true,
        repositories: [],
        isPending: false,
        onClose: noop,
        onRunScan: noop,
        onOpenTab: noop,
        onOpenSettingsSection: noop,
        onOpenDailyBriefing: noop,
        onCreateWeeklyReport: noop,
        onCreatePortfolioBrief: noop,
        onDownloadIdeasCsv: noop,
        onSearchRepositories: noop
      })
    );

    expect(html).toContain("Uruchom scan");
    expect(html).toContain(formatOpenAiBudgetCommandDescription("summary"));
    expect(html).toContain("Utworz briefing dzienny");
    expect(html).toContain("Wygeneruj lokalny briefing bez OpenAI.");
    expect(html).toContain("Utworz raport tygodniowy");
    expect(html).toContain(formatOpenAiBudgetCommandDescription("weekly-report"));
    expect(html).toContain("Utworz RepoRadar Brief");
    expect(html).toContain("Wygeneruj lokalny markdown portfolio");
    expect(html).not.toContain(formatOpenAiBudgetCommandDescription("repo-report"));
  });

  it("renders quick settings commands in the command palette", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, {
        isOpen: true,
        repositories: [],
        isPending: false,
        onClose: noop,
        onRunScan: noop,
        onOpenTab: noop,
        onOpenSettingsSection: noop,
        onOpenDailyBriefing: noop,
        onCreateWeeklyReport: noop,
        onCreatePortfolioBrief: noop,
        onDownloadIdeasCsv: noop,
        onSearchRepositories: noop
      })
    );

    expect(html).toContain("Ustawienia operacyjne");
    expect(html).toContain("Otworz AI i koszty / Centrum zadan AI");
    expect(html).toContain("Otworz Scheduler Windows");
    expect(html).toContain("Otworz Maintenance");
    expect(html).toContain("Otworz Observability");
  });
});
