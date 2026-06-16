import { describe, expect, it } from "vitest";
import {
  parseBooleanSetting,
  parseJsonSetting,
  parseNumberSetting,
  parseStringSetting
} from "../../src/lib/db/settings";

describe("typed setting parsers", () => {
  it("parses boolean values with fallback", () => {
    expect(parseBooleanSetting("true", false)).toBe(true);
    expect(parseBooleanSetting("0", true)).toBe(false);
    expect(parseBooleanSetting("unknown", true)).toBe(true);
  });

  it("parses numbers with fallback", () => {
    expect(parseNumberSetting("42", 0)).toBe(42);
    expect(parseNumberSetting("bad", 7)).toBe(7);
  });

  it("parses strings with fallback", () => {
    expect(parseStringSetting("  value  ", "fallback")).toBe("value");
    expect(parseStringSetting("", "fallback")).toBe("fallback");
  });

  it("parses json with fallback", () => {
    expect(parseJsonSetting('{"limit":5}', { limit: 1 })).toEqual({ limit: 5 });
    expect(parseJsonSetting("{bad", { limit: 1 })).toEqual({ limit: 1 });
  });
});
