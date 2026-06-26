import { describe, expect, it } from "vitest";
import {
  parseStoredNumberRecord,
  parseStoredStringArray,
  sanitizeStoredNumberRecord,
  sanitizeStoredStringArray,
  stringifyStoredNumberRecord,
  stringifyStoredStringArray
} from "../src/lib/stored-json";

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

  it("stringifies sanitized string arrays for JSON columns", () => {
    expect(stringifyStoredStringArray([" source_1 ", null, ["bad"], "source\u0001two"])).toBe(
      JSON.stringify(["source_1", "source two"])
    );
  });

  it("sanitizes numeric records from local JSON columns", () => {
    const result = parseStoredNumberRecord(
      JSON.stringify({
        demand: 82,
        "risk\u0001score": 33,
        ignoredString: "90",
        ignoredObject: { value: 10 },
        below: -5,
        above: 150
      }),
      { min: 0, max: 100 }
    );

    expect(result).toEqual({
      demand: 82,
      "risk score": 33,
      below: 0,
      above: 100
    });
  });

  it("ignores non-record numeric payloads", () => {
    expect(parseStoredNumberRecord("[1,2,3]")).toEqual({});
    expect(sanitizeStoredNumberRecord(null)).toEqual({});
  });

  it("stringifies sanitized numeric records for JSON columns", () => {
    expect(stringifyStoredNumberRecord({ demand: 82, ignored: "90", above: 150 }, { min: 0, max: 100 })).toBe(
      JSON.stringify({ demand: 82, above: 100 })
    );
  });
});
