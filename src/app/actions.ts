"use server";

import { revalidatePath } from "next/cache";
import {
  completeActionItem,
  createActionItem,
  dismissActionItem,
  snoozeActionItem,
  updateActionItem
} from "@/lib/db/action-items";
import { getEvidenceSourcesForReport, getRepositoryPage, updateIdeaStatus, updateRepositoryStatus } from "@/lib/db/repositories";
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
  promoteCandidateToFullIdea
} from "@/lib/openai/repository-analysis";
import { createDailyBriefing } from "@/lib/reports/briefing";
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

export async function generateReportAction(repoId: string, force = false) {
  const report = await generateFullReportForRepository(repoId, force);
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

export async function generateIdeaAction(repoId: string, force = false) {
  const idea = await generateIdeaForRepository(repoId, force);
  revalidatePath("/");
  return {
    id: idea.id,
    title: idea.title
  };
}

export async function generateOpportunityCandidateAction(repoId: string, force = false) {
  const result = await generateOpportunityCandidateForRepository(repoId, force);
  revalidatePath("/");
  return result;
}

export async function promoteCandidateToFullIdeaAction(ideaId: string, force = false) {
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

export async function clearExpiredExternalCacheAction() {
  const result = await clearExpiredExternalCache();
  revalidatePath("/");
  return result;
}

export async function clearOldNotificationLogsAction(daysToKeep = 30) {
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
