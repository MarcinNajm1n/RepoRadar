import { describe, expect, it } from "vitest";
import {
  BUILT_IN_REPOSITORY_FILTER_PRESETS,
  createSavedFilterPreset,
  parseSavedFilterPresets,
  serializeSavedFilterPresets
} from "../src/lib/repository-filter-presets";

describe("repository filter presets", () => {
  it("keeps built-in presets bounded and applicable", () => {
    expect(BUILT_IN_REPOSITORY_FILTER_PRESETS.map((preset) => preset.id)).toEqual([
      "ai-agents",
      "mcp",
      "high-growth",
      "old-active"
    ]);
    expect(BUILT_IN_REPOSITORY_FILTER_PRESETS.every((preset) => preset.status === "ALL")).toBe(true);
  });

  it("creates and serializes saved presets", () => {
    const preset = createSavedFilterPreset("MCP fast growth", {
      query: "mcp",
      status: "ALL",
      language: "TypeScript",
      profile: "MCP",
      minTrend: 75,
      sortKey: "growth7d_desc"
    });

    const parsed = parseSavedFilterPresets(serializeSavedFilterPresets([preset]));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      label: "MCP fast growth",
      query: "mcp",
      language: "TypeScript",
      profile: "MCP",
      minTrend: 75,
      sortKey: "growth7d_desc",
      isSaved: true
    });
  });

  it("ignores malformed persisted presets", () => {
    expect(parseSavedFilterPresets("not-json")).toEqual([]);
    expect(parseSavedFilterPresets(JSON.stringify([{ label: "missing id" }]))).toEqual([]);
  });
});
