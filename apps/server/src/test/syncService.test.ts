import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { createSyncRepo } from "../db/syncRepo";
import { createSyncService, getDefaultSyncFolderPath } from "../sync/syncService";

describe("sync service", () => {
  let db: DatabaseHandle;
  let syncDir: string;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
    syncDir = mkdtempSync(join(tmpdir(), "ielts-sync-"));
  });

  afterEach(() => {
    db.close();
    rmSync(syncDir, { force: true, recursive: true });
  });

  function seedQuestion() {
    const questions = createQuestionRepo(db);
    const source = questions.createSource({
      checksum: "sync-seed",
      importStatus: "imported",
      originalPath: "seed/sync.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "Sync Passage"
    });
    return questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question 1",
      questionNumber: 1,
      questionType: "fill_blank"
    });
  }

  it("resolves sync folder config and creates JSONL files and device metadata", () => {
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });

    service.ensureSyncFolder();

    for (const fileName of [
      "attempts.jsonl",
      "answers.jsonl",
      "mistakes.jsonl",
      "stats.jsonl",
      "frequency.jsonl",
      "imports.jsonl",
      "devices.json"
    ]) {
      expect(existsSync(join(syncDir, fileName))).toBe(true);
    }
    expect(JSON.parse(readFileSync(join(syncDir, "devices.json"), "utf8"))).toMatchObject({
      devices: [expect.objectContaining({ id: "macbook", platform: "darwin" })]
    });
    expect(getDefaultSyncFolderPath("darwin")).toBe("/Users/musheng/Desktop/同步空间/IELTS-Sync");
    expect(getDefaultSyncFolderPath("win32", "D:/BaiduSync/IELTS-Sync")).toBe("D:/BaiduSync/IELTS-Sync");
  });

  it("repairs malformed devices metadata instead of failing sync startup", () => {
    writeFileSync(join(syncDir, "devices.json"), "{ not valid json");
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });

    expect(() => service.ensureSyncFolder()).not.toThrow();
    expect(JSON.parse(readFileSync(join(syncDir, "devices.json"), "utf8"))).toMatchObject({
      devices: [expect.objectContaining({ id: "macbook", platform: "darwin" })]
    });
  });

  it("appends local attempt, answer, and mistake events into JSONL files", () => {
    const question = seedQuestion();
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    const attempts = createAttemptRepo(db);
    const attempt = attempts.createAttempt({
      mode: "practice",
      startedAt: "2026-06-01T08:00:00.000Z",
      subject: "reading"
    });
    const answer = attempts.saveAnswer({
      attemptId: attempt.id,
      isCorrect: true,
      markedForReview: false,
      normalizedAnswer: "green park",
      questionId: question.id,
      rawAnswer: "Green Park",
      timeSpentSeconds: 30
    });
    const label = attempts.addMistakeLabel({ attemptAnswerId: answer.id, label: "定位失败" });

    service.appendAttemptEvent("attempt.created", attempt, "2026-06-01T08:00:00.000Z");
    service.appendAnswerEvent(answer, "2026-06-01T08:00:30.000Z");
    service.appendMistakeEvent({ ...label, attemptAnswerId: answer.id }, "2026-06-01T08:01:00.000Z");

    expect(readFileSync(join(syncDir, "attempts.jsonl"), "utf8")).toContain('"type":"attempt.created"');
    expect(readFileSync(join(syncDir, "answers.jsonl"), "utf8")).toContain('"questionId"');
    expect(readFileSync(join(syncDir, "mistakes.jsonl"), "utf8")).toContain("定位失败");
  });

  it("imports remote events once and merges attempts and answers by identifiers", () => {
    const question = seedQuestion();
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    const remoteAttempt = {
      createdAt: "2026-06-01T09:00:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-attempt-1",
      payload: {
        estimatedBand: null,
        id: "remote-attempt",
        mode: "practice",
        rawScore: null,
        startedAt: "2026-06-01T09:00:00.000Z",
        subject: "reading",
        submittedAt: null
      },
      type: "attempt.created"
    };
    const remoteAnswer = {
      createdAt: "2026-06-01T09:01:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-answer-1",
      payload: {
        attemptId: "remote-attempt",
        id: "remote-answer",
        isCorrect: true,
        markedForReview: false,
        normalizedAnswer: "green park",
        questionId: question.id,
        rawAnswer: "Green Park",
        timeSpentSeconds: 20
      },
      type: "answer.saved"
    };
    service.appendExternalEvent("attempts", remoteAttempt);
    service.appendExternalEvent("answers", remoteAnswer);

    expect(service.importRemoteEvents()).toMatchObject({ imported: 2, skipped: 0 });
    expect(service.importRemoteEvents()).toMatchObject({ imported: 0, skipped: 2 });
    expect(createAttemptRepo(db).getAttemptWithAnswers("remote-attempt")).toMatchObject({
      id: "remote-attempt",
      answers: [expect.objectContaining({ rawAnswer: "Green Park" })]
    });
    expect(createSyncRepo(db).hasSyncEvent("remote-answer-1")).toBe(true);
  });

  it("imports remote attempt question lists for complete review and analytics context", () => {
    const question = seedQuestion();
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    service.appendExternalEvent("attempts", {
      createdAt: "2026-06-01T09:00:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-attempt-with-questions",
      payload: {
        answers: [],
        conflicts: [],
        estimatedBand: null,
        id: "remote-attempt-with-question-list",
        mode: "mock",
        questions: [
          {
            attemptId: "remote-attempt-with-question-list",
            id: "remote-attempt-question-1",
            questionId: question.id,
            questionOrder: 1
          }
        ],
        rawScore: null,
        startedAt: "2026-06-01T09:00:00.000Z",
        subject: "reading",
        submittedAt: null
      },
      type: "attempt.created"
    });

    expect(service.importRemoteEvents()).toMatchObject({ imported: 1, skipped: 0 });
    expect(createAttemptRepo(db).getAttemptWithAnswers("remote-attempt-with-question-list")).toMatchObject({
      questions: [
        expect.objectContaining({
          questionId: question.id,
          questionOrder: 1
        })
      ]
    });
  });

  it("skips remote attempt question rows when the local question is missing", () => {
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    service.appendExternalEvent("attempts", {
      createdAt: "2026-06-01T09:00:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-attempt-missing-question",
      payload: {
        estimatedBand: null,
        id: "remote-attempt-missing-question-list",
        mode: "mock",
        questions: [
          {
            attemptId: "remote-attempt-missing-question-list",
            id: "remote-attempt-missing-question-row",
            questionId: "missing-local-question",
            questionOrder: 1
          }
        ],
        rawScore: null,
        startedAt: "2026-06-01T09:00:00.000Z",
        subject: "reading",
        submittedAt: null
      },
      type: "attempt.created"
    });

    expect(service.importRemoteEvents()).toMatchObject({ imported: 1, skipped: 0 });
    expect(createAttemptRepo(db).getAttemptWithAnswers("remote-attempt-missing-question-list")).toMatchObject({
      id: "remote-attempt-missing-question-list",
      questions: []
    });
  });

  it("skips remote answer rows when the local attempt or question is missing", () => {
    const question = seedQuestion();
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    service.appendExternalEvent("attempts", {
      createdAt: "2026-06-01T09:00:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-attempt-for-missing-question-answer",
      payload: {
        estimatedBand: null,
        id: "remote-attempt-for-missing-question-answer",
        mode: "practice",
        rawScore: null,
        startedAt: "2026-06-01T09:00:00.000Z",
        subject: "reading",
        submittedAt: null
      },
      type: "attempt.created"
    });
    service.appendExternalEvent("answers", {
      createdAt: "2026-06-01T09:01:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-answer-missing-attempt",
      payload: {
        attemptId: "missing-local-attempt",
        id: "remote-answer-missing-attempt-row",
        isCorrect: true,
        markedForReview: false,
        normalizedAnswer: "green park",
        questionId: question.id,
        rawAnswer: "Green Park",
        timeSpentSeconds: 20
      },
      type: "answer.saved"
    });
    service.appendExternalEvent("answers", {
      createdAt: "2026-06-01T09:02:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-answer-missing-question",
      payload: {
        attemptId: "remote-attempt-for-missing-question-answer",
        id: "remote-answer-missing-question-row",
        isCorrect: false,
        markedForReview: false,
        normalizedAnswer: "blue park",
        questionId: "missing-local-question",
        rawAnswer: "Blue Park",
        timeSpentSeconds: 25
      },
      type: "answer.saved"
    });

    expect(service.importRemoteEvents()).toMatchObject({ imported: 1, skipped: 2 });
    expect(createAttemptRepo(db).getAttemptWithAnswers("remote-attempt-for-missing-question-answer")).toMatchObject({
      answers: []
    });
    expect(createSyncRepo(db).hasSyncEvent("remote-answer-missing-attempt")).toBe(false);
    expect(createSyncRepo(db).hasSyncEvent("remote-answer-missing-question")).toBe(false);
  });

  it("skips remote mistake rows when the local answer is missing", () => {
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    service.appendExternalEvent("mistakes", {
      createdAt: "2026-06-01T09:03:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-mistake-missing-answer",
      payload: {
        attemptAnswerId: "missing-local-answer",
        id: "remote-mistake-missing-answer-row",
        label: "定位失败"
      },
      type: "mistake.added"
    });

    expect(service.importRemoteEvents()).toMatchObject({ imported: 0, skipped: 1 });
    expect(createSyncRepo(db).hasSyncEvent("remote-mistake-missing-answer")).toBe(false);
    expect(
      db.prepare("SELECT id FROM mistake_labels WHERE id = ?").get("remote-mistake-missing-answer-row")
    ).toBeUndefined();
  });

  it("imports remote stats snapshot events for cross-device analytics continuity", () => {
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    service.appendExternalEvent("stats", {
      createdAt: "2026-06-01T09:04:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-stats-snapshot",
      payload: {
        createdAt: "2026-06-01T09:04:00.000Z",
        id: "remote-stats-snapshot-row",
        payloadJson: JSON.stringify({
          predictedReading: { band: 7 },
          weakestQuestionType: "matching"
        }),
        snapshotType: "dashboard_prediction"
      },
      type: "stats.snapshot.created"
    });

    expect(service.importRemoteEvents()).toMatchObject({ imported: 1, skipped: 0 });
    expect(
      db
        .prepare(
          `
          SELECT
            id,
            snapshot_type AS snapshotType,
            payload_json AS payloadJson,
            created_at AS createdAt
          FROM stats_snapshots
          WHERE id = ?
        `
        )
        .get("remote-stats-snapshot-row")
    ).toMatchObject({
      createdAt: "2026-06-01T09:04:00.000Z",
      id: "remote-stats-snapshot-row",
      payloadJson: JSON.stringify({
        predictedReading: { band: 7 },
        weakestQuestionType: "matching"
      }),
      snapshotType: "dashboard_prediction"
    });
    expect(createSyncRepo(db).hasSyncEvent("remote-stats-snapshot")).toBe(true);
  });

  it("keeps remote answer conflicts for submitted local attempts instead of overwriting", () => {
    const question = seedQuestion();
    const attempts = createAttemptRepo(db);
    const attempt = attempts.createAttempt({
      mode: "mock",
      startedAt: "2026-06-01T08:00:00.000Z",
      subject: "reading"
    });
    const localAnswer = attempts.saveAnswer({
      attemptId: attempt.id,
      isCorrect: false,
      markedForReview: false,
      normalizedAnswer: "blue park",
      questionId: question.id,
      rawAnswer: "Blue Park",
      timeSpentSeconds: 30
    });
    attempts.submitAttempt({
      attemptId: attempt.id,
      estimatedBand: 6,
      rawScore: 20,
      submittedAt: "2026-06-01T09:00:00.000Z"
    });
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    service.appendExternalEvent("answers", {
      createdAt: "2026-06-01T09:02:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-conflict-answer",
      payload: {
        attemptId: attempt.id,
        id: "remote-conflict-answer-row",
        isCorrect: true,
        markedForReview: false,
        normalizedAnswer: "green park",
        questionId: question.id,
        rawAnswer: "Green Park",
        timeSpentSeconds: 25
      },
      type: "answer.saved"
    });

    expect(service.importRemoteEvents()).toMatchObject({ conflicts: 1, imported: 1 });
    expect(createAttemptRepo(db).getAttemptWithAnswers(attempt.id)).toMatchObject({
      answers: [expect.objectContaining({ id: localAnswer.id, rawAnswer: "Blue Park" })],
      conflicts: [
        expect.objectContaining({
          remoteRawAnswer: "Green Park",
          status: "conflict"
        })
      ]
    });
  });

  it("keeps remote answers for submitted unanswered questions as conflicts", () => {
    const question = seedQuestion();
    const attempts = createAttemptRepo(db);
    const attempt = attempts.createAttempt({
      mode: "mock",
      startedAt: "2026-06-01T08:00:00.000Z",
      subject: "reading"
    });
    attempts.recordAttemptQuestions(attempt.id, [question.id]);
    attempts.submitAttempt({
      attemptId: attempt.id,
      estimatedBand: 4,
      rawScore: 0,
      submittedAt: "2026-06-01T09:00:00.000Z"
    });
    const service = createSyncService(db, {
      deviceId: "macbook",
      deviceName: "MacBook",
      platform: "darwin",
      syncFolderPath: syncDir
    });
    service.ensureSyncFolder();
    service.appendExternalEvent("answers", {
      createdAt: "2026-06-01T09:02:00.000Z",
      deviceId: "windows-pc",
      eventId: "remote-unanswered-conflict",
      payload: {
        attemptId: attempt.id,
        id: "remote-unanswered-conflict-row",
        isCorrect: true,
        markedForReview: false,
        normalizedAnswer: "green park",
        questionId: question.id,
        rawAnswer: "Green Park",
        timeSpentSeconds: 25
      },
      type: "answer.saved"
    });

    expect(service.importRemoteEvents()).toMatchObject({ conflicts: 1, imported: 1 });
    expect(createAttemptRepo(db).getAttemptWithAnswers(attempt.id)).toMatchObject({
      answers: [expect.objectContaining({ rawAnswer: "", isCorrect: false })],
      conflicts: [
        expect.objectContaining({
          remoteRawAnswer: "Green Park",
          status: "conflict"
        })
      ],
      rawScore: 0
    });
  });
});
