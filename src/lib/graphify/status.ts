import fs from "node:fs/promises";
import path from "node:path";
import type { GraphifyMaintenanceSummary } from "@/types/repository";

type GraphJson = {
  nodes?: Array<{ community?: string | number | null }>;
  links?: unknown[];
  edges?: unknown[];
};

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function fileStats(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function inferAstCacheVersion(graphifyRoot: string) {
  try {
    const astCacheRoot = path.join(graphifyRoot, "cache", "ast");
    const entries = await fs.readdir(astCacheRoot, { withFileTypes: true });
    return entries.find((entry) => entry.isDirectory() && /^v?\d+\.\d+\.\d+/.test(entry.name))?.name ?? null;
  } catch {
    return null;
  }
}

async function readLocalSkillVersion(workspaceRoot: string) {
  const candidates = [
    path.join(workspaceRoot, ".agents", "skills", "graphify", "SKILL.md"),
    path.join(workspaceRoot, ".codex", "skills", "graphify", "SKILL.md")
  ];

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate, "utf8");
      const versionMatch = content.match(/^version:\s*["']?([^"'\n]+)["']?/m);
      return {
        path: path.relative(workspaceRoot, candidate).replace(/\\/g, "/"),
        version: versionMatch?.[1]?.trim() ?? "local"
      };
    } catch {
      // Try next local skill location.
    }
  }

  return { path: null, version: null };
}

export async function getGraphifyMaintenanceSummary(workspaceRoot = process.cwd()): Promise<GraphifyMaintenanceSummary> {
  const graphifyRoot = path.join(workspaceRoot, "graphify-out");
  const graphPath = path.join(graphifyRoot, "graph.json");
  const reportPath = path.join(graphifyRoot, "GRAPH_REPORT.md");
  const manifestPath = path.join(graphifyRoot, "manifest.json");
  const [graphStats, reportStats, manifestStats, graph, manifest, astCacheVersion, localSkill] = await Promise.all([
    fileStats(graphPath),
    fileStats(reportPath),
    fileStats(manifestPath),
    readJson<GraphJson>(graphPath),
    readJson<Record<string, unknown>>(manifestPath),
    inferAstCacheVersion(graphifyRoot),
    readLocalSkillVersion(workspaceRoot)
  ]);

  if (!graphStats && !reportStats && !manifestStats) {
    return {
      status: "missing",
      graphExists: false,
      nodeCount: 0,
      edgeCount: 0,
      communityCount: 0,
      manifestFileCount: 0,
      graphSizeBytes: 0,
      reportSizeBytes: 0,
      lastUpdatedAt: null,
      packageVersion: astCacheVersion,
      skillVersion: localSkill.version,
      skillPath: localSkill.path,
      note: "Brak graphify-out w katalogu projektu."
    };
  }

  const nodes = graph?.nodes ?? [];
  const edgeCount = graph?.links?.length ?? graph?.edges?.length ?? 0;
  const communities = new Set(nodes.map((node) => node.community).filter((community) => community !== null && community !== undefined));
  const lastUpdatedMs = Math.max(graphStats?.mtimeMs ?? 0, reportStats?.mtimeMs ?? 0, manifestStats?.mtimeMs ?? 0);

  return {
    status: graphStats && graph ? "ready" : "partial",
    graphExists: Boolean(graphStats),
    nodeCount: nodes.length,
    edgeCount,
    communityCount: communities.size,
    manifestFileCount: manifest ? Object.keys(manifest).length : 0,
    graphSizeBytes: graphStats?.size ?? 0,
    reportSizeBytes: reportStats?.size ?? 0,
    lastUpdatedAt: lastUpdatedMs ? new Date(lastUpdatedMs).toISOString() : null,
    packageVersion: astCacheVersion,
    skillVersion: localSkill.version,
    skillPath: localSkill.path,
    note: graphStats && graph ? "Graphify graph jest dostepny lokalnie." : "Graphify graph jest niepelny albo nieczytelny."
  };
}
