"use server";

import { revalidatePath } from "next/cache";
import { getEvidenceSourcesForReport, updateIdeaStatus, updateRepositoryStatus } from "@/lib/db/repositories";
import { runDailyScan } from "@/lib/github/scanner";
import {
  generateFullReportForRepository,
  generateIdeaForRepository,
  generateOpportunityCandidateForRepository,
  promoteCandidateToFullIdea
} from "@/lib/openai/repository-analysis";
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

export async function updateSettingAction(key: string, value: string) {
  await setSetting(key, value);
  revalidatePath("/");
  return { ok: true };
}
