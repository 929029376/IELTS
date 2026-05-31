import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { buildServer } from "../server";

function seedQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      checksum: "sync-routes-seed",
      importStatus: "imported",
      originalPath: "seed/sync-routes.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "Sync Routes"
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question 1",
      questionNumber: 1,
      questionType: "fill_blank"
    });
    questions.createAnswerKey({
      acceptedAnswers: ["green park"],
      answerSentence: "The booking is under Green Park.",
      explanation: "Direct answer.",
      questionId: question.id,
      synonyms: []
    });
  } finally {
    db.close();
  }
}

describe("sync routes", () => {
  it("appends practice writes to sync JSONL files and imports remote events manually", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    seedQuestion(databasePath);

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const config = await server.inject({ method: "GET", url: "/api/sync/config" });
      expect(config.statusCode).toBe(200);
      expect(config.json()).toMatchObject({ syncFolderPath });
      expect(existsSync(join(syncFolderPath, "attempts.jsonl"))).toBe(true);

      const start = await server.inject({
        method: "POST",
        payload: { mode: "practice", subject: "reading" },
        url: "/api/practice/start"
      });
      const started = start.json<{ attemptId: string; questions: Array<{ id: string }> }>();
      await server.inject({
        method: "POST",
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "Green Park",
          timeSpentSeconds: 20
        },
        url: `/api/practice/${started.attemptId}/answer`
      });
      await server.inject({ method: "POST", url: `/api/practice/${started.attemptId}/submit` });

      expect(readFileSync(join(syncFolderPath, "attempts.jsonl"), "utf8")).toContain("attempt.submitted");
      expect(readFileSync(join(syncFolderPath, "answers.jsonl"), "utf8")).toContain("answer.saved");

      const sync = await server.inject({ method: "POST", url: "/api/sync/import" });
      expect(sync.statusCode).toBe(200);
      expect(sync.json()).toMatchObject({ imported: 0 });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("imports remote events on startup when sync is configured", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-startup-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "attempts.jsonl"),
      `${JSON.stringify({
        createdAt: "2026-06-01T08:00:00.000Z",
        deviceId: "windows-pc",
        eventId: "startup-attempt",
        payload: {
          estimatedBand: null,
          id: "remote-startup-attempt",
          mode: "practice",
          rawScore: null,
          startedAt: "2026-06-01T08:00:00.000Z",
          subject: "reading",
          submittedAt: null
        },
        type: "attempt.created"
      })}\n`
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const review = await server.inject({
        method: "GET",
        url: "/api/practice/remote-startup-attempt/review"
      });
      expect(review.statusCode).toBe(200);
      expect(review.json()).toMatchObject({ id: "remote-startup-attempt", subject: "reading" });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
