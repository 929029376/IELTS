import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { buildServer } from "../server";
import { createHardeningService } from "../services/hardeningService";

describe("V1 hardening service", () => {
  let backupDir: string;
  let db: DatabaseHandle;

  beforeEach(() => {
    backupDir = mkdtempSync(join(tmpdir(), "ielts-hardening-"));
    db = openDatabase(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
    rmSync(backupDir, { force: true, recursive: true });
  });

  function seedIncompleteBank() {
    const questions = createQuestionRepo(db);

    const failedSource = questions.createSource({
      checksum: "hardening-failed-source",
      importStatus: "failed",
      originalPath: "reading/broken.pdf",
      sourceType: "reading_pdf",
      version: 1
    });
    questions.createSourceAsset({
      assetKind: "pdf",
      checksum: "broken-pdf",
      filePath: null,
      originalName: "broken.pdf",
      sourceId: failedSource.id,
      textContent: "Unreadable PDF"
    });

    const reviewSource = questions.createSource({
      checksum: "hardening-review-source",
      importStatus: "needs_review",
      originalPath: "listening/P1/review.zip",
      sourceType: "listening_zip",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "unknown",
      part: "P1",
      sourceId: reviewSource.id,
      subject: "listening",
      title: "Airport Enquiry"
    });
    const noAnswerKey = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question without key",
      questionNumber: 1,
      questionType: "fill_blank"
    });
    const weakAnswerKey = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question without explanation",
      questionNumber: 2,
      questionType: "fill_blank"
    });
    questions.createAnswerKey({
      acceptedAnswers: ["gate"],
      answerSentence: null,
      explanation: null,
      questionId: weakAnswerKey.id,
      synonyms: []
    });

    const readingSource = questions.createSource({
      checksum: "hardening-reading-missing-answer-sentence",
      importStatus: "imported",
      originalPath: "reading/missing-answer-sentence.pdf",
      sourceType: "reading_pdf",
      version: 1
    });
    const readingPassage = questions.createPassage({
      frequencyClass: "high",
      part: "P2",
      sourceId: readingSource.id,
      subject: "reading",
      title: "Answer Sentence Gap"
    });
    const readingQuestion = questions.createQuestion({
      answerRules: {},
      passageId: readingPassage.id,
      prompt: "Which sentence proves the answer?",
      questionNumber: 1,
      questionType: "fill_blank"
    });
    questions.createAnswerKey({
      acceptedAnswers: ["proof"],
      answerSentence: null,
      explanation: "The explanation exists, but the exact answer sentence still needs manual selection.",
      questionId: readingQuestion.id,
      synonyms: []
    });
    db.prepare(
      `
      INSERT INTO frequency_entries (
        id, source_month, subject, part, english_title, chinese_title, frequency_class, difficulty
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run("hardening-reading-gap-frequency", "2026-06", "reading", "P2", "Answer Sentence Gap", null, "high", 2);

    return { noAnswerKey, passage, readingPassage, weakAnswerKey };
  }

  function seedSubmittedAttempts(count: number) {
    const questions = createQuestionRepo(db);
    const attempts = createAttemptRepo(db);
    const source = questions.createSource({
      checksum: `hardening-attempt-source-${count}`,
      importStatus: "imported",
      originalPath: "seed/hardening.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: `Backup Reminder ${count}`
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question 1",
      questionNumber: 1,
      questionType: "fill_blank"
    });
    questions.createAnswerKey({
      acceptedAnswers: ["answer"],
      answerSentence: "The answer is stated directly.",
      explanation: "The key sentence gives the answer.",
      questionId: question.id,
      synonyms: []
    });
    db.prepare(
      `
      INSERT INTO frequency_entries (
        id, source_month, subject, part, english_title, chinese_title, frequency_class, difficulty
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(`hardening-frequency-${count}`, "2026-06", "reading", "P1", `Backup Reminder ${count}`, null, "high", 2);

    for (let index = 0; index < count; index += 1) {
      const attempt = attempts.createAttempt({
        mode: "mock",
        startedAt: `2026-05-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
        subject: "reading"
      });
      attempts.saveAnswer({
        attemptId: attempt.id,
        isCorrect: true,
        markedForReview: false,
        normalizedAnswer: "answer",
        questionId: question.id,
        rawAnswer: "Answer",
        timeSpentSeconds: 20
      });
      attempts.submitAttempt({
        attemptId: attempt.id,
        estimatedBand: 7,
        rawScore: 31,
        submittedAt: `2026-05-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`
      });
    }
  }

  it("reports unresolved imports, question-bank gaps, and backup reminders", () => {
    const seeded = seedIncompleteBank();
    seedSubmittedAttempts(3);

    const service = createHardeningService(db, {
      backupDir,
      backupReminderAttemptThreshold: 2,
      now: "2026-06-01T00:00:00.000Z"
    });

    expect(service.getImportFailureReport()).toMatchObject({
      byStatus: { failed: 1, needs_review: 1 },
      totalUnresolved: 2,
      sources: [
        expect.objectContaining({ importStatus: "failed", originalPath: "reading/broken.pdf", assetCount: 1 }),
        expect.objectContaining({ importStatus: "needs_review", originalPath: "listening/P1/review.zip" })
      ]
    });

    expect(service.getQuestionBankCompleteness()).toMatchObject({
      issueCounts: {
        missingAnswerKey: 1,
        missingAnswerSentence: 1,
        missingAudio: 1,
        missingExplanation: 1,
        missingFrequencyEntry: 1,
        missingListeningCues: 1,
        missingTranscript: 1
      },
      passages: expect.arrayContaining([
        expect.objectContaining({
          id: seeded.passage.id,
          issueLabels: expect.arrayContaining([
            "missing answer key",
            "missing explanation",
            "missing audio",
            "missing transcript",
            "missing listening cues",
            "missing frequency entry"
          ])
        }),
        expect.objectContaining({
          id: seeded.readingPassage.id,
          issueLabels: expect.arrayContaining(["missing answer sentence"])
        })
      ]),
      totalPassages: 3
    });

    expect(service.getBackupReminder()).toMatchObject({
      latestBackupAt: null,
      shouldRemind: true,
      submittedAttemptCount: 3
    });
  });

  it("exposes hardening status through API routes", async () => {
    seedIncompleteBank();
    seedSubmittedAttempts(2);
    const databasePath = join(backupDir, "ielts.db");
    await db.backup(databasePath);

    const server = buildServer({
      backupDir,
      databasePath,
      now: "2026-06-01T00:00:00.000Z"
    });

    try {
      const response = await server.inject({ method: "GET", url: "/api/hardening/status" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        backupReminder: { shouldRemind: false },
        importFailures: { totalUnresolved: 2 },
        questionBankCompleteness: {
          issueCounts: expect.objectContaining({ missingAnswerKey: 1 })
        }
      });
    } finally {
      await server.close();
    }
  });
});
