"use server";

import { revalidatePath } from "next/cache";
import {
  completeActionItem,
  createActionItem,
  dismissActionItem,
  snoozeActionItem,
  updateActionItem
} from "@/lib/db/action-items";
import { runAiJob } from "@/lib/db/ai-jobs";
import {
  getEvidenceSourcesForReport,
  getIdeasPanelData,
  getRepositoryPage,
  getSettingsPanelData,
  getTasksPanelData,
  getWeeklyReportsPanelData,
  updateIdeaStatus,
  updateRepositoryStatus
} from "@/lib/db/repositories";
import { getRepositoryDecisionContext } from "@/lib/db/repository-decision-context";
import { getRepositoryTimeline } from "@/lib/db/repository-timeline";
import type { CreateActionItemInput, UpdateActionItemInput } from "@/types/action-item";
import type { RepositoryPageInput } from "@/types/repository";
import { runDailyScan } from "@/lib/github/scanner";
import { exportIdeasCsv } from "@/lib/exports/ideas-csv";
import { clearExpiredExternalCache, clearOldNotificationLogs, pruneOldSnapshots } from "@/lib/maintenance";
import { dispatchTestNotification } from "@/lib/notifications/dispatcher";
import {
  generateFullReportForRepository,
  generateIdeaForRepository,
  generateOpportunityCandidateForRepository,
  generateShortSummaryForRepository,
  promoteCandidateToFullIdea
} from "@/lib/openai/repository-analysis";
import { assertOpenAiBudgetForAction } from "@/lib/openai/budget-status";
import { createDailyBriefing } from "@/lib/reports/briefing";
import { createPortfolioBrief } from "@/lib/reports/portfolio-brief";
import { createRepoQuickBrief } from "@/lib/reports/repo-quick-brief";
import { createWeeklyReport } from "@/lib/reports/weekly";
import { setSetting } from "@/lib/db/settings";

export async function runScanAction() {
  const result = await runDailyScan();
  revalidatePath("/");
  return {
    id: result.id,
    status: result.status,
    reposFound: result.reposFound,
    reposUpdated: result.reposUpdated,
    errorMessage: result.errorMessage
  };
}

export async function updateStatusAction(repoId: string, status: string) {
  await updateRepositoryStatus(repoId, status);
  revalidatePath("/");
  return { ok: true };
}

export async function getRepositoryPageAction(input: RepositoryPageInput) {
  return getRepositoryPage(input);
}

export async function getRepositoryTimelineAction(repoId: string) {
  return getRepositoryTimeline(repoId);
}

export async function getRepositoryDecisionContextAction(repoId: string) {
  return getRepositoryDecisionContext(repoId);
}

export async function getSettingsPanelDataAction() {
  return getSettingsPanelData();
}

export async function getIdeasPanelDataAction() {
  return getIdeasPanelData();
}

export async function getTasksPanelDataAction() {
  return getTasksPanelData();
}

export async function getWeeklyReportsPanelDataAction() {
  return getWeeklyReportsPanelData();
}

export async function generateReportAction(repoId: string, force = false) {
  await assertOpenAiBudgetForAction("repo-report");
  const report = await runAiJob(
    { type: "REPORT", repoId, priority: force ? 80 : 60, dedupeKey: `report:${repoId}` },
    () => generateFullReportForRepository(repoId, force),
    (value) => ({ reportId: value.id })
  );
  const evidenceSources = await getEvidenceSourcesForReport(report.id);
  revalidatePath("/");
  return {
    id: report.id,
    title: report.title,
    contentMarkdown: report.contentMarkdown,
    markdownPath: report.markdownPath,
    createdAt: report.createdAt.toISOString(),
    evidenceSources
  };
}

export async function generateQuickBriefAction(repoId: string) {
  const report = await createRepoQuickBrief(repoId);
  revalidatePath("/");
  return {
    id: report.id,
    title: report.title,
    contentMarkdown: report.contentMarkdown,
    markdownPath: report.markdownPath,
    createdAt: report.createdAt.toISOString(),
    evidenceSources: []
  };
}

export async function generateShortSummaryAction(repoId: string, force = false) {
  await assertOpenAiBudgetForAction("summary");
  const summary = await runAiJob(
    { type: "SUMMARY", repoId, priority: force ? 70 : 40, dedupeKey: `summary:${repoId}` },
    () => generateShortSummaryForRepository(repoId, force),
    () => ({ repoId })
  );
  revalidatePath("/");
  return { repoId, summary };
}

