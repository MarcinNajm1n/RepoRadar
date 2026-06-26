import { describe, expect, it } from "vitest";
import { parseStoredStringArray, sanitizeStoredStringArray } from "../src/lib/stored-json";

describe("stored JSON string arrays", () => {
  it("sanitizes parsed string arrays from local JSON columns", () => {
    const result = parseStoredStringArray(JSON.stringify([" ai ", 42, { label: "bad" }, "mcp\u0000tools"]));

    expect(result).toEqual(["ai", "mcptools"]);
  });

  it("falls back for invalid JSON and limits array length", () => {
    expect(parseStoredStringArray("{bad")).toEqual([]);
    expect(parseStoredStringArray(JSON.stringify(["a", "b", "c"]), 2)).toEqual(["a", "b"]);
  });

  it("sanitizes runtime arrays before storing them again", () => {
    expect(sanitizeStoredStringArray(["source_1", null, ["bad"], "source\u0001two"])).toEqual(["source_1", "source two"]);
  });
});
