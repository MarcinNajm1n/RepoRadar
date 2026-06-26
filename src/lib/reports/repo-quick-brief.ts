import { prisma } from "@/lib/db/client";
import { getRepositoryForReport } from "@/lib/db/repositories";
import { safeJsonParse } from "@/lib/utils";
import { REPORT_TYPES } from "@/types/status";
import { repoQuickBriefPath } from "./paths";

function formatGrowth(value: number | null | undefined) {
  return value === null || value === undefined ? "brak historii" : `+${value}`;
}

function quickVerdict(repo: Awaited<ReturnType<typeof getRepositoryForReport>>) {
  if (repo.trendScore >= 80) {
    return "Sprawdz teraz: wysoki trend score i dobry kandydat do decyzji.";
  }

  if (repo.initialMomentumScore > 0) {
    return "Szybki przeglad: repo ma initial momentum, ale wymaga potwierdzenia kolejnymi snapshotami.";
  }

  if (repo.status === "SAVED") {
    return "Wroc do tego repo: zostalo zapisane jako warte uwagi.";
  }

  return "Zrob szybki triage: sprawdz README, growth i dopiero potem decyduj o pelnym raporcie.";
}

export function buildRepoQuickBriefMarkdown(repo: Awaited<ReturnType<typeof getRepositoryForReport>>, now = new Date()) {
  const latest = repo.snapshots[0];
  const topics = safeJsonParse<string[]>(repo.topicsJson, []);

  return [
    `# RepoRadar quick brief - ${repo.fullName}`,
    "",
    `Wygenerowano: ${now.toISOString()}`,
    "",
    "## Decyzja",
    quickVerdict(repo),
    "",
    "## Sygnaly",
    `- Trend score: ${repo.trendScore}/100`,
    `- Initial momentum: ${repo.initialMomentumScore}/100`,
    `- Stars: ${repo.starsCurrent}`,
    `- Growth 24h: ${formatGrowth(latest?.growth24h)}`,
    `- Growth 7d: ${formatGrowth(latest?.growth7d)}`,
    `- Status: ${repo.status}`,
    "",
    "## Kontekst",
    `- URL: ${repo.url}`,
    `- Jezyk: ${repo.primaryLanguage ?? "brak danych"}`,
    `- Topics: ${topics.slice(0, 10).join(", ") || "brak"}`,
    `- Ostatni push: ${repo.pushedAt?.toISOString() ?? "brak danych"}`,
    "",
    "## Opis",
    repo.shortSummaryPl ?? repo.description ?? "Brak opisu.",
    "",
    "## Nastepny krok",
    repo.trendScore >= 80
      ? "Uruchom pelny raport tylko jesli README i zastosowanie wygladaja obiecujaco."
      : "Zacznij od README albo odloz do obserwacji zamiast generowac pelny raport AI."
  ].join("\n");
}

export async function createRepoQuickBrief(repoId: string, now = new Date()) {
  const repo = await getRepositoryForReport(repoId);
  const markdown = buildRepoQuickBriefMarkdown(repo, now);
  const { writeMarkdownReport } = await import("./writer");
  const markdownPath = await writeMarkdownReport(repoQuickBriefPath(repo.owner, repo.name), markdown);

  return prisma.report.create({
    data: {
      type: REPORT_TYPES.REPO_QUICK_BRIEF,
      repoId,
      title: `Quick brief: ${repo.fullName}`,
      markdownPath,
      contentMarkdown: markdown,
      summary: quickVerdict(repo),
      repoCount: 1,
      topRepoIdsJson: JSON.stringify([repoId])
    }
  });
}
