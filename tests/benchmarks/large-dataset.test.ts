import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBenchmarkBatches,
  buildBenchmarkRepositorySeed,
  buildBenchmarkRepositorySeedBatch,
  buildBenchmarkSnapshotSeed,
  buildLargeBenchmarkJson,
  buildLargeBenchmarkMarkdown,
  buildLargeBenchmarkPaths,
  buildLargeBenchmarkResult,
  DEFAULT_LARGE_BENCHMARK_SIZE,
  isBenchmarkOutputDirectoryAllowed,
  isPathInsideDirectory,
  LARGE_BENCHMARK_BATCH_SIZE,
  parseLargeBenchmarkArgs,
  toSqliteDatabaseUrl
} from "../../src/lib/benchmarks/large-dataset";

const now = new Date("2026-06-25T12:00:00.000Z");

function resultFixture() {
  return buildLargeBenchmarkResult({
    createdAt: now.toISOString(),
    size: 200,
    databasePath: "test-results/benchmarks/large-dataset.sqlite",
    jsonPath: "test-results/benchmarks/large-dataset.json",
    markdownPath: "test-results/benchmarks/large-dataset.md",
    seedDurationMs: 12.345,
    environment: {
      node: "v24.0.0",
      platform: "win32",
      arch: "x64"
    },
    measurements: {
      getRepositoryPage: {
        durationMs: 3.21,
        details: {
          returnedItems: 200,
          total: 200,
          hasMore: false
        }
      },
      getDashboardData: {
        durationMs: 4.56,
        details: {
          repositories: 100,
          repositoryPageTotal: 200,
          countAll: 200
        }
      },
      repoListViewRenderToStaticMarkup: {
        durationMs: 7.89,
        details: {
          renderedRepositories: 200,
          markupLength: 12345
        }
      }
    }
  });
}

describe("parseLargeBenchmarkArgs", () => {
  it("uses the default large dataset size", () => {
    expect(parseLargeBenchmarkArgs([])).toMatchObject({
      size: DEFAULT_LARGE_BENCHMARK_SIZE,
      outputDir: path.join("test-results", "benchmarks"),
      outputPath: null,
      help: false
    });
  });

  it("supports smoke size and custom output directory flags", () => {
    expect(parseLargeBenchmarkArgs(["--size=200", "--output-dir", "tmp/bench"])).toMatchObject({
      size: 200,
      outputDir: "tmp/bench"
    });
    expect(parseLargeBenchmarkArgs(["--size", "201", "--output-dir=tmp/benchmarks"]).size).toBe(201);
    expect(parseLargeBenchmarkArgs(["--output=test-results/benchmarks/smoke.json"]).outputPath).toBe("test-results/benchmarks/smoke.json");
  });

  it("rejects invalid arguments", () => {
    expect(() => parseLargeBenchmarkArgs(["--size=0"])).toThrow("--size must be a positive integer");
    expect(() => parseLargeBenchmarkArgs(["--size=2.5"])).toThrow("--size must be a positive integer");
    expect(() => parseLargeBenchmarkArgs(["--unknown"])).toThrow("Unknown benchmark argument");
  });
});

