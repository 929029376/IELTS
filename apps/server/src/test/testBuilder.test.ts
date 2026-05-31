import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import {
  buildFullListeningSet,
  buildFullReadingSet,
  calculateSelectionWeight,
  filterCandidatePassages,
  weightedPick
} from "../services/testBuilder";

describe("frequency-weighted test builder", () => {
  let db: DatabaseHandle;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  function createPassage(input: {
    subject: "listening" | "reading";
    part: "P1" | "P2" | "P3" | "P4";
    title: string;
    frequencyClass: "high" | "medium" | "low" | "unknown";
    questionType?: string;
  }) {
    const repo = createQuestionRepo(db);
    const source = repo.createSource({
      sourceType: "seed",
      originalPath: `seed/${input.title}.json`,
      checksum: `checksum-${input.title}`,
      importStatus: "imported",
      version: 1
    });
    const passage = repo.createPassage({
      sourceId: source.id,
      subject: input.subject,
      part: input.part,
      title: input.title,
      frequencyClass: input.frequencyClass
    });
    const question = repo.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: (input.questionType ?? "fill_blank") as never,
      prompt: `${input.title} question`,
      answerRules: {}
    });
    repo.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["answer"],
      answerSentence: "answer",
      explanation: "sample",
      synonyms: []
    });
    return passage;
  }

  it("applies frequency weights and recency penalties", () => {
    expect(calculateSelectionWeight({ frequencyClass: "high", lastCompletedAt: null })).toBe(5);
    expect(calculateSelectionWeight({ frequencyClass: "medium", lastCompletedAt: null })).toBe(3);
    expect(calculateSelectionWeight({ frequencyClass: "low", lastCompletedAt: null })).toBe(1);
    expect(calculateSelectionWeight({ frequencyClass: "unknown", lastCompletedAt: null })).toBe(1);
    expect(
      calculateSelectionWeight({
        frequencyClass: "high",
        lastCompletedAt: "2026-05-28T00:00:00.000Z",
        now: "2026-05-31T00:00:00.000Z"
      })
    ).toBeCloseTo(0.5);
    expect(
      calculateSelectionWeight({
        frequencyClass: "high",
        lastCompletedAt: "2026-05-10T00:00:00.000Z",
        now: "2026-05-31T00:00:00.000Z"
      })
    ).toBeCloseTo(2);
  });

  it("selects high-weight candidates first with deterministic random input", () => {
    const selected = weightedPick(
      [
        { id: "low", selectionWeight: 1 },
        { id: "high", selectionWeight: 5 }
      ],
      () => 0.9
    );

    expect(selected?.id).toBe("high");
  });

  it("builds a listening set with one passage from P1 through P4", () => {
    createPassage({ subject: "listening", part: "P1", title: "L P1 high", frequencyClass: "high" });
    createPassage({ subject: "listening", part: "P2", title: "L P2 high", frequencyClass: "high" });
    createPassage({ subject: "listening", part: "P3", title: "L P3 high", frequencyClass: "high" });
    createPassage({ subject: "listening", part: "P4", title: "L P4 high", frequencyClass: "high" });

    const set = buildFullListeningSet(db, { random: () => 0.99 });

    expect(set.passages.map((passage) => passage.part)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(set.passages.every((passage) => passage.subject === "listening")).toBe(true);
  });

  it("builds a reading set with one passage from P1 through P3", () => {
    createPassage({ subject: "reading", part: "P1", title: "R P1 high", frequencyClass: "high" });
    createPassage({ subject: "reading", part: "P2", title: "R P2 high", frequencyClass: "high" });
    createPassage({ subject: "reading", part: "P3", title: "R P3 high", frequencyClass: "high" });

    const set = buildFullReadingSet(db, { random: () => 0.99 });

    expect(set.passages.map((passage) => passage.part)).toEqual(["P1", "P2", "P3"]);
    expect(set.passages.every((passage) => passage.subject === "reading")).toBe(true);
  });

  it("filters by subject, part, frequency, question type, and mistake label", () => {
    const matching = createPassage({
      subject: "reading",
      part: "P2",
      title: "Matching passage",
      frequencyClass: "high",
      questionType: "matching"
    });
    createPassage({
      subject: "reading",
      part: "P2",
      title: "Wrong question type",
      frequencyClass: "high",
      questionType: "fill_blank"
    });

    const attemptRepo = createAttemptRepo(db);
    const questionRepo = createQuestionRepo(db);
    const loaded = questionRepo.getPassageWithQuestions(matching.id);
    const attempt = attemptRepo.createAttempt({
      mode: "practice",
      subject: "reading",
      startedAt: "2026-05-31T10:00:00.000Z"
    });
    const answer = attemptRepo.saveAnswer({
      attemptId: attempt.id,
      questionId: loaded?.questions[0].id ?? "",
      rawAnswer: "wrong",
      normalizedAnswer: "wrong",
      isCorrect: false,
      timeSpentSeconds: 30,
      markedForReview: false
    });
    attemptRepo.addMistakeLabel({ attemptAnswerId: answer.id, label: "定位失败" });

    const candidates = filterCandidatePassages(db, {
      subject: "reading",
      part: "P2",
      frequencyClass: "high",
      questionType: "matching",
      mistakeLabel: "定位失败"
    });

    expect(candidates.map((candidate) => candidate.id)).toEqual([matching.id]);
  });
});
