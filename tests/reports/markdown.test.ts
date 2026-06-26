import { describe, expect, it } from "vitest";
import { markdownLink } from "../../src/lib/reports/markdown";

describe("markdownLink", () => {
  it("escapes link labels and parentheses in URLs", () => {
    expect(markdownLink("owner/[repo\\]name", "https://github.com/owner/repo(path)")).toBe(
      "[owner/\\[repo\\\\\\]name](https://github.com/owner/repo%28path%29)"
    );
  });

  it("falls back to a neutral URL when the target is invalid", () => {
    expect(markdownLink("owner/tool", "javascript:alert(1)")).toBe("[owner/tool](https://github.com/)");
  });
});
