import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PrismaClient } from "@prisma/client";
import {
  buildBenchmarkBatches,
  buildBenchmarkRepositorySeedBatch,
  buildBenchmarkSnapshotSeedBatch,
  buildLargeBenchmarkJson,
  buildLargeBenchmarkMarkdown,
  buildLargeBenchmarkPaths,
  buildLargeBenchmarkResult,
  getLargeBenchmarkHelp,
  isBenchmarkOutputDirectoryAllowed,
  isPathInsideDirectory,
  LARGE_BENCHMARK_PAGE_SIZE,
  parseLargeBenchmarkArgs,
  roundDurationMs,
  toSqliteDatabaseUrl
} from "../src/lib/benchmarks/large-dataset";
import type { LargeBenchmarkResult } from "../src/lib/benchmarks/large-dataset";
import type { RepositoryListItem } from "../src/types/repository";

function noop() {}

function noopRepo(repo: RepositoryListItem) {
  void repo;
}

async function main() {
  const options = parseLargeBenchmarkArgs(process.argv.slice(2));
  if (options.help) {
    console.log(getLargeBenchmarkHelp());
    return;
  }

  const startedAt = new Date();
  const paths = buildLargeBenchmarkPaths({ outputDir: options.outputDir, outputPath: options.outputPath, timestamp: startedAt });
  const databaseUrl = toSqliteDatabaseUrl(paths.databasePath);

  await ensureBenchmarkOutputDirectory(paths.outputDir);
  await assertBenchmarkArtifactRealPaths(paths);
  await removePreviousBenchmarkArtifacts(paths);
  configureIsolatedEnvironment(databaseUrl);

  console.log(`RepoRadar large benchmark: seeding ${options.size} repositories.`);
  console.log(`SQLite database: ${paths.databasePath}`);

  const { prisma } = await import("../src/lib/db/client");
  try {
    await applyLocalPrismaMigrations(prisma);
    const seedDurationMs = await seedBenchmarkDatabase(prisma, options.size, startedAt);
    const measurements = await runMeasurements(options.size);

    const result = buildLargeBenchmarkResult({
      createdAt: startedAt.toISOString(),
      size: options.size,
      databasePath: paths.databasePath,
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
      seedDurationMs,
      measurements,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });

    await fs.writeFile(paths.jsonPath, buildLargeBenchmarkJson(result), "utf8");
    await fs.writeFile(paths.markdownPath, buildLargeBenchmarkMarkdown(result), "utf8");

    console.log(`Results JSON: ${paths.jsonPath}`);
    console.log(`Results Markdown: ${paths.markdownPath}`);
    console.log(`getRepositoryPage: ${result.measurements.getRepositoryPage.durationMs} ms`);
    console.log(`getDashboardData: ${result.measurements.getDashboardData.durationMs} ms`);
    console.log(`RepoListView renderToStaticMarkup: ${result.measurements.repoListViewRenderToStaticMarkup.durationMs} ms`);
  } finally {
    await prisma.$disconnect();
  }
}

function configureIsolatedEnvironment(databaseUrl: string) {
  process.env.DATABASE_URL = databaseUrl;
  delete process.env.GITHUB_TOKEN;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DISCORD_WEBHOOK_URL;
  process.env.MARKET_RESEARCH_ENABLED = "false";
  process.env.ENABLE_AUTO_OPPORTUNITY_RESEARCH = "false";
  process.env.ENABLE_NOTIFICATIONS = "false";
  process.env.ENABLE_WINDOWS_NOTIFICATIONS = "false";
  process.env.CHECKPOINT_DISABLE = "1";
  process.env.PRISMA_HIDE_UPDATE_MESSAGE = "1";
}

function assertBenchmarkOutputPath(outputDir: string) {
  if (!isBenchmarkOutputDirectoryAllowed(outputDir)) {
    throw new Error("Benchmark output must stay under test-results/ so generated SQLite, JSON, and Markdown files remain ignored.");
  }
}

async function ensureBenchmarkOutputDirectory(outputDir: string) {
  assertBenchmarkOutputPath(outputDir);

  const testResultsDir = path.resolve(process.cwd(), "test-results");
  await fs.mkdir(testResultsDir, { recursive: true });
  const realTestResultsDir = await fs.realpath(testResultsDir);
  const resolvedOutputDir = path.resolve(outputDir);
  const relativeOutput = path.relative(testResultsDir, resolvedOutputDir);
  const segments = relativeOutput ? relativeOutput.split(path.sep).filter(Boolean) : [];
  let currentDir = testResultsDir;

  for (const segment of segments) {
    currentDir = path.join(currentDir, segment);

    try {
      await fs.lstat(currentDir);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }

      await fs.mkdir(currentDir);
    }

    const realCurrentDir = await fs.realpath(currentDir);
    if (!isPathInsideDirectory(realCurrentDir, realTestResultsDir)) {
      throw new Error("Benchmark output directory must resolve inside test-results/; refusing to write through a symlink or junction.");
    }
  }
}

