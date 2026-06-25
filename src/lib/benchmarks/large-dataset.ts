import path from "node:path";

export const DEFAULT_LARGE_BENCHMARK_SIZE = 5000;
export const DEFAULT_LARGE_BENCHMARK_OUTPUT_DIR = path.join("test-results", "benchmarks");
export const LARGE_BENCHMARK_BATCH_SIZE = 1000;
export const LARGE_BENCHMARK_PAGE_SIZE = 200;
export const LARGE_BENCHMARK_NAME = "large-dataset";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const LANGUAGES = ["TypeScript", "Python", "Go", "Rust", "JavaScript", null] as const;
const STATUSES = ["NEW", "SAVED", "READ", "HOT", "TO_REVIEW", "ANALYZED", "OLD"] as const;
const PROFILES = ["AI_AGENTS", "LLM_APPS", "MCP", "DEVTOOLS_AUTOMATION", "RAG", "PROMPT_TOOLS", "LOCAL_AI"] as const;
const TOPIC_GROUPS = [
  ["ai", "agents", "typescript", "workflow-automation", "developer-tools"],
  ["llm", "rag", "python", "local-ai", "vector-search"],
  ["mcp", "automation", "tools", "observability", "github"],
  ["prompt-engineering", "evals", "testing", "devtools", "cli"],
  ["open-source", "agent-framework", "coding-assistant", "sqlite", "nextjs"]
] as const;

export type LargeBenchmarkCliOptions = {
  size: number;
  outputDir: string;
  outputPath: string | null;
  help: boolean;
};

export type LargeBenchmarkPaths = {
  outputDir: string;
  databasePath: string;
  jsonPath: string;
  markdownPath: string;
};

export type BenchmarkBatch = {
  start: number;
  count: number;
};

export type BenchmarkRepositorySeed = {
  id: string;
  githubId: number;
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string;
  readmeExcerpt: string;
  primaryLanguage: string | null;
  topicsJson: string;
  license: string | null;
  createdAt: Date;
  pushedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  starsCurrent: number;
  forksCurrent: number;
  watchersCurrent: number;
  openIssues: number;
  ageMonths: number;
  isOldRepo: boolean;
  isArchived: boolean;
  isFork: boolean;
  isDeletedFromView: boolean;
  status: string;
  shortSummaryPl: string;
  trendScore: number;
  relevanceScore: number;
  initialMomentumScore: number;
  growth24h: number | null;
  growth7d: number | null;
  growthPercent7d: number | null;
  scoreBreakdownJson: string;
  discoveryProfilesJson: string;
  source: string;
  createdDbAt: Date;
  updatedDbAt: Date;
};

export type BenchmarkSnapshotSeed = {
  id: string;
  repoId: string;
  capturedAt: Date;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  pushedAt: Date | null;
  growth24h: number | null;
  growth7d: number | null;
  growthPercent7d: number | null;
};

export type BenchmarkMeasurementDetails = Record<string, string | number | boolean | null>;

export type BenchmarkMeasurement = {
  durationMs: number;
  details: BenchmarkMeasurementDetails;
};

export type LargeBenchmarkResult = {
  benchmark: typeof LARGE_BENCHMARK_NAME;
  createdAt: string;
  size: number;
  databasePath: string;
  outputs: {
    jsonPath: string;
    markdownPath: string;
  };
  seed: {
    repositories: number;
    snapshots: number;
    batchSize: number;
    durationMs: number;
  };
  measurements: {
    getRepositoryPage: BenchmarkMeasurement;
    getDashboardData: BenchmarkMeasurement;
    repoListViewRenderToStaticMarkup: BenchmarkMeasurement;
  };
  environment: {
    node: string;
    platform: string;
    arch: string;
  };
};

export function parseLargeBenchmarkArgs(argv: string[]): LargeBenchmarkCliOptions {
  const options: LargeBenchmarkCliOptions = {
    size: DEFAULT_LARGE_BENCHMARK_SIZE,
    outputDir: DEFAULT_LARGE_BENCHMARK_OUTPUT_DIR,
    outputPath: null,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--size") {
      const value = readNextArg(argv, index, "--size");
      options.size = parsePositiveInteger(value, "--size");
      index += 1;
      continue;
    }

    if (arg.startsWith("--size=")) {
      options.size = parsePositiveInteger(arg.slice("--size=".length), "--size");
      continue;
    }

    if (arg === "--output-dir") {
      const value = readNextArg(argv, index, "--output-dir");
      options.outputDir = parseNonEmptyString(value, "--output-dir");
      index += 1;
      continue;
    }

    if (arg.startsWith("--output-dir=")) {
      options.outputDir = parseNonEmptyString(arg.slice("--output-dir=".length), "--output-dir");
      continue;
    }

    if (arg === "--output") {
      const value = readNextArg(argv, index, "--output");
      options.outputPath = parseNonEmptyString(value, "--output");
      index += 1;
      continue;
    }

    if (arg.startsWith("--output=")) {
      options.outputPath = parseNonEmptyString(arg.slice("--output=".length), "--output");
      continue;
    }

    throw new Error(`Unknown benchmark argument: ${arg}`);
  }

  return options;
}

