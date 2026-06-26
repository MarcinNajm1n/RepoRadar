import { prisma } from "@/lib/db/client";
import { toIsoDate } from "@/lib/utils";
import { isHighValueRepository } from "@/lib/notifications/thresholds";
import { markdownLink } from "./markdown";

export async function createDailyReport(scanRunId: string) {
  const scanRun = await prisma.scanRun.findUniqueOrThrow({ where: { id: scanRunId } });
  const repositories = await prisma.repository.findMany({
    where: {
      lastSeenAt: {
        gte: scanRun.startedAt
      }
    },
    orderBy: [{ trendScore: "desc" }, { starsCurrent: "desc" }],
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1
      }
    }
  });

  const date = toIsoDate(scanRun.startedAt);
  const top = repositories.slice(0, 20);
  const highValue = top.filter((repo) =>
    isHighValueRepository({
      trendScore: repo.trendScore,
      growth7d: repo.snapshots[0]?.growth7d ?? null,
      relevanceScore: repo.relevanceScore
    })
  );

  const lines = [
    `# RepoRadar daily report - ${date}`,
    "",
    `Status skanu: ${scanRun.status}`,
    `Znalezione repo: ${scanRun.reposFound}`,
    `Zaktualizowane repo: ${scanRun.reposUpdated}`,
    "",
    "## Najlepsze wyniki",
    ...top.map((repo, index) => {
      const snapshot = repo.snapshots[0];
      const growth = snapshot?.growth7d === null || snapshot?.growth7d === undefined ? "zbieramy dane" : `+${snapshot.growth7d} / 7d`;
      return `${index + 1}. ${markdownLink(repo.fullName, repo.url)} - score ${repo.trendScore}, ${repo.starsCurrent} stars, ${growth}`;
    }),
    "",
    "## Repo warte uwagi",
    ...(highValue.length
      ? highValue.map((repo) => `- ${markdownLink(repo.fullName, repo.url)} - trend ${repo.trendScore}, relevance ${repo.relevanceScore}`)
      : ["- Brak repo przekraczających próg powiadomień."]),
    "",
    "## Uwagi",
    "- Growth liczony jest wyłącznie z lokalnych snapshotów RepoRadar.",
    "- Pierwszy scan jest baseline i nie udaje historycznego wzrostu."
  ];

  const markdown = lines.join("\n");
  const { writeMarkdownReport } = await import("./writer");
  const markdownPath = await writeMarkdownReport(`daily/${date}.md`, markdown);

  return prisma.report.create({
    data: {
      type: "daily",
      title: `Daily report ${date}`,
      markdownPath,
      contentMarkdown: markdown,
      summary: `${repositories.length} repo w skanie, ${highValue.length} high-value.`,
      repoCount: repositories.length,
      topRepoIdsJson: JSON.stringify(top.map((repo) => repo.id))
    }
  });
}
