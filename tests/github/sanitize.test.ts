import { describe, expect, it } from "vitest";
import { sanitizeGitHubRepositoryUrl } from "../../src/lib/github/sanitize";
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

describe("sanitizeGitHubRepositoryUrl", () => {
  it("builds canonical GitHub repository URLs from full_name", () => {
    expect(sanitizeGitHubRepositoryUrl("openai/openai-cookbook")).toBe("https://github.com/openai/openai-cookbook");
  });

  it("returns only the canonical repository root URL", () => {
    expect(sanitizeGitHubRepositoryUrl("owner/toolkit")).toBe("https://github.com/owner/toolkit");
  });

  it("uses a neutral GitHub URL when full_name is malformed", () => {
    expect(sanitizeGitHubRepositoryUrl("bad full name")).toBe("https://github.com/");
    expect(sanitizeGitHubRepositoryUrl("owner/toolkit?x=y")).toBe("https://github.com/");
    expect(sanitizeGitHubRepositoryUrl("owner/toolkit#readme")).toBe("https://github.com/");
    expect(sanitizeGitHubRepositoryUrl({ fullName: "owner/toolkit" })).toBe("https://github.com/");
  });
});
