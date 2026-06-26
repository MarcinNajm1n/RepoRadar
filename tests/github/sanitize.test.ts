import { describe, expect, it } from "vitest";
import {
  sanitizeGitHubCount,
  sanitizeGitHubDate,
  sanitizeGitHubRepositoryUrl,
  sanitizeOptionalGitHubDate
} from "../../src/lib/github/sanitize";
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

describe("sanitizeGitHubCount", () => {
  it("keeps non-negative finite integer counts", () => {
    expect(sanitizeGitHubCount(42.8)).toBe(42);
    expect(sanitizeGitHubCount("7")).toBe(7);
  });

  it("falls back for blank, negative and non-finite counts", () => {
    expect(sanitizeGitHubCount("", 3)).toBe(3);
    expect(sanitizeGitHubCount("Infinity", 3)).toBe(3);
    expect(sanitizeGitHubCount(Number.NaN, 3)).toBe(3);
    expect(sanitizeGitHubCount(-5)).toBe(0);
    expect(sanitizeGitHubCount(3_000_000_000)).toBe(2_147_483_647);
  });
});

describe("sanitizeGitHubDate", () => {
  it("keeps valid GitHub date strings", () => {
    expect(sanitizeGitHubDate("2026-06-01T00:00:00Z", new Date("2026-01-01T00:00:00Z")).toISOString()).toBe(
      "2026-06-01T00:00:00.000Z"
    );
  });

  it("uses fallbacks for invalid required dates and null for invalid optional dates", () => {
    const fallback = new Date("2026-01-01T00:00:00Z");

    expect(sanitizeGitHubDate("not-a-date", fallback)).toBe(fallback);
    expect(sanitizeGitHubDate("2026-06-01", fallback)).toBe(fallback);
    expect(sanitizeGitHubDate("2026-02-30T00:00:00Z", fallback)).toBe(fallback);
    expect(sanitizeOptionalGitHubDate("not-a-date")).toBeNull();
    expect(sanitizeOptionalGitHubDate(null)).toBeNull();
  });

  it("rejects GitHub dates after the current scan time", () => {
    const fallback = new Date("2026-06-01T00:00:00Z");
    const now = new Date("2026-06-10T00:00:00Z");

    expect(sanitizeGitHubDate("2026-06-11T00:00:00Z", fallback, now)).toBe(fallback);
    expect(sanitizeOptionalGitHubDate("2026-06-11T00:00:00Z", now)).toBeNull();
  });
});
