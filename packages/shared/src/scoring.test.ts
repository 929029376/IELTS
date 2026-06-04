import { describe, expect, it } from "vitest";
import { isAnswerCorrect, normalizeAnswer, wordCountWithinLimit } from "./scoring";

describe("answer scoring", () => {
  it("normalizes case, repeated spaces, curly apostrophes, and hyphen spacing", () => {
    expect(normalizeAnswer("  Green   Park  ")).toBe("green park");
    expect(normalizeAnswer("Ｇｒｅｅｎ　Ｐａｒｋ")).toBe("green park");
    expect(normalizeAnswer("２４")).toBe("24");
    expect(normalizeAnswer("John’s  car")).toBe("john's car");
    expect(normalizeAnswer("well - known")).toBe("well-known");
    expect(normalizeAnswer("well–known")).toBe("well-known");
  });

  it("accepts answer aliases after normalization", () => {
    expect(isAnswerCorrect(" green park ", ["Green Park", "Park Green"])).toBe(true);
    expect(isAnswerCorrect("green park", ["Ｇｒｅｅｎ Ｐａｒｋ"])).toBe(true);
    expect(isAnswerCorrect("24", ["２４"])).toBe(true);
    expect(isAnswerCorrect("blue park", ["Green Park", "Park Green"])).toBe(false);
  });

  it("expands imported multi-answer cells separated by semicolons, pipes, or or", () => {
    expect(isAnswerCorrect("green parks", ["green park; green parks"])).toBe(true);
    expect(isAnswerCorrect("green parks", ["green park；green parks"])).toBe(true);
    expect(isAnswerCorrect("green parks", ["green park、green parks"])).toBe(true);
    expect(isAnswerCorrect("green parks", ["green park | green parks"])).toBe(true);
    expect(isAnswerCorrect("green parks", ["green park or green parks"])).toBe(true);
    expect(isAnswerCorrect("green parks", ["green park 或 green parks"])).toBe(true);
    expect(isAnswerCorrect("green parks", ["green park\ngreen parks"])).toBe(true);
    expect(isAnswerCorrect("blue park", ["green park; green parks"])).toBe(false);
  });

  it("ignores surrounding punctuation copied from imported answer text", () => {
    expect(isAnswerCorrect("green park", ["green park."])).toBe(true);
    expect(isAnswerCorrect("green park.", ["green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["green park。"])).toBe(true);
    expect(isAnswerCorrect("green park", ["，green park，"])).toBe(true);
    expect(isAnswerCorrect("st. john's", ["St. John's."])).toBe(true);
  });

  it("ignores surrounding quotes copied from imported answer text", () => {
    expect(isAnswerCorrect("green park", ['"green park"'])).toBe(true);
    expect(isAnswerCorrect("green park", ["“green park”"])).toBe(true);
    expect(isAnswerCorrect("john's car", ["‘John’s car’"])).toBe(true);
  });

  it("ignores imported answer numbering prefixes without stripping numeric answers", () => {
    expect(isAnswerCorrect("green park", ["1. green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["(1) green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["Q1: green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["Q1：green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["1、green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["1．green park"])).toBe(true);
    expect(isAnswerCorrect("3.5 million", ["3.5 million"])).toBe(true);
    expect(isAnswerCorrect("3:30 pm", ["3:30 pm"])).toBe(true);
    expect(isAnswerCorrect("million", ["3.5 million"])).toBe(false);
  });

  it("ignores imported answer label prefixes", () => {
    expect(isAnswerCorrect("green park", ["Answer: green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["Ans. green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["答案：green park"])).toBe(true);
    expect(isAnswerCorrect("answer", ["answer"])).toBe(true);
  });

  it("ignores surrounding parentheses copied with answer text", () => {
    expect(isAnswerCorrect("(green park)", ["green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["(green park)"])).toBe(true);
  });

  it("matches imported unicode dash answers with typed hyphen answers", () => {
    expect(isAnswerCorrect("well-known", ["well–known"])).toBe(true);
    expect(isAnswerCorrect("well known", ["well–known"])).toBe(false);
  });

  it("expands slash-separated aliases in accepted answers", () => {
    expect(isAnswerCorrect("center", ["centre/center"])).toBe(true);
    expect(isAnswerCorrect("centre", ["centre/center"])).toBe(true);
    expect(isAnswerCorrect("center", ["centre／center"])).toBe(true);
    expect(isAnswerCorrect("center", ["centre / center"])).toBe(true);
    expect(isAnswerCorrect("city center", ["city centre / city center"])).toBe(true);
    expect(isAnswerCorrect("city center", ["city centre ／ city center"])).toBe(true);
    expect(isAnswerCorrect("central", ["centre/center"])).toBe(false);
  });

  it("keeps numeric slash tokens as whole accepted answers", () => {
    expect(isAnswerCorrect("10/12/2024", ["10/12/2024"])).toBe(true);
    expect(isAnswerCorrect("10", ["10/12/2024"])).toBe(false);
  });

  it("expands optional parenthesized words in accepted answers", () => {
    expect(isAnswerCorrect("green park", ["(the) green park"])).toBe(true);
    expect(isAnswerCorrect("the green park", ["(the) green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["（the） green park"])).toBe(true);
    expect(isAnswerCorrect("green park", ["(the) green park(s)"])).toBe(true);
    expect(isAnswerCorrect("the green parks", ["(the) green park(s)"])).toBe(true);
    expect(isAnswerCorrect("the green parks", ["（the） green park（s）"])).toBe(true);
    expect(isAnswerCorrect("a green park", ["(the) green park"])).toBe(false);
  });

  it("checks word limits before correctness", () => {
    expect(wordCountWithinLimit("green park", 2)).toBe(true);
    expect(wordCountWithinLimit("the green park", 2)).toBe(false);
  });

  it("allows a number outside the word count when the IELTS rule permits it", () => {
    expect(wordCountWithinLimit("green park 24", 2, { allowNumber: true })).toBe(true);
    expect(wordCountWithinLimit("green park station", 2, { allowNumber: true })).toBe(false);
    expect(isAnswerCorrect("green park 24", ["green park 24"], { allowNumber: true, maxWords: 2 })).toBe(true);
  });

  it("can score multiple-choice letter answers without requiring order", () => {
    expect(isAnswerCorrect("C A", ["A C"], { unorderedChoices: true })).toBe(true);
    expect(isAnswerCorrect("C A", ["AC"], { unorderedChoices: true })).toBe(true);
    expect(isAnswerCorrect("A & C", ["AC"], { unorderedChoices: true })).toBe(true);
    expect(isAnswerCorrect("A + C", ["AC"], { unorderedChoices: true })).toBe(true);
    expect(isAnswerCorrect("A and C", ["AC"], { unorderedChoices: true })).toBe(true);
    expect(isAnswerCorrect("A, D", ["A C"], { unorderedChoices: true })).toBe(false);
    expect(isAnswerCorrect("C A", ["A C"])).toBe(false);
  });
});
