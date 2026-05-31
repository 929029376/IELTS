import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { buildServer } from "../server";

function seedReportData(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);
  const attempts = createAttemptRepo(db);

  try {
    const source = questions.createSource({
      checksum: "reports-route-seed",
      importStatus: "imported",
      originalPath: "seed/reports.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "listening",
      title: "Reports Listening"
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question 1",
      questionNumber: 1,
      questionType: "fill_blank"
    });
    const attempt = attempts.createAttempt({
      mode: "mock",
      startedAt: "2026-05-30T10:00:00.000Z",
      subject: "listening"
    });
    attempts.saveAnswer({
      attemptId: attempt.id,
      isCorrect: true,
      markedForReview: false,
      normalizedAnswer: "green park",
      questionId: question.id,
      rawAnswer: "Green Park",
      timeSpentSeconds: 30
    });
    attempts.submitAttempt({
      attemptId: attempt.id,
      estimatedBand: 7,
      rawScore: 31,
      submittedAt: "2026-05-30T11:00:00.000Z"
    });
  } finally {
    db.close();
  }
}

describe("reports routes", () => {
  it("returns history, analytics, dashboard prediction, and export paths", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-reports-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    const exportDir = join(tempDir, "exports");
    seedReportData(databasePath);

    const server = buildServer({
      databasePath,
      exportDir,
      now: "2026-05-31T00:00:00.000Z"
    });

    try {
      const history = await server.inject({ method: "GET", url: "/api/reports/history" });
      expect(history.statusCode).toBe(200);
      expect(history.json()).toEqual([
        expect.objectContaining({ durationSeconds: 3600, estimatedBand: 7, subject: "listening" })
      ]);

      const analytics = await server.inject({ method: "GET", url: "/api/reports/analytics" });
      expect(analytics.statusCode).toBe(200);
      expect(analytics.json()).toMatchObject({
        byPart: { listening: { P1: { correct: 1, total: 1 } } },
        byFrequencyClass: { high: { correct: 1, total: 1 } }
      });

      const dashboard = await server.inject({ method: "GET", url: "/api/reports/dashboard" });
      expect(dashboard.statusCode).toBe(200);
      expect(dashboard.json()).toMatchObject({
        latestMockScore: expect.objectContaining({ rawScore: 31 }),
        predictedListening: expect.objectContaining({ predictedBand: 7 })
      });

      const exported = await server.inject({ method: "POST", url: "/api/reports/export" });
      expect(exported.statusCode).toBe(200);
      expect(exported.json()).toMatchObject({
        mockCsv: expect.stringContaining("mock-report-2026-05-31.csv"),
        mockJson: expect.stringContaining("mock-report-2026-05-31.json")
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
