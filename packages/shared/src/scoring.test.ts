import { describe, expect, it } from "vitest";
import { isAnswerCorrect, normalizeAnswer, wordCountWithinLimit } from "./scoring";

describe("answer scoring", () => {
  it("normalizes case, repeated spaces, curly apostrophes, and hyphen spacing", () => {
    expect(normalizeAnswer("  Green   Park  ")).toBe("green park");
    expect(normalizeAnswer("John’s  car")).toBe("john's car");
    expect(normalizeAnswer("well - known")).toBe("well-known");
  });

  it("accepts answer aliases after normalization", () => {
    expect(isAnswerCorrect(" green park ", ["Green Park", "Park Green"])).toBe(true);
    expect(isAnswerCorrect("blue park", ["Green Park", "Park Green"])).toBe(false);
  });

  it("checks word limits before correctness", () => {
    expect(wordCountWithinLimit("green park", 2)).toBe(true);
    expect(wordCountWithinLimit("the green park", 2)).toBe(false);
  });
});
