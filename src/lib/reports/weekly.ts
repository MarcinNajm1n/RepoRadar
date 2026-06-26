import { prisma } from "@/lib/db/client";
import { getIsoWeek } from "@/lib/utils";
import { markdownLink } from "./markdown";

function repoLine(repo: {
  fullName: string;
  url: string;
  trendScore: number;
  starsCurrent: number;
  snapshots: Array<{ growth7d: number | null; growthPercent7d: number | null }>;
}) {
  const latest = repo.snapshots[0];
  const growth = latest?.growth7d === null || latest?.growth7d === undefined ? "brak historii" : `+${latest.growth7d} stars / 7d`;
  const percent =
    latest?.growthPercent7d === null || latest?.growthPercent7d === undefined
      ? ""
      : ` (${latest.growthPercent7d.toFixed(1)}%)`;
  return `- ${markdownLink(repo.fullName, repo.url)} - score ${repo.trendScore}, ${repo.starsCurrent} stars, ${growth}${percent}`;
}

export async function createWeeklyReport(now = new Date()) {
  const week = getIsoWeek(now);
  const baseInclude = {
    snapshots: {
      orderBy: { capturedAt: "desc" as const },
      take: 1
    }
  };

  const [rising, newlyDiscovered, revived, worthReading, worthCloning, ideas] = await Promise.all([
    prisma.repository.findMany({
      where: { isDeletedFromView: false },
      orderBy: [{ trendScore: "desc" }, { starsCurrent: "desc" }],
      take: 10,
      include: baseInclude
    }),
    prisma.repository.findMany({
      where: {
        isDeletedFromView: false,
        firstSeenAt: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: [{ trendScore: "desc" }, { starsCurrent: "desc" }],
      take: 10,
      include: baseInclude
    }),
    prisma.repository.findMany({
      where: {
        isDeletedFromView: false,
        isOldRepo: true,
        status: "HOT"
      },
      orderBy: [{ trendScore: "desc" }],
      take: 10,
      include: baseInclude
    }),
    prisma.repository.findMany({
      where: {
        isDeletedFromView: false,
        trendScore: { gte: 65 }
      },
      orderBy: [{ relevanceScore: "desc" }, { trendScore: "desc" }],
      take: 10,
      include: baseInclude
    }),
    prisma.repository.findMany({
      where: {
        isDeletedFromView: false,
        trendScore: { gte: 80 }
      },
      orderBy: [{ trendScore: "desc" }],
      take: 10,
      include: baseInclude
    }),
    prisma.idea.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { repository: { select: { fullName: true, url: true } } }
    })
  ]);

  const markdown = [
    `# RepoRadar weekly report - ${week}`,
    "",
    "## Top 10 rising repositories",
    ...(rising.length ? rising.map(repoLine) : ["- Brak danych."]),
    "",
    "## Top 10 newly discovered repositories",
    ...(newlyDiscovered.length ? newlyDiscovered.map(repoLine) : ["- Brak nowych repo w tym tygodniu."]),
    "",
    "## Stare repo, które odżyły",
    ...(revived.length ? revived.map(repoLine) : ["- Brak starych repo z mocnym nowym growth."]),
    "",
    "## Repo warte przeczytania",
    ...(worthReading.length ? worthReading.map(repoLine) : ["- Brak kandydatów."]),
    "",
    "## Repo warte ręcznego sklonowania",
    ...(worthCloning.length ? worthCloning.map(repoLine) : ["- Brak kandydatów."]),
    "",
    "## Potencjalne pomysły",
    ...(ideas.length
      ? ideas.map((idea) => `- ${idea.title} - źródło: ${markdownLink(idea.repository.fullName, idea.repository.url)}`)
      : ["- Brak wygenerowanych pomysłów."]),
    "",
    "## Podsumowanie",
    "RepoRadar bazuje na lokalnych snapshotach, więc potwierdzony growth pojawia się dopiero po kilku skanach. Wysokie początkowe stars są traktowane jako initial traction, nie jako udawany weekly growth."
  ].join("\n");

  const { writeMarkdownReport } = await import("./writer");
  const markdownPath = await writeMarkdownReport(`weekly/${week}.md`, markdown);
  const topRepoIds = [...new Set([...rising, ...newlyDiscovered, ...revived].map((repo) => repo.id))];

  return prisma.report.create({
    data: {
      type: "weekly",
      title: `Weekly report ${week}`,
      markdownPath,
      contentMarkdown: markdown,
      summary: `${rising.length} rising, ${newlyDiscovered.length} new, ${revived.length} revived.`,
      repoCount: topRepoIds.length,
      topRepoIdsJson: JSON.stringify(topRepoIds)
    }
  });
}
