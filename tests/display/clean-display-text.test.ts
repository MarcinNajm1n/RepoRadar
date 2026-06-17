import { describe, expect, it } from "vitest";
import { cleanDisplayText } from "../../src/lib/display/clean-display-text";

describe("cleanDisplayText", () => {
  it("strips html and decodes common entities", () => {
    expect(cleanDisplayText("<p>AI &amp; devtools&nbsp;<strong>signal</strong></p>")).toBe("AI & devtools signal");
  });

  it("removes markdown link syntax for plain text display", () => {
    expect(cleanDisplayText("Read [the docs](https://example.com) and `install` it")).toBe("Read the docs and install it");
  });

  it("truncates long text and handles empty values", () => {
    expect(cleanDisplayText("a".repeat(20), { maxLength: 8 })).toHaveLength(8);
    expect(cleanDisplayText(null, { fallback: "Brak danych" })).toBe("Brak danych");
    expect(cleanDisplayText(undefined)).toBe("");
  });
});
