import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { createAnalyticsService } from "../services/analyticsService";

describe("analytics service", () => {
  let db: DatabaseHandle;
  let exportDir: string;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
    exportDir = mkdtempSync(join(tmpdir(), "ielts-reports-"));
  });

  afterEach(() => {
    db.close();
    rmSync(exportDir, { force: true, recursive: true });
  });

  function seedAnsweredAttempt(input: {
    estimatedBand: number;
    frequencyClass: "high" | "medium" | "low" | "unknown";
    labels?: string[];
    mode: "practice" | "mock";
    part: "P1" | "P2" | "P3" | "P4";
    questionType: string;
    rawScore: number;
    startedAt: string;
    subject: "listening" | "reading";
    submittedAt: string;
    title: string;
    total: number;
  }) {
    const questions = createQuestionRepo(db);
    const attempts = createAttemptRepo(db);
    const source = questions.createSource({
      checksum: `${input.title}-${input.startedAt}`,
      importStatus: "imported",
      originalPath: `seed/${input.title}.json`,
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: input.frequencyClass,
      part: input.part,
      sourceId: source.id,
      subject: input.subject,
      title: input.title
    });
    const attempt = attempts.createAttempt({
      mode: input.mode,
      startedAt: input.startedAt,
      subject: input.subject
    });

    for (let index = 0; index < input.total; index += 1) {
      const question = questions.createQuestion({
        answerRules: {},
        passageId: passage.id,
        prompt: `Question ${index + 1}`,
        questionNumber: index + 1,
        questionType: input.questionType as never
      });
      const answer = attempts.saveAnswer({
        attemptId: attempt.id,
        isCorrect: index < input.rawScore,
        markedForReview: false,
        normalizedAnswer: index < input.rawScore ? "right" : "wrong",
        questionId: question.id,
        rawAnswer: index < input.rawScore ? "right" : "wrong",
        timeSpentSeconds: 45
      });

      if (index >= input.rawScore) {
        for (const label of input.labels ?? []) {
          attempts.addMistakeLabel({ attemptAnswerId: answer.id, label });
        }
      }
    }

    attempts.submitAttempt({
      attemptId: attempt.id,
      estimatedBand: input.estimatedBand,
      rawScore: input.rawScore,
      submittedAt: input.submittedAt
    });

    return attempt.id;
  }

  it("lists submitted history with duration and latest first", () => {
    seedAnsweredAttempt({
      estimatedBand: 7,
      frequencyClass: "high",
      mode: "mock",
      part: "P1",
      questionType: "fill_blank",
      rawScore: 1,
      startedAt: "2026-05-01T10:00:00.000Z",
      subject: "listening",
      submittedAt: "2026-05-01T11:00:00.000Z",
      title: "Older Listening",
      total: 1
    });
    seedAnsweredAttempt({
      estimatedBand: 7.5,
      frequencyClass: "medium",
      mode: "practice",
      part: "P2",
      questionType: "single_choice",
      rawScore: 2,
      startedAt: "2026-05-02T10:00:00.000Z",
      subject: "reading",
      submittedAt: "2026-05-02T10:30:00.000Z",
      title: "Newer Reading",
      total: 2
    });

    const service = createAnalyticsService(db, { exportDir, now: "2026-05-31T00:00:00.000Z" });

    expect(service.listHistory()).toEqual([
      expect.objectContaining({
        durationSeconds: 1800,
        estimatedBand: 7.5,
        mode: "practice",
        rawScore: 2,
        subject: "reading"
      }),
      expect.objectContaining({
        durationSeconds: 3600,
        estimatedBand: 7,
        mode: "mock",
        rawScore: 1,
        subject: "listening"
      })
    ]);
  });

  it("aggregates accuracy by part, question type, frequency class, and mistake labels", () => {
    seedAnsweredAttempt({
      estimatedBand: 6,
      frequencyClass: "high",
      labels: ["定位失败"],
      mode: "mock",
      part: "P1",
      questionType: "matching",
      rawScore: 1,
      startedAt: "2026-05-03T10:00:00.000Z",
      subject: "reading",
      submittedAt: "2026-05-03T11:00:00.000Z",
      title: "Routes",
      total: 3
    });
    seedAnsweredAttempt({
      estimatedBand: 8,
      frequencyClass: "low",
      mode: "practice",
      part: "P2",
      questionType: "fill_blank",
      rawScore: 2,
      startedAt: "2026-05-04T10:00:00.000Z",
      subject: "reading",
      submittedAt: "2026-05-04T10:30:00.000Z",
      title: "Plants",
      total: 2
    });

    const service = createAnalyticsService(db, { exportDir, now: "2026-05-31T00:00:00.000Z" });
    const analytics = service.getAccuracyAnalytics();

    expect(analytics.byPart.reading.P1).toMatchObject({ correct: 1, total: 3, accuracy: 1 / 3 });
    expect(analytics.byPart.reading.P2).toMatchObject({ correct: 2, total: 2, accuracy: 1 });
    expect(analytics.byQuestionType.matching).toMatchObject({ correct: 1, total: 3 });
    expect(analytics.byFrequencyClass.high).toMatchObject({ correct: 1, total: 3 });
    expect(analytics.mistakeLabels).toEqual([{ label: "定位失败", count: 2 }]);
  });

  it("predicts scores from recent mock exams with practice as a secondary signal", () => {
    seedAnsweredAttempt({
      estimatedBand: 6,
      frequencyClass: "medium",
      mode: "mock",
      part: "P1",
      questionType: "fill_blank",
      rawScore: 24,
      startedAt: "2026-02-01T10:00:00.000Z",
      subject: "listening",
      submittedAt: "2026-02-01T11:00:00.000Z",
      title: "Old Mock",
      total: 40
    });
    seedAnsweredAttempt({
      estimatedBand: 7,
      frequencyClass: "high",
      mode: "mock",
      part: "P2",
      questionType: "fill_blank",
      rawScore: 31,
      startedAt: "2026-05-25T10:00:00.000Z",
      subject: "listening",
      submittedAt: "2026-05-25T11:00:00.000Z",
      title: "Recent Mock",
      total: 40
    });
    seedAnsweredAttempt({
      estimatedBand: 8,
      frequencyClass: "high",
      mode: "practice",
      part: "P3",
      questionType: "matching",
      rawScore: 35,
      startedAt: "2026-05-30T10:00:00.000Z",
      subject: "listening",
      submittedAt: "2026-05-30T10:30:00.000Z",
      title: "Recent Practice",
      total: 40
    });

    const service = createAnalyticsService(db, { exportDir, now: "2026-05-31T00:00:00.000Z" });

    expect(service.predictBand("listening")).toEqual({
      basisAttempts: 3,
      confidence: "medium",
      predictedBand: 7,
      range: { max: 7.5, min: 6.5 },
      subject: "listening"
    });
  });

  it("exports mock and mistake reports as json and csv files", () => {
    seedAnsweredAttempt({
      estimatedBand: 6,
      frequencyClass: "high",
      labels: ["同义替换"],
      mode: "mock",
      part: "P1",
      questionType: "matching",
      rawScore: 1,
      startedAt: "2026-05-05T10:00:00.000Z",
      subject: "reading",
      submittedAt: "2026-05-05T11:00:00.000Z",
      title: "Export Mock",
      total: 2
    });

    const service = createAnalyticsService(db, { exportDir, now: "2026-05-31T00:00:00.000Z" });
    const files = service.exportReports();

    expect(files.mockJson.endsWith("mock-report-2026-05-31.json")).toBe(true);
    expect(files.mockCsv.endsWith("mock-report-2026-05-31.csv")).toBe(true);
    expect(files.mistakesCsv.endsWith("mistakes-2026-05-31.csv")).toBe(true);
    expect(JSON.parse(readFileSync(files.mockJson, "utf8"))).toEqual([
      expect.objectContaining({ estimatedBand: 6, rawScore: 1, subject: "reading" })
    ]);
    expect(readFileSync(files.mockCsv, "utf8")).toContain("subject,mode,submittedAt,rawScore,estimatedBand");
    expect(readFileSync(files.mistakesCsv, "utf8")).toContain("同义替换");
  });
});
