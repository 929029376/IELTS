import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { createFrequencyRepo } from "../db/frequencyRepo";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { createSyncRepo } from "../db/syncRepo";

describe("database repositories", () => {
  let db: DatabaseHandle;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates a source, passage, question, and answer key", () => {
    const questions = createQuestionRepo(db);

    const source = questions.createSource({
      sourceType: "manual",
      originalPath: "seed/listening-p1.json",
      checksum: "source-checksum",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Sample booking call",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Name: ____",
      answerRules: { maxWords: 2 }
    });
    const answerKey = questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["Green Park"],
      answerSentence: "The booking is under Green Park.",
      explanation: "The speaker spells the park name after the booking reference.",
      synonyms: ["park name"]
    });

    const loaded = questions.getPassageWithQuestions(passage.id);

    expect(loaded?.title).toBe("Sample booking call");
    expect(loaded?.questions).toHaveLength(1);
    expect(loaded?.questions[0].answerKeys[0]).toMatchObject({
      id: answerKey.id,
      acceptedAnswers: ["Green Park"],
      explanation: "The speaker spells the park name after the booking reference."
    });
  });

  it("records an attempt and retrieves answers after reopening the database handle", () => {
    const questions = createQuestionRepo(db);
    const attempts = createAttemptRepo(db);

    const source = questions.createSource({
      sourceType: "manual",
      originalPath: "seed/reading-p1.json",
      checksum: "reading-source",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "History of Tea",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "short_answer",
      prompt: "What commodity is discussed?",
      answerRules: {}
    });

    const attempt = attempts.createAttempt({
      mode: "practice",
      subject: "reading",
      startedAt: "2026-05-31T15:00:00.000Z"
    });
    attempts.saveAnswer({
      attemptId: attempt.id,
      questionId: question.id,
      rawAnswer: "tea",
      normalizedAnswer: "tea",
      isCorrect: true,
      timeSpentSeconds: 18,
      markedForReview: false
    });
    attempts.submitAttempt({
      attemptId: attempt.id,
      submittedAt: "2026-05-31T15:20:00.000Z",
      rawScore: 1,
      estimatedBand: 4
    });

    const loaded = attempts.getAttemptWithAnswers(attempt.id);

    expect(loaded).toMatchObject({
      id: attempt.id,
      rawScore: 1,
      estimatedBand: 4
    });
    expect(loaded?.answers).toEqual([
      expect.objectContaining({
        questionId: question.id,
        rawAnswer: "tea",
        isCorrect: true,
        timeSpentSeconds: 18
      })
    ]);
  });

  it("persists attempt answers across reopened file database handles", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-phase-1-"));
    const databasePath = join(tempDir, "ielts.db");
    let fileDb = openDatabase(databasePath);

    try {
      migrate(fileDb);
      const questions = createQuestionRepo(fileDb);
      const attempts = createAttemptRepo(fileDb);
      const source = questions.createSource({
        sourceType: "manual",
        originalPath: "seed/reopen-reading.json",
        checksum: "reopen-reading-source",
        importStatus: "imported",
        version: 1
      });
      const passage = questions.createPassage({
        sourceId: source.id,
        subject: "reading",
        part: "P1",
        title: "Reopen Test Passage",
        frequencyClass: "unknown"
      });
      const question = questions.createQuestion({
        passageId: passage.id,
        questionNumber: 1,
        questionType: "fill_blank",
        prompt: "The answer is ____.",
        answerRules: {}
      });
      const attempt = attempts.createAttempt({
        mode: "practice",
        subject: "reading",
        startedAt: "2026-05-31T16:00:00.000Z"
      });
      attempts.saveAnswer({
        attemptId: attempt.id,
        questionId: question.id,
        rawAnswer: "persistent",
        normalizedAnswer: "persistent",
        isCorrect: true,
        timeSpentSeconds: 9,
        markedForReview: true
      });
      fileDb.close();

      fileDb = openDatabase(databasePath);
      const reopenedAttempts = createAttemptRepo(fileDb);
      const loaded = reopenedAttempts.getAttemptWithAnswers(attempt.id);

      expect(loaded?.answers[0]).toMatchObject({
        rawAnswer: "persistent",
        markedForReview: true
      });
    } finally {
      fileDb.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("upserts frequency entries by source month, subject, part, and title", () => {
    const frequencies = createFrequencyRepo(db);

    frequencies.upsertFrequencyEntry({
      sourceMonth: "2026-05",
      subject: "reading",
      part: "P1",
      englishTitle: "History of Tea",
      chineseTitle: "茶叶的历史",
      frequencyClass: "high",
      difficulty: 2.5
    });
    frequencies.upsertFrequencyEntry({
      sourceMonth: "2026-05",
      subject: "reading",
      part: "P1",
      englishTitle: "History of Tea",
      chineseTitle: "茶叶的历史",
      frequencyClass: "medium",
      difficulty: 3
    });

    const entries = frequencies.listFrequencyEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      englishTitle: "History of Tea",
      frequencyClass: "medium",
      difficulty: 3
    });
  });

  it("dedupes sync events by event id", () => {
    const sync = createSyncRepo(db);

    const firstInsert = sync.recordSyncEvent({
      eventId: "evt-1",
      deviceId: "device-a",
      eventType: "attempt.created",
      payloadJson: JSON.stringify({ attemptId: "attempt-1" }),
      createdAt: "2026-05-31T15:00:00.000Z"
    });
    const duplicateInsert = sync.recordSyncEvent({
      eventId: "evt-1",
      deviceId: "device-a",
      eventType: "attempt.created",
      payloadJson: JSON.stringify({ attemptId: "attempt-1" }),
      createdAt: "2026-05-31T15:00:00.000Z"
    });

    expect(firstInsert.inserted).toBe(true);
    expect(duplicateInsert.inserted).toBe(false);
    expect(sync.hasSyncEvent("evt-1")).toBe(true);
  });
});
