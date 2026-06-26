import { describe, expect, it } from "vitest";
import { sanitizeExternalStringArray, sanitizeExternalText, sanitizeExternalUrl } from "../../src/lib/utils";

describe("sanitizeExternalText", () => {
  it("removes malformed escape-like text and control characters before database writes", () => {
    const result = sanitizeExternalText("agent\\x workflow\u0000 with bad\\u escape", 200);

    expect(result).toBe("agent/x workflow with bad/u escape");
  });

  it("limits external text length", () => {
    const result = sanitizeExternalText("a".repeat(100), 10);

    expect(result).toHaveLength(10);
  });

  it("ignores non-string runtime payloads", () => {
    expect(sanitizeExternalText(123)).toBeNull();
    expect(sanitizeExternalText({ text: "ai" })).toBeNull();
  });
});

describe("sanitizeExternalStringArray", () => {
  it("sanitizes and limits topic arrays", () => {
    const result = sanitizeExternalStringArray(["ai", "bad\\x", ""], 2);

    expect(result).toEqual(["ai", "bad/x"]);
  });

  it("ignores non-array and non-string runtime payloads", () => {
    expect(sanitizeExternalStringArray("ai")).toEqual([]);
    expect(sanitizeExternalStringArray(["ai", 42, null, "mcp"])).toEqual(["ai", "mcp"]);
  });
});

describe("sanitizeExternalUrl", () => {
  it("allows only http and https URLs", () => {
    expect(sanitizeExternalUrl("https://github.com/openai/openai")).toBe("https://github.com/openai/openai");
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalUrl("not a url")).toBeNull();
    expect(sanitizeExternalUrl({ href: "https://github.com/openai/openai" })).toBeNull();
  });
});
