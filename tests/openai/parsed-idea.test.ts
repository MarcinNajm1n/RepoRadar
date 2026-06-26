import { describe, expect, it } from "vitest";
import { sanitizeAiRating, sanitizeOptionalAiRating, sanitizeOptionalAiScore } from "../../src/lib/openai/parsed-idea";

describe("OpenAI idea numeric fields", () => {
  it("normalizes 1-5 rating values from JSON responses", () => {
    expect(sanitizeAiRating("4.6", 3)).toBe(5);
    expect(sanitizeAiRating(0, 3)).toBe(1);
    expect(sanitizeAiRating(99, 3)).toBe(5);
    expect(sanitizeAiRating("not-a-number", 2)).toBe(2);
  });

  it("keeps optional rating fields nullable when no valid value exists", () => {
    expect(sanitizeOptionalAiRating(undefined, null)).toBeNull();
    expect(sanitizeOptionalAiRating("2.4", null)).toBe(2);
    expect(sanitizeOptionalAiRating(Number.NaN, 6)).toBe(5);
  });

  it("normalizes optional 0-100 opportunity scores", () => {
    expect(sanitizeOptionalAiScore("88.7", null)).toBe(89);
    expect(sanitizeOptionalAiScore(-10, null)).toBe(0);
    expect(sanitizeOptionalAiScore("Infinity", 101)).toBe(100);
    expect(sanitizeOptionalAiScore({ score: 90 }, null)).toBeNull();
  });
});