export async function generateIdeaAction(repoId: string, force = false) {
  await assertOpenAiBudgetForAction("idea");
  const idea = await runAiJob(
    { type: "IDEA", repoId, priority: force ? 80 : 50, dedupeKey: `idea:${repoId}` },
    () => generateIdeaForRepository(repoId, force),
    (value) => ({ ideaId: value.id })
  );
  revalidatePath("/");
  return {
    id: idea.id,
    title: idea.title
  };
}

export async function generateOpportunityCandidateAction(repoId: string, force = false) {
  await assertOpenAiBudgetForAction("opportunity-research");
  const result = await runAiJob(
    { type: "RESEARCH", repoId, priority: force ? 70 : 40, dedupeKey: `research:${repoId}` },
    () => generateOpportunityCandidateForRepository(repoId, force),
    (value) => ({ created: value.created, ideaId: value.ideaId ?? null, opportunityScore: value.opportunityScore ?? null })
  );
  revalidatePath("/");
  return result;
}

export async function promoteCandidateToFullIdeaAction(ideaId: string, force = false) {
  await assertOpenAiBudgetForAction("idea-promote");
  const idea = await promoteCandidateToFullIdea(ideaId, force);
  revalidatePath("/");
  return {
    id: idea.id,
    title: idea.title
  };
}

export async function updateIdeaStatusAction(ideaId: string, status: string) {
  await updateIdeaStatus(ideaId, status);
  revalidatePath("/");
  return { ok: true };
}

export async function createWeeklyReportAction() {
  const report = await createWeeklyReport();
  revalidatePath("/");
  return {
    id: report.id,
    title: report.title,
    markdownPath: report.markdownPath
  };
}

export async function createPortfolioBriefAction() {
  const report = await createPortfolioBrief();
  revalidatePath("/");
  return {
    id: report.id,
    title: report.title,
    markdownPath: report.markdownPath,
    contentMarkdown: report.contentMarkdown
  };
}

export async function createActionItemAction(input: CreateActionItemInput) {
  const item = await createActionItem(input);
  revalidatePath("/");
  return item;
}

export async function updateActionItemAction(id: string, input: UpdateActionItemInput) {
  const item = await updateActionItem(id, input);
  revalidatePath("/");
  return item;
}

export async function completeActionItemAction(id: string) {
  const item = await completeActionItem(id);
  revalidatePath("/");
  return item;
}

export async function snoozeActionItemAction(id: string, snoozedUntil: string) {
  const item = await snoozeActionItem(id, snoozedUntil);
  revalidatePath("/");
  return item;
}

export async function dismissActionItemAction(id: string) {
  const item = await dismissActionItem(id);
  revalidatePath("/");
  return item;
}

export async function generateDailyBriefingAction() {
  const report = await createDailyBriefing();
  revalidatePath("/");
  return {
    id: report.id,
    title: report.title,
    markdownPath: report.markdownPath,
    contentMarkdown: report.contentMarkdown
  };
}

export async function clearExpiredExternalCacheAction(options: { confirmed?: boolean } = {}) {
  if (!options.confirmed) {
    throw new Error("External research cache cleanup requires explicit confirmation.");
  }

  const result = await clearExpiredExternalCache();
  revalidatePath("/");
  return result;
}

export async function clearOldNotificationLogsAction(options: { daysToKeep?: number; confirmed?: boolean } = {}) {
  if (!options.confirmed) {
    throw new Error("Notification log cleanup requires explicit confirmation.");
  }

  const daysToKeep = options.daysToKeep ?? 30;
  const result = await clearOldNotificationLogs(daysToKeep);
  revalidatePath("/");
  return result;
}

export async function pruneOldSnapshotsAction(options: { daysToKeep?: number; confirmed?: boolean }) {
  const result = await pruneOldSnapshots(options);
  revalidatePath("/");
  return result;
}

export async function exportIdeasCsvAction() {
  return exportIdeasCsv();
}

export async function testNotificationAction() {
  const results = await dispatchTestNotification();
  revalidatePath("/");
  return results;
}

export async function updateSettingAction(key: string, value: string) {
  await setSetting(key, value);
  revalidatePath("/");
  return { ok: true };
}
