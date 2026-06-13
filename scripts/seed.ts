import { prisma } from "../src/lib/db/client";
import { calculateTrendScore } from "../src/lib/scoring/trend-score";

const now = new Date();

const demoRepos = [
  {
    githubId: 900001,
    fullName: "affaan-m/ECC",
    owner: "affaan-m",
    name: "ECC",
    url: "https://github.com/affaan-m/ECC",
    description: "Example Codex/Claude-style configuration and skills repository used as inspiration for RepoRadar discovery.",
    primaryLanguage: "Markdown",
    topics: ["codex", "claude-code", "skills", "hooks", "developer-tools"],
    createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    pushedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    starsCurrent: 2400,
    forksCurrent: 140,
    watchersCurrent: 2400,
    openIssues: 8,
    readmeExcerpt:
      "A repository with agent configuration, hooks and workflow automation examples. Demo seed data for RepoRadar portfolio UI.",
    growth7d: 420,
    growthPercent7d: 21.2
  },
  {
    githubId: 900002,
    fullName: "local-ai-labs/agent-workbench",
    owner: "local-ai-labs",
    name: "agent-workbench",
    url: "https://github.com/local-ai-labs/agent-workbench",
    description: "Local AI agent orchestration playground with RAG, tools and workflow automation.",
    primaryLanguage: "TypeScript",
    topics: ["ai", "agents", "rag", "workflow-automation", "local-ai"],
    createdAt: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000),
    pushedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    starsCurrent: 6100,
    forksCurrent: 520,
    watchersCurrent: 6100,
    openIssues: 32,
    readmeExcerpt: "Demo seed repository for a local AI agent workbench. Includes setup, examples and plugin-like tools.",
    growth7d: 900,
    growthPercent7d: 17.3
  },
  {
    githubId: 900003,
    fullName: "old-devtools/mcp-bridge",
    owner: "old-devtools",
    name: "mcp-bridge",
    url: "https://github.com/old-devtools/mcp-bridge",
    description: "MCP bridge for developer tools that recently became active again.",
    primaryLanguage: "Python",
    topics: ["mcp", "developer-tools", "automation"],
    createdAt: new Date(now.getTime() - 340 * 24 * 60 * 60 * 1000),
    pushedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    starsCurrent: 3500,
    forksCurrent: 260,
    watchersCurrent: 3500,
    openIssues: 12,
    readmeExcerpt: "Old repository that recently revived with new MCP integration work. Demo seed data.",
    growth7d: 260,
    growthPercent7d: 8.0
  }
];

async function main() {
  for (const demo of demoRepos) {
    const score = calculateTrendScore({
      starsCurrent: demo.starsCurrent,
      forksCurrent: demo.forksCurrent,
      createdAt: demo.createdAt,
      pushedAt: demo.pushedAt,
      topics: demo.topics,
      description: demo.description,
      readmeExcerpt: demo.readmeExcerpt,
      readmeText: demo.readmeExcerpt,
      primaryLanguage: demo.primaryLanguage,
      growth7d: demo.growth7d,
      growthPercent7d: demo.growthPercent7d,
      starsBefore7d: demo.starsCurrent - demo.growth7d
    });

    const repository = await prisma.repository.upsert({
      where: { githubId: demo.githubId },
      update: {
        starsCurrent: demo.starsCurrent,
        forksCurrent: demo.forksCurrent,
        trendScore: score.trendScore,
        relevanceScore: score.relevanceScore,
        status: score.status
      },
      create: {
        githubId: demo.githubId,
        fullName: demo.fullName,
        owner: demo.owner,
        name: demo.name,
        url: demo.url,
        description: demo.description,
        primaryLanguage: demo.primaryLanguage,
        topicsJson: JSON.stringify(demo.topics),
        createdAt: demo.createdAt,
        pushedAt: demo.pushedAt,
        firstSeenAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        lastSeenAt: now,
        starsCurrent: demo.starsCurrent,
        forksCurrent: demo.forksCurrent,
        watchersCurrent: demo.watchersCurrent,
        openIssues: demo.openIssues,
        ageMonths: score.ageMonths,
        isOldRepo: score.isOldRepo,
        status: score.status,
        shortSummaryPl: "Demo: krótki opis po polsku wygenerowany jako seed data do portfolio.",
        readmeExcerpt: demo.readmeExcerpt,
        trendScore: score.trendScore,
        relevanceScore: score.relevanceScore,
        source: "seed"
      }
    });

    await prisma.repoSnapshot.create({
      data: {
        repoId: repository.id,
        capturedAt: now,
        stars: demo.starsCurrent,
        forks: demo.forksCurrent,
        watchers: demo.watchersCurrent,
        openIssues: demo.openIssues,
        pushedAt: demo.pushedAt,
        growth24h: Math.round(demo.growth7d / 7),
        growth7d: demo.growth7d,
        growthPercent7d: demo.growthPercent7d
      }
    });
  }

  await prisma.setting.upsert({
    where: { key: "auto_generate_weekly_ideas" },
    update: { value: "false" },
    create: { key: "auto_generate_weekly_ideas", value: "false" }
  });

  console.log("Seed data inserted.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