describe("large benchmark paths", () => {
  it("builds isolated SQLite and report paths under the output directory", () => {
    const paths = buildLargeBenchmarkPaths({
      outputDir: "test-results/benchmarks",
      timestamp: now,
      cwd: "C:/repo"
    });

    expect(paths.outputDir).toBe(path.resolve("C:/repo", "test-results/benchmarks"));
    expect(paths.databasePath).toContain("large-dataset-2026-06-25T12-00-00-000Z.sqlite");
    expect(paths.jsonPath).toContain("large-dataset-2026-06-25T12-00-00-000Z.json");
    expect(paths.markdownPath).toContain("large-dataset-2026-06-25T12-00-00-000Z.md");
    expect(toSqliteDatabaseUrl(paths.databasePath, path.resolve("C:/repo", "prisma"))).toBe(
      "file:../test-results/benchmarks/large-dataset-2026-06-25T12-00-00-000Z.sqlite"
    );

    const explicitOutput = buildLargeBenchmarkPaths({
      outputPath: "test-results/benchmarks/smoke.json",
      timestamp: now,
      cwd: "C:/repo"
    });

    expect(explicitOutput.jsonPath).toBe(path.resolve("C:/repo", "test-results/benchmarks/smoke.json"));
    expect(explicitOutput.markdownPath).toBe(path.resolve("C:/repo", "test-results/benchmarks/smoke.md"));
    expect(explicitOutput.databasePath).toBe(path.resolve("C:/repo", "test-results/benchmarks/smoke.sqlite"));
    expect(() => buildLargeBenchmarkPaths({ outputPath: "test-results/benchmarks/smoke.md" })).toThrow("--output must point to a .json file");
  });

  it("checks artifact containment with resolved directories", () => {
    const parent = path.resolve("C:/repo", "test-results");

    expect(isBenchmarkOutputDirectoryAllowed("test-results/benchmarks", "C:/repo")).toBe(true);
    expect(isBenchmarkOutputDirectoryAllowed("tmp/bench", "C:/repo")).toBe(false);
    expect(isBenchmarkOutputDirectoryAllowed("../outside", "C:/repo")).toBe(false);
    expect(isPathInsideDirectory(path.resolve("C:/repo", "test-results", "benchmarks"), parent)).toBe(true);
    expect(isPathInsideDirectory(path.resolve("C:/repo", "test-results"), parent)).toBe(true);
    expect(isPathInsideDirectory(path.resolve("C:/repo", "outside"), parent)).toBe(false);
  });

  it("splits seed work into bounded batches", () => {
    expect(buildBenchmarkBatches(200, 75)).toEqual([
      { start: 0, count: 75 },
      { start: 75, count: 75 },
      { start: 150, count: 50 }
    ]);
    expect(buildBenchmarkBatches(5000)).toHaveLength(5000 / LARGE_BENCHMARK_BATCH_SIZE);
  });
});

describe("large benchmark seed helpers", () => {
  it("creates deterministic repository and snapshot fixtures", () => {
    const repository = buildBenchmarkRepositorySeed(2, now);
    const snapshot = buildBenchmarkSnapshotSeed(2, now);

    expect(repository).toMatchObject({
      id: "benchmark_repo_000003",
      githubId: 100000002,
      fullName: "benchmark-owner-02/benchmark-repo-00003",
      source: "benchmark",
      isDeletedFromView: false
    });
    expect(JSON.parse(repository.topicsJson)).toContain("mcp");
    expect(JSON.parse(repository.discoveryProfilesJson)).toHaveLength(2);
    expect(snapshot).toMatchObject({
      id: "benchmark_snapshot_000003",
      repoId: repository.id,
      stars: repository.starsCurrent,
      growth7d: repository.growth7d
    });
  });

  it("creates small fixture batches without touching the database", () => {
    const batch = buildBenchmarkRepositorySeedBatch(10, 3, now);

    expect(batch.map((repo) => repo.id)).toEqual(["benchmark_repo_000011", "benchmark_repo_000012", "benchmark_repo_000013"]);
  });
});

describe("large benchmark output", () => {
  it("builds stable JSON and Markdown result shapes", () => {
    const result = resultFixture();
    const json = JSON.parse(buildLargeBenchmarkJson(result));
    const markdown = buildLargeBenchmarkMarkdown(result);

    expect(json).toMatchObject({
      benchmark: "large-dataset",
      size: 200,
      seed: {
        repositories: 200,
        snapshots: 200,
        batchSize: LARGE_BENCHMARK_BATCH_SIZE,
        durationMs: 12.35
      },
      measurements: {
        getRepositoryPage: {
          durationMs: 3.21
        }
      }
    });
    expect(markdown).toContain("# RepoRadar Large Dataset Benchmark");
    expect(markdown).toContain("| getRepositoryPage | 3.21 |");
    expect(markdown).toContain("RepoListView renderToStaticMarkup");
  });
});
