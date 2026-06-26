import { prisma } from "@/lib/db/client";
import { getDashboardData } from "@/lib/db/repositories";
import { REPORT_TYPES } from "@/types/status";
import type { ActionItemListItem } from "@/types/action-item";
import type { DashboardData, IdeaListItem, RepositoryListItem } from "@/types/repository";
import { toIsoDate } from "@/lib/utils";
import { markdownLink } from "./markdown";

function repoLine(repo: RepositoryListItem, index: number) {
  const growth = repo.growth7d === null ? "baseline" : `+${repo.growth7d} stars / 7d`;
  return `${index + 1}. ${markdownLink(repo.fullName, repo.url)} - trend ${repo.trendScore}, initial ${repo.initialMomentumScore}, ${growth}`;
}

function ideaLine(idea: IdeaListItem, index: number) {
  const score = idea.opportunityScore === null ? "brak score" : `${idea.opportunityScore}/100`;
  return `${index + 1}. ${idea.title} - ${score}, repo: ${idea.sourceRepoName}`;
}

function taskLine(item: ActionItemListItem, index: number) {
  const target = item.repoFullName ?? item.ideaTitle ?? item.reportTitle ?? "bez powiazania";
  return `${index + 1}. ${item.title} - ${item.status}, ${target}`;
}

function rejectLine(repo: RepositoryListItem, index: number) {
  return `${index + 1}. ${repo.fullName} - trend ${repo.trendScore}, status ${repo.status}`;
}

export function buildDailyBriefingMarkdown(data: DashboardData, now = new Date()) {
  const date = toIsoDate(now);
  const topRepositories = data.radarToday.topRepositories.slice(0, 3);
  const businessCandidates = data.radarToday.businessCandidates.slice(0, 3);
  const actionItems = data.radarToday.actionItems.slice(0, 3);
  const rejectCandidates = data.rejectCandidates.slice(0, 3);
  const decisions = [
    ...data.radarToday.alerts.map((alert) => `${alert.level.toUpperCase()}: ${alert.title}`),
    ...data.radarToday.businessCandidates
      .filter((idea) => idea.evidenceSources.length === 0)
      .slice(0, 3)
      .map((idea) => `Sprawdz evidence dla: ${idea.title}`)
  ].slice(0, 5);

  return [
    `# RepoRadar daily briefing - ${date}`,
    "",
    "## 3 repo do sprawdzenia",
    ...(topRepositories.length ? topRepositories.map(repoLine) : ["Brak repo do sprawdzenia."]),
    "",
    "## 3 kandydatow biznesowych",
    ...(businessCandidates.length ? businessCandidates.map(ideaLine) : ["Brak kandydatow biznesowych."]),
    "",
    "## 3 zadania",
    ...(actionItems.length ? actionItems.map(taskLine) : ["Brak aktywnych zadan."]),
    "",
    "## Co odrzucic",
    ...(rejectCandidates.length ? rejectCandidates.map(rejectLine) : ["Brak oczywistych kandydatow do odrzucenia."]),
    "",
    "## Co wymaga decyzji",
    ...(decisions.length ? decisions.map((item) => `- ${item}`) : ["- Brak pilnych decyzji."]),
    "",
    "## Krotki plan dzialania",
    "1. Otworz najwyzej ocenione repo i sprawdz README/demo.",
    "2. Rozwin tylko kandydata z najlepszym evidence i jasnym B2B pain point.",
    "3. Zamknij lub odloz zadania, ktore nie wspieraja dzisiejszej decyzji.",
    "",
    "## Uwagi kosztowe",
    "- Briefing jest deterministyczny i nie uzywa OpenAI.",
    "- Full research i pelne raporty uruchamiaj recznie."
  ].join("\n");
}

export async function createDailyBriefing(now = new Date()) {
  const data = await getDashboardData();
  const markdown = buildDailyBriefingMarkdown(data, now);
  const date = toIsoDate(now);
  const { writeMarkdownReport } = await import("./writer");
  const markdownPath = await writeMarkdownReport(`daily/${date}-briefing.md`, markdown);
  const topRepoIds = data.radarToday.topRepositories.slice(0, 3).map((repo) => repo.id);

  return prisma.report.create({
    data: {
      type: REPORT_TYPES.DAILY_BRIEFING,
      title: `Daily briefing ${date}`,
      markdownPath,
      contentMarkdown: markdown,
      summary: `${topRepoIds.length} repo, ${data.radarToday.businessCandidates.length} candidates, ${data.radarToday.actionItems.length} tasks.`,
      repoCount: topRepoIds.length,
      topRepoIdsJson: JSON.stringify(topRepoIds)
    }
  });
}