export function getLargeBenchmarkHelp() {
  return [
    "Usage: npm run benchmark:large -- [--size=5000] [--output=test-results/benchmarks/large-smoke.json]",
    "",
    "Options:",
    "  --size=N        Number of repositories to seed. Defaults to 5000. Use --size=200 for a smoke run.",
    "  --output-dir=P  Directory under test-results/ for the SQLite database and JSON/Markdown results.",
    "  --output=P      JSON output path under test-results/. Markdown and SQLite use the same basename.",
    "  --help          Print this help text."
  ].join("\n");
}

export function buildLargeBenchmarkPaths({
  outputDir = DEFAULT_LARGE_BENCHMARK_OUTPUT_DIR,
  outputPath = null,
  timestamp = new Date(),
  cwd = process.cwd()
}: {
  outputDir?: string;
  outputPath?: string | null;
  timestamp?: Date | string;
  cwd?: string;
} = {}): LargeBenchmarkPaths {
  if (outputPath) {
    const resolvedJsonPath = path.resolve(cwd, outputPath);
    if (path.extname(resolvedJsonPath).toLowerCase() !== ".json") {
      throw new Error("--output must point to a .json file.");
    }

    const resolvedOutputDir = path.dirname(resolvedJsonPath);
    const fileStem = path.basename(resolvedJsonPath, ".json");

    return {
      outputDir: resolvedOutputDir,
      databasePath: path.join(resolvedOutputDir, `${fileStem}.sqlite`),
      jsonPath: resolvedJsonPath,
      markdownPath: path.join(resolvedOutputDir, `${fileStem}.md`)
    };
  }

  const resolvedOutputDir = path.resolve(cwd, outputDir);
  const safeTimestamp = formatBenchmarkTimestamp(timestamp);
  const fileStem = `large-dataset-${safeTimestamp}`;

  return {
    outputDir: resolvedOutputDir,
    databasePath: path.join(resolvedOutputDir, `${fileStem}.sqlite`),
    jsonPath: path.join(resolvedOutputDir, `${fileStem}.json`),
    markdownPath: path.join(resolvedOutputDir, `${fileStem}.md`)
  };
}

export function toSqliteDatabaseUrl(databasePath: string, relativeToDir = path.join(process.cwd(), "prisma")) {
  const resolvedDatabasePath = path.resolve(databasePath);
  const relativePath = path.relative(path.resolve(relativeToDir), resolvedDatabasePath);
  const sqlitePath = relativePath && !path.isAbsolute(relativePath) ? relativePath : resolvedDatabasePath;

  return `file:${sqlitePath.replace(/\\/g, "/")}`;
}

export function isBenchmarkOutputDirectoryAllowed(outputDir: string, cwd = process.cwd()) {
  return isPathInsideDirectory(path.resolve(cwd, outputDir), path.resolve(cwd, "test-results"));
}

