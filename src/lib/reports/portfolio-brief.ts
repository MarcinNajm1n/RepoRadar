import { prisma } from "@/lib/db/client";
import { formatDate, getIsoWeek, toIsoDate } from "@/lib/utils";
import { markdownLink } from "./markdown";

type PortfolioRepo = {
  id: string;
  fullName: string;
  url: string;
  trendScore: number;
  relevanceScore: number;
  initialMomentumScore: number;
  starsCurrent: number;
  status: string;
  primaryLanguage: string | null;
  shortSummaryPl: string | null;
  description: string | null;
  snapshots: Array<{
    growth24h: number | null;
    growth7d: number | null;
    growthPercent7d: number | null;
  }>;
};

type PortfolioIdea = {
  title: string;
  usefulnessScore: number;
  riskScore: number;
  confidenceScore: number | null;
  opportunityScore: number | null;
  repository: {
    fullName: string;
  };
};

type PortfolioBriefInput = {
  generatedAt: Date;
  counts: {
    repositories: number;
    newRepositories: number;
    savedRepositories: number;
    activeTasks: number;
    ideas: number;
    weeklyReports: number;
  };
  topRepositories: PortfolioRepo[];
  latestRepositories: PortfolioRepo[];
  ideas: PortfolioIdea[];
  lastScan: {
    status: string;
    reposFound: number;
    reposUpdated: number;
    startedAt: Date;
  } | null;
  latestWeeklyReport: {
    title: string;
    summary: string | null;
    createdAt: Date;
  } | null;
};

function growthLabel(repo: PortfolioRepo) {
  const latest = repo.snapshots[0];
  if (!latest) {
    return "brak snapshotu";
  }

  const growth7d = latest.growth7d === null ? "brak 7d" : `+${latest.growth7d} / 7d`;
  const growth24h = latest.growth24h === null ? "brak 24h" : `+${latest.growth24h} / 24h`;
  const growthPercent =
    latest.growthPercent7d === null || latest.growthPercent7d === undefined ? "" : ` (${latest.growthPercent7d.toFixed(1)}%)`;

  return `${growth24h}, ${growth7d}${growthPercent}`;
}

function repoLine(repo: PortfolioRepo) {
  const summary = repo.shortSummaryPl ?? repo.description ?? "Brak opisu.";
  return `- ${markdownLink(repo.fullName, repo.url)} - score ${repo.trendScore}, ${repo.starsCurrent} stars, ${growthLabel(repo)}. ${summary}`;
}

function ideaLine(idea: PortfolioIdea) {
  const confidence = idea.confidenceScore === null ? "brak confidence" : `confidence ${idea.confidenceScore}/100`;
  const opportunity = idea.opportunityScore === null ? "brak opportunity" : `opportunity ${idea.opportunityScore}/100`;
  return `- ${idea.title} - ${idea.repository.fullName}, usefulness ${idea.usefulnessScore}/100, risk ${idea.riskScore}/100, ${confidence}, ${opportunity}.`;
}

