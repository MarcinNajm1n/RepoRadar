import { prisma } from "../src/lib/db/client";
import { calculateTrendScore } from "../src/lib/scoring/trend-score";
import type { RepositoryStatus } from "../src/types/status";

const isPortfolioMode = process.argv.includes("--portfolio") || process.env.REPORADAR_PORTFOLIO_MODE === "1";
const now = isPortfolioMode ? new Date("2026-06-21T12:00:00.000Z") : new Date();

type DemoRepoSeed = {
  githubId: number;
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string | null;
  primaryLanguage: string | null;
  topics: string[];
  createdAt: Date;
  pushedAt: Date | null;
  starsCurrent: number;
  forksCurrent: number;
  watchersCurrent: number;
  openIssues: number;
  readmeExcerpt: string | null;
  growth7d: number | null;
  growthPercent7d: number | null;
  shortSummaryPl?: string | null;
  statusOverride?: RepositoryStatus;
  isArchived?: boolean;
};

const demoRepos: DemoRepoSeed[] = [
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

const portfolioOnlyRepos: DemoRepoSeed[] = [
  {
    githubId: 900101,
    fullName: "portfolio-labs/very-long-owner-and-repository-name-for-reporadar-edge-case-agent-evaluation-suite",
    owner: "portfolio-labs",
    name: "very-long-owner-and-repository-name-for-reporadar-edge-case-agent-evaluation-suite",
    url: "https://github.com/portfolio-labs/very-long-owner-and-repository-name-for-reporadar-edge-case-agent-evaluation-suite",
    description:
      "A deliberately long repository name and description used to test RepoRadar table density, wrapping, summaries, topics and action controls in portfolio screenshots.",
    primaryLanguage: "TypeScript",
    topics: [
      "ai-agents",
      "mcp",
      "rag",
      "workflow-automation",
      "prompt-engineering",
      "developer-tools",
      "local-ai",
      "observability",
      "evaluation",
      "typescript"
    ],
    createdAt: new Date(now.getTime() - 36 * 24 * 60 * 60 * 1000),
    pushedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    starsCurrent: 11200,
    forksCurrent: 980,
    watchersCurrent: 11200,
    openIssues: 44,
    readmeExcerpt:
      "Portfolio seed repo with quickstart, examples, API notes, evaluation scripts and long metadata for UI stress testing.",
    growth7d: 1500,
    growthPercent7d: 15.5,
    shortSummaryPl: "Portfolio: mocny kandydat AI agents z dluga nazwa, wieloma topics i wyraznym wzrostem.",
    statusOverride: "HOT"
  },
  {
    githubId: 900102,
    fullName: "quiet-oss/no-growth-agent-index",
    owner: "quiet-oss",
    name: "no-growth-agent-index",
    url: "https://github.com/quiet-oss/no-growth-agent-index",
    description: "Index of local agent tools without enough local history yet.",
    primaryLanguage: null,
    topics: ["agents", "index", "local-ai"],
    createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
    pushedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    starsCurrent: 860,
    forksCurrent: 38,
    watchersCurrent: 860,
    openIssues: 3,
    readmeExcerpt: null,
    growth7d: null,
    growthPercent7d: null,
    shortSummaryPl: null,
    statusOverride: "TO_REVIEW"
  },
  {
    githubId: 900103,
    fullName: "archived-ai/rag-starter-legacy",
    owner: "archived-ai",
    name: "rag-starter-legacy",
    url: "https://github.com/archived-ai/rag-starter-legacy",
    description: "Archived RAG starter project kept in the demo dataset to verify archived badges and lower-priority decisions.",
    primaryLanguage: "Python",
    topics: ["rag", "llm", "archive"],
    createdAt: new Date(now.getTime() - 920 * 24 * 60 * 60 * 1000),
    pushedAt: new Date(now.getTime() - 420 * 24 * 60 * 60 * 1000),
    starsCurrent: 5200,
    forksCurrent: 610,
    watchersCurrent: 5200,
    openIssues: 91,
    readmeExcerpt: "Legacy RAG starter. Useful for testing old and archived repository presentation.",
    growth7d: 0,
    growthPercent7d: 0,
    shortSummaryPl: "Portfolio: stare zarchiwizowane repo, dobre do sprawdzenia stanow OLD/archived.",
    statusOverride: "OLD",
    isArchived: true
  },
  {
    githubId: 900104,
    fullName: "mcp-observatory/rate-limit-timeline",
    owner: "mcp-observatory",
    name: "rate-limit-timeline",
    url: "https://github.com/mcp-observatory/rate-limit-timeline",
    description: "GitHub API rate-limit and scan observability dashboard for local developer tools.",
    primaryLanguage: "Go",
    topics: ["mcp", "github-api", "observability", "developer-tools"],
    createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
    pushedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
    starsCurrent: 4300,
    forksCurrent: 210,
    watchersCurrent: 4300,
    openIssues: 11,
    readmeExcerpt: "Shows rate-limit history, cache hit rate, scan duration and failed request reasons.",
    growth7d: 310,
    growthPercent7d: 7.8,
    shortSummaryPl: "Portfolio: praktyczne repo pod observability i kontrolowanie limitow GitHuba.",
    statusOverride: "SAVED"
  }
];

async function main() {
  const reposToSeed = isPortfolioMode ? [...demoRepos, ...portfolioOnlyRepos] : demoRepos;

  for (const demo of reposToSeed) {
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
      starsBefore7d: demo.growth7d === null ? null : demo.starsCurrent - demo.growth7d
    });
    const status = demo.statusOverride ?? score.status;
    const shortSummaryPl =
      demo.shortSummaryPl === undefined ? "Demo: krotki opis po polsku wygenerowany jako seed data do portfolio." : demo.shortSummaryPl;
    const growth24h = demo.growth7d === null ? null : Math.round(demo.growth7d / 7);

    const repository = await prisma.repository.upsert({
      where: { githubId: demo.githubId },
      update: {
        description: demo.description,
        primaryLanguage: demo.primaryLanguage,
        topicsJson: JSON.stringify(demo.topics),
        pushedAt: demo.pushedAt,
        starsCurrent: demo.starsCurrent,
        forksCurrent: demo.forksCurrent,
        watchersCurrent: demo.watchersCurrent,
        openIssues: demo.openIssues,
        isArchived: demo.isArchived ?? false,
        trendScore: score.trendScore,
        relevanceScore: score.relevanceScore,
        initialMomentumScore: score.initialMomentumScore,
        growth24h,
        growth7d: demo.growth7d,
        growthPercent7d: demo.growthPercent7d,
        scoreBreakdownJson: JSON.stringify(score.scoreBreakdown),
        shortSummaryPl,
        readmeExcerpt: demo.readmeExcerpt,
        status
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
        isArchived: demo.isArchived ?? false,
        status,
        shortSummaryPl,
        readmeExcerpt: demo.readmeExcerpt,
        trendScore: score.trendScore,
        relevanceScore: score.relevanceScore,
        initialMomentumScore: score.initialMomentumScore,
        growth24h,
        growth7d: demo.growth7d,
        growthPercent7d: demo.growthPercent7d,
        scoreBreakdownJson: JSON.stringify(score.scoreBreakdown),
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
        growth24h,
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

  if (isPortfolioMode) {
    await prisma.actionItem.upsert({
      where: { dedupeKey: "portfolio:review-top-signal" },
      update: {
        status: "OPEN",
        title: "Portfolio review: sprawdz najmocniejszy sygnal",
        priority: 8
      },
      create: {
        type: "READ_README",
        title: "Portfolio review: sprawdz najmocniejszy sygnal",
        description: "Stabilne zadanie demo widoczne w kolejce podczas prezentacji RepoRadar.",
        priority: 8,
        dedupeKey: "portfolio:review-top-signal"
      }
    });
  }

  console.log(isPortfolioMode ? "Portfolio seed data inserted." : "Seed data inserted.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
