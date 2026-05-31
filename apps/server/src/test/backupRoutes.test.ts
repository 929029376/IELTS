import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { buildServer } from "../server";

function seedHistory(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);
  const attempts = createAttemptRepo(db);

  try {
    const source = questions.createSource({
      checksum: "backup-route-source",
      importStatus: "imported",
      originalPath: "seed/backup-route.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "Backup Route Passage"
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question 1",
      questionNumber: 1,
      questionType: "fill_blank"
    });
    const attempt = attempts.createAttempt({
      mode: "practice",
      startedAt: "2026-06-01T08:00:00.000Z",
      subject: "reading"
    });
    attempts.saveAnswer({
      attemptId: attempt.id,
      isCorrect: true,
      markedForReview: false,
      normalizedAnswer: "green park",
      questionId: question.id,
      rawAnswer: "Green Park",
      timeSpentSeconds: 20
    });
    return attempt.id;
  } finally {
    db.close();
  }
}

describe("backup routes", () => {
  it("exports and imports manual backup files through the API", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-backup-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    const backupDir = join(tempDir, "backups");
    const attemptId = seedHistory(databasePath);
    const server = buildServer({
      backupDir,
      databasePath,
      now: "2026-06-01T10:00:00.000Z"
    });

    try {
      const exported = await server.inject({ method: "POST", url: "/api/backups/export" });
      expect(exported.statusCode).toBe(200);
      const body = exported.json<{ filePath: string }>();
      expect(body.filePath).toContain("ielts-backup-2026-06-01T10-00-00-000Z.json");
      expect(existsSync(body.filePath)).toBe(true);

      const imported = await server.inject({
        method: "POST",
        payload: { filePath: body.filePath },
        url: "/api/backups/import"
      });
      expect(imported.statusCode).toBe(200);
      expect(imported.json()).toMatchObject({ importedTables: expect.any(Number) });

      const review = await server.inject({ method: "GET", url: `/api/practice/${attemptId}/review` });
      expect(review.json()).toMatchObject({ id: attemptId });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