export function buildPortfolioBriefMarkdown(input: PortfolioBriefInput) {
  const week = getIsoWeek(input.generatedAt);
  const lastScan = input.lastScan
    ? `${input.lastScan.status}, ${input.lastScan.reposUpdated}/${input.lastScan.reposFound} repo updated, ${formatDate(input.lastScan.startedAt)}`
    : "brak skanu";

  return [
    `# RepoRadar Brief - ${toIsoDate(input.generatedAt)}`,
    "",
    "## Executive snapshot",
    `- Tydzien: ${week}`,
    `- Repozytoria: ${input.counts.repositories}`,
    `- Nowo znalezione: ${input.counts.newRepositories}`,
    `- Zapisane: ${input.counts.savedRepositories}`,
    `- Aktywne zadania: ${input.counts.activeTasks}`,
    `- Pomysly: ${input.counts.ideas}`,
    `- Raporty tygodniowe: ${input.counts.weeklyReports}`,
    `- Ostatni scan: ${lastScan}`,
    "",
    "## Najmocniejsze sygnaly",
    ...(input.topRepositories.length ? input.topRepositories.map(repoLine) : ["- Brak repozytoriow do pokazania."]),
    "",
    "## Najnowsze repo do decyzji",
    ...(input.latestRepositories.length ? input.latestRepositories.map(repoLine) : ["- Brak nowych repozytoriow."]),
    "",
    "## Pomysly z potencjalem",
    ...(input.ideas.length ? input.ideas.map(ideaLine) : ["- Brak wygenerowanych pomyslow."]),
    "",
    "## Ostatni raport tygodniowy",
    input.latestWeeklyReport
      ? `- ${input.latestWeeklyReport.title} (${formatDate(input.latestWeeklyReport.createdAt)}): ${
          input.latestWeeklyReport.summary ?? "brak podsumowania"
        }`
      : "- Brak raportu tygodniowego.",
    "",
    "## Portfolio notes",
    "- Ten brief jest lokalnym eksportem markdown z RepoRadar.",
    "- W UI mozna go otworzyc w dialogu raportu i zapisac jako PDF przez drukowanie przegladarki.",
    "- Dane pochodza z lokalnej bazy i nie wymagaja uruchamiania zewnetrznego API podczas eksportu."
  ].join("\n");
}

export async function createPortfolioBrief(now = new Date()) {
  const [topRepositories, latestRepositories, ideas, lastScan, weeklyReports, counts] = await Promise.all([
    prisma.repository.findMany({
      where: { isDeletedFromView: false, status: { not: "IGNORED" } },
      orderBy: [{ trendScore: "desc" }, { initialMomentumScore: "desc" }, { starsCurrent: "desc" }],
      take: 8,
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.repository.findMany({
      where: { isDeletedFromView: false, status: { not: "IGNORED" } },
      orderBy: [{ firstSeenAt: "desc" }, { trendScore: "desc" }],
      take: 6,
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.idea.findMany({
      orderBy: [{ opportunityScore: "desc" }, { confidenceScore: "desc" }, { usefulnessScore: "desc" }],
      take: 5,
      select: {
        title: true,
        usefulnessScore: true,
        riskScore: true,
        confidenceScore: true,
        opportunityScore: true,
        repository: {
          select: {
            fullName: true
          }
        }
      }
    }),
    prisma.scanRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: {
        status: true,
        reposFound: true,
        reposUpdated: true,
        startedAt: true
      }
    }),
    prisma.report.findMany({
      where: { type: "weekly" },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: {
        title: true,
        summary: true,
        createdAt: true
      }
    }),
    Promise.all([
      prisma.repository.count({ where: { isDeletedFromView: false } }),
      prisma.repository.count({ where: { status: "NEW", isDeletedFromView: false } }),
      prisma.repository.count({ where: { status: "SAVED", isDeletedFromView: false } }),
      prisma.actionItem.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } } }),
      prisma.idea.count(),
      prisma.report.count({ where: { type: "weekly" } })
    ])
  ]);
  const markdown = buildPortfolioBriefMarkdown({
    generatedAt: now,
    counts: {
      repositories: counts[0],
      newRepositories: counts[1],
      savedRepositories: counts[2],
      activeTasks: counts[3],
      ideas: counts[4],
      weeklyReports: counts[5]
    },
    topRepositories,
    latestRepositories,
    ideas,
    lastScan,
    latestWeeklyReport: weeklyReports[0] ?? null
  });
  const { writeMarkdownReport } = await import("./writer");
  const markdownPath = await writeMarkdownReport(`portfolio/reporadar-brief-${toIsoDate(now)}.md`, markdown);
  const topRepoIds = topRepositories.map((repo) => repo.id);

  return prisma.report.create({
    data: {
      type: "portfolio_brief",
      title: `RepoRadar Brief ${toIsoDate(now)}`,
      markdownPath,
      contentMarkdown: markdown,
      summary: `${topRepositories.length} top repo, ${latestRepositories.length} nowych sygnalow, ${ideas.length} pomyslow.`,
      repoCount: topRepoIds.length,
      topRepoIdsJson: JSON.stringify(topRepoIds)
    }
  });
}