async function assertBenchmarkArtifactRealPaths(paths: { outputDir: string; databasePath: string; jsonPath: string; markdownPath: string }) {
  const testResultsDir = path.resolve(process.cwd(), "test-results");
  const realTestResultsDir = await fs.realpath(testResultsDir);
  const artifactPaths = [paths.databasePath, paths.jsonPath, paths.markdownPath];

  for (const artifactPath of artifactPaths) {
    const artifactParent = path.dirname(path.resolve(artifactPath));
    const realArtifactParent = await fs.realpath(artifactParent);

    if (!isPathInsideDirectory(realArtifactParent, realTestResultsDir)) {
      throw new Error("Benchmark artifacts must resolve inside test-results/; refusing to remove or write outside the ignored benchmark directory.");
    }
  }
}

async function removePreviousBenchmarkArtifacts(paths: { databasePath: string; jsonPath: string; markdownPath: string }) {
  await Promise.all(
    [paths.databasePath, `${paths.databasePath}-journal`, `${paths.databasePath}-wal`, `${paths.databasePath}-shm`, paths.jsonPath, paths.markdownPath].map((filePath) =>
      fs.rm(filePath, { force: true })
    )
  );
}

async function applyLocalPrismaMigrations(prisma: PrismaClient) {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const migrationDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationDir of migrationDirs) {
    const sql = await fs.readFile(path.join(migrationsDir, migrationDir, "migration.sql"), "utf8");
    for (const statement of splitSqlStatements(sql)) {
      await prisma.$executeRawUnsafe(statement);
    }
  }
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) =>
      statement
        .split(/\r?\n/)
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

async function seedBenchmarkDatabase(prisma: PrismaClient, size: number, now: Date) {
  const started = performance.now();
  const batches = buildBenchmarkBatches(size);

  await prisma.scanRun.create({
    data: {
      id: "benchmark_scan_run",
      startedAt: new Date(now.getTime() - 5 * 60 * 1000),
      finishedAt: now,
      status: "SUCCESS",
      reposFound: size,
      reposUpdated: size
    }
  });

  for (const batch of batches) {
    await prisma.repository.createMany({
      data: buildBenchmarkRepositorySeedBatch(batch.start, batch.count, now)
    });
    await prisma.repoSnapshot.createMany({
      data: buildBenchmarkSnapshotSeedBatch(batch.start, batch.count, now)
    });
  }

  return roundDurationMs(performance.now() - started);
}

async function runMeasurements(size: number): Promise<LargeBenchmarkResult["measurements"]> {
  const [{ getDashboardData, getRepositoryPage }, { RepoListView }] = await Promise.all([
    import("../src/lib/db/repositories"),
    import("../src/components/repo-radar/repo-list-view")
  ]);

  const repositoryPage = await measure("getRepositoryPage", async () =>
    getRepositoryPage({ page: 1, pageSize: LARGE_BENCHMARK_PAGE_SIZE, sortKey: "trend_desc" })
  );
  const dashboardData = await measure("getDashboardData", getDashboardData);
  const render = await measure("RepoListView renderToStaticMarkup", async () =>
    renderToStaticMarkup(
      React.createElement(RepoListView, {
        repositories: repositoryPage.value.items,
        filterBar: React.createElement("div", { "data-benchmark-filter": true }),
        totalCount: repositoryPage.value.total,
        hasMore: repositoryPage.value.hasMore,
        onLoadMore: noop,
        expandedRepoId: null,
        timelines: {},
        loadingTimelineRepoId: null,
        decisionContexts: {},
        loadingDecisionContextRepoId: null,
        decisionContextErrors: {},
        selectedCompareRepoIds: [],
        showInbox: false,
        hasActiveFilters: false,
        isLoading: false,
        isPending: false,
        onRunScan: noop,
        onResetFilters: noop,
        onToggleCompare: noop,
        onRemoveCompare: noop,
        onClearCompare: noop,
        callbacks: buildNoopCallbacks()
      })
    )
  );

  return {
    getRepositoryPage: {
      durationMs: repositoryPage.durationMs,
      details: {
        requestedPageSize: LARGE_BENCHMARK_PAGE_SIZE,
        returnedItems: repositoryPage.value.items.length,
        total: repositoryPage.value.total,
        hasMore: repositoryPage.value.hasMore
      }
    },
    getDashboardData: {
      durationMs: dashboardData.durationMs,
      details: {
        repositories: dashboardData.value.repositories.length,
        repositoryPageTotal: dashboardData.value.repositoryPage.total,
        countAll: dashboardData.value.counts.all,
        expectedSeedSize: size
      }
    },
    repoListViewRenderToStaticMarkup: {
      durationMs: render.durationMs,
      details: {
        renderedRepositories: repositoryPage.value.items.length,
        markupLength: render.value.length
      }
    }
  };
}

function buildNoopCallbacks() {
  return {
    onToggle: noop,
    onOpenReport: noop,
    onRegenerateReport: noop,
    onSave: noop,
    onMarkRead: noop,
    onOpenQuickBrief: noop,
    onGenerateIdea: noop,
    onResearch: noop,
    onAddInboxTask: noopRepo,
    onAddCloneTask: noopRepo,
    onAddDemoTask: noopRepo,
    onValidateMarket: noopRepo,
    onIgnore: noop
  };
}

async function measure<T>(label: string, operation: () => Promise<T> | T): Promise<{ value: T; durationMs: number }> {
  const started = performance.now();
  const value = await operation();
  const durationMs = roundDurationMs(performance.now() - started);
  console.log(`${label}: ${durationMs} ms`);
  return { value, durationMs };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
