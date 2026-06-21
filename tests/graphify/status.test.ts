import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getGraphifyMaintenanceSummary } from "../../src/lib/graphify/status";

describe("getGraphifyMaintenanceSummary", () => {
  it("reports missing graphify output safely", async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "reporadar-graphify-missing-"));

    await expect(getGraphifyMaintenanceSummary(workspace)).resolves.toMatchObject({
      status: "missing",
      graphExists: false,
      nodeCount: 0
    });
  });

  it("reads local graph counts and inferred cache version", async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "reporadar-graphify-ready-"));
    const graphifyRoot = path.join(workspace, "graphify-out");
    await fs.mkdir(path.join(graphifyRoot, "cache", "ast", "v0.8.40"), { recursive: true });
    await fs.writeFile(
      path.join(graphifyRoot, "graph.json"),
      JSON.stringify({
        nodes: [{ id: "a", community: 1 }, { id: "b", community: 2 }],
        links: [{ source: "a", target: "b" }]
      })
    );
    await fs.writeFile(path.join(graphifyRoot, "manifest.json"), JSON.stringify({ "src/a.ts": {}, "src/b.ts": {} }));
    await fs.writeFile(path.join(graphifyRoot, "GRAPH_REPORT.md"), "# report");

    await expect(getGraphifyMaintenanceSummary(workspace)).resolves.toMatchObject({
      status: "ready",
      graphExists: true,
      nodeCount: 2,
      edgeCount: 1,
      communityCount: 2,
      manifestFileCount: 2,
      packageVersion: "v0.8.40"
    });
  });
});