export function isPathInsideDirectory(childPath: string, parentDirectory: string) {
  const relativePath = path.relative(parentDirectory, childPath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

export function formatBenchmarkTimestamp(timestamp: Date | string) {
  const raw = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  return raw.replace(/[^0-9A-Za-z-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function buildBenchmarkBatches(total: number, batchSize = LARGE_BENCHMARK_BATCH_SIZE): BenchmarkBatch[] {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error("Benchmark total must be a positive integer.");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Benchmark batch size must be a positive integer.");
  }

  const batches: BenchmarkBatch[] = [];
  for (let start = 0; start < total; start += batchSize) {
    batches.push({ start, count: Math.min(batchSize, total - start) });
  }

  return batches;
}

export function buildBenchmarkRepositorySeed(index: number, now = new Date()): BenchmarkRepositorySeed {
  assertValidSeedIndex(index);
  const metrics = buildBenchmarkMetrics(index, now);
  const ordinal = index + 1;
  const owner = `benchmark-owner-${String(index % 100).padStart(2, "0")}`;
  const name = `benchmark-repo-${String(ordinal).padStart(5, "0")}`;
  const fullName = `${owner}/${name}`;
  const topics = TOPIC_GROUPS[index % TOPIC_GROUPS.length];
  const firstProfile = PROFILES[index % PROFILES.length];
  const secondProfile = PROFILES[(index + 2) % PROFILES.length];
  const status = metrics.isOldRepo ? "OLD" : STATUSES[index % (STATUSES.length - 1)];

  return {
    id: repositoryId(index),
    githubId: 100_000_000 + index,
    fullName,
    owner,
    name,
    url: `https://github.com/${fullName}`,
    description: `Benchmark repository ${ordinal} for RepoRadar large dataset timing across AI and developer tooling metadata.`,
    readmeExcerpt:
      "Synthetic benchmark README excerpt for local performance measurement. It contains agent, LLM, MCP, RAG, and developer workflow keywords.",
    primaryLanguage: LANGUAGES[index % LANGUAGES.length],
    topicsJson: JSON.stringify(topics),
    license: index % 4 === 0 ? "MIT" : null,
    createdAt: metrics.createdAt,
    pushedAt: metrics.pushedAt,
    firstSeenAt: metrics.firstSeenAt,
    lastSeenAt: now,
    starsCurrent: metrics.stars,
    forksCurrent: metrics.forks,
    watchersCurrent: metrics.stars,
    openIssues: metrics.openIssues,
    ageMonths: metrics.ageMonths,
    isOldRepo: metrics.isOldRepo,
    isArchived: index % 97 === 0,
    isFork: false,
    isDeletedFromView: false,
    status,
    shortSummaryPl: `Benchmark: syntetyczne repo ${ordinal} do lokalnego pomiaru duzego zbioru.`,
    trendScore: metrics.trendScore,
    relevanceScore: metrics.relevanceScore,
    initialMomentumScore: metrics.initialMomentumScore,
    growth24h: metrics.growth24h,
    growth7d: metrics.growth7d,
    growthPercent7d: metrics.growthPercent7d,
    scoreBreakdownJson: JSON.stringify(buildScoreBreakdown(metrics)),
    discoveryProfilesJson: JSON.stringify([firstProfile, secondProfile]),
    source: "benchmark",
    createdDbAt: now,
    updatedDbAt: now
  };
}

export function buildBenchmarkSnapshotSeed(index: number, now = new Date()): BenchmarkSnapshotSeed {
  assertValidSeedIndex(index);
  const metrics = buildBenchmarkMetrics(index, now);

  return {
    id: `benchmark_snapshot_${String(index + 1).padStart(6, "0")}`,
    repoId: repositoryId(index),
    capturedAt: new Date(now.getTime() - (index % 24) * HOUR_MS),
    stars: metrics.stars,
    forks: metrics.forks,
    watchers: metrics.stars,
    openIssues: metrics.openIssues,
    pushedAt: metrics.pushedAt,
    growth24h: metrics.growth24h,
    growth7d: metrics.growth7d,
    growthPercent7d: metrics.growthPercent7d
  };
}

export function buildBenchmarkRepositorySeedBatch(start: number, count: number, now = new Date()) {
  return Array.from({ length: count }, (_, offset) => buildBenchmarkRepositorySeed(start + offset, now));
}

export function buildBenchmarkSnapshotSeedBatch(start: number, count: number, now = new Date()) {
  return Array.from({ length: count }, (_, offset) => buildBenchmarkSnapshotSeed(start + offset, now));
}

export function roundDurationMs(durationMs: number) {
  return Math.round(durationMs * 100) / 100;
}

export function buildLargeBenchmarkResult(input: {
  createdAt: string;
  size: number;
  databasePath: string;
  jsonPath: string;
  markdownPath: string;
  seedDurationMs: number;
  measurements: LargeBenchmarkResult["measurements"];
  environment: LargeBenchmarkResult["environment"];
}): LargeBenchmarkResult {
  return {
    benchmark: LARGE_BENCHMARK_NAME,
    createdAt: input.createdAt,
    size: input.size,
    databasePath: input.databasePath,
    outputs: {
      jsonPath: input.jsonPath,
      markdownPath: input.markdownPath
    },
    seed: {
      repositories: input.size,
      snapshots: input.size,
      batchSize: LARGE_BENCHMARK_BATCH_SIZE,
      durationMs: roundDurationMs(input.seedDurationMs)
    },
    measurements: input.measurements,
    environment: input.environment
  };
}

export function buildLargeBenchmarkJson(result: LargeBenchmarkResult) {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function buildLargeBenchmarkMarkdown(result: LargeBenchmarkResult) {
  const rows = [
    ["getRepositoryPage", result.measurements.getRepositoryPage],
    ["getDashboardData", result.measurements.getDashboardData],
    ["RepoListView renderToStaticMarkup", result.measurements.repoListViewRenderToStaticMarkup]
  ] as const;

  return [
    "# RepoRadar Large Dataset Benchmark",
    "",
    `- Created: ${result.createdAt}`,
    `- Repositories seeded: ${result.size}`,
    `- SQLite database: \`${result.databasePath}\``,
    `- Seed duration: ${result.seed.durationMs} ms`,
    `- Node: ${result.environment.node} (${result.environment.platform}/${result.environment.arch})`,
    "",
    "| Measurement | Duration (ms) | Details |",
    "| --- | ---: | --- |",
    ...rows.map(([name, measurement]) => `| ${name} | ${measurement.durationMs} | ${formatMeasurementDetails(measurement.details)} |`),
    ""
  ].join("\n");
}

function parsePositiveInteger(value: string, optionName: string) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return Number(value);
}

function parseNonEmptyString(value: string, optionName: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${optionName} must not be empty.`);
  }

  return trimmed;
}

function readNextArg(argv: string[], index: number, optionName: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

function repositoryId(index: number) {
  return `benchmark_repo_${String(index + 1).padStart(6, "0")}`;
}

function assertValidSeedIndex(index: number) {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("Benchmark seed index must be a non-negative integer.");
  }
}

function buildBenchmarkMetrics(index: number, now: Date) {
  const stars = 1000 + ((index * 37) % 250_000);
  const forks = 10 + ((index * 11) % 20_000);
  const openIssues = index % 80;
  const ageDays = 7 + (index % 900);
  const ageMonths = Math.max(0, Math.floor(ageDays / 30));
  const isOldRepo = ageMonths >= 12 && index % 3 === 0;
  const growth7d = index % 11 === 0 ? null : 15 + ((index * 7) % 800);
  const growth24h = growth7d === null ? null : Math.max(0, Math.round(growth7d / 7));
  const previousStars = Math.max(1, stars - (growth7d ?? 0));
  const growthPercent7d = growth7d === null ? null : Number(((growth7d / previousStars) * 100).toFixed(2));
  const trendScore = 35 + ((index * 17) % 66);
  const relevanceScore = 45 + ((index * 13) % 56);
  const initialMomentumScore = 20 + ((index * 19) % 81);

  return {
    stars,
    forks,
    openIssues,
    ageMonths,
    isOldRepo,
    growth24h,
    growth7d,
    growthPercent7d,
    trendScore,
    relevanceScore,
    initialMomentumScore,
    createdAt: new Date(now.getTime() - ageDays * DAY_MS),
    pushedAt: index % 17 === 0 ? null : new Date(now.getTime() - (index % 30) * DAY_MS),
    firstSeenAt: new Date(now.getTime() - Math.min(ageDays, 21) * DAY_MS)
  };
}

function buildScoreBreakdown(metrics: ReturnType<typeof buildBenchmarkMetrics>) {
  return {
    absoluteGrowthPoints: metrics.growth7d === null ? 0 : Math.min(35, Math.round(metrics.growth7d / 25)),
    percentageGrowthPoints: metrics.growthPercent7d === null ? 0 : Math.min(20, Math.round(metrics.growthPercent7d)),
    agePoints: metrics.isOldRepo ? 2 : 8,
    totalStarsPoints: Math.min(8, Math.round(metrics.stars / 25_000)),
    forksPoints: Math.min(5, Math.round(metrics.forks / 4_000)),
    pushFreshnessPoints: metrics.pushedAt ? 8 : 0,
    topicRelevancePoints: 7,
    readmeQualityPoints: 4,
    keywordRelevancePoints: 3,
    initialMomentumPoints: metrics.initialMomentumScore,
    usedInitialMomentumFallback: metrics.growth7d === null
  };
}

function formatMeasurementDetails(details: BenchmarkMeasurementDetails) {
  const entries = Object.entries(details);
  if (!entries.length) {
    return "-";
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join("<br>");
}
