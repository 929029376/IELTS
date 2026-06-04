import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { createIntensiveRepo } from "../db/intensiveRepo";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { createBackupService } from "../sync/backupService";

describe("backup service", () => {
  let backupDir: string;
  let db: DatabaseHandle;

  beforeEach(() => {
    backupDir = mkdtempSync(join(tmpdir(), "ielts-backups-"));
    db = openDatabase(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
    rmSync(backupDir, { force: true, recursive: true });
  });

  function seedHistory() {
    const questions = createQuestionRepo(db);
    const attempts = createAttemptRepo(db);
    const intensive = createIntensiveRepo(db);
    const source = questions.createSource({
      checksum: "backup-source",
      importStatus: "imported",
      originalPath: "seed/backup.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "Backup Passage"
    });
    const listeningPassage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "listening",
      title: "Backup Listening"
    });
    const cue = intensive.createListeningCue({
      endSeconds: 4.2,
      label: "Sentence 1",
      passageId: listeningPassage.id,
      startSeconds: 1.2,
      transcript: "Green Park"
    });
    intensive.saveDictationAttempt({
      cueId: cue.id,
      userText: "green park"
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
    attempts.addMistakeLabel({ attemptAnswerId: answer.id, label: "定位失败" });
    attempts.submitAttempt({
      attemptId: attempt.id,
      estimatedBand: 7,
      rawScore: 31,
      submittedAt: "2026-06-01T09:00:00.000Z"
    });
    return { attemptId: attempt.id, cueId: cue.id, questionId: question.id };
  }

  it("exports and imports manual history backups from the backups directory", () => {
    const seeded = seedHistory();
    const backup = createBackupService(db, {
      backupDir,
      now: "2026-06-01T10:00:00.000Z"
    });

    const exported = backup.exportBackup();
    expect(exported.filePath.endsWith("ielts-backup-2026-06-01T10-00-00-000Z.json")).toBe(true);
    expect(existsSync(exported.filePath)).toBe(true);
    expect(JSON.parse(readFileSync(exported.filePath, "utf8"))).toMatchObject({
      attempt_answers: [expect.objectContaining({ question_id: seeded.questionId })],
      attempts: [expect.objectContaining({ id: seeded.attemptId })],
      dictation_attempts: [expect.objectContaining({ cue_id: seeded.cueId, user_text: "green park" })],
      mistake_labels: [expect.objectContaining({ label: "定位失败" })]
    });

    const restoredDb = openDatabase(":memory:");
    migrate(restoredDb);
    try {
      createBackupService(restoredDb, { backupDir, now: "2026-06-01T10:00:00.000Z" }).importBackup(
        exported.filePath
      );
      expect(createAttemptRepo(restoredDb).getAttemptWithAnswers(seeded.attemptId)).toMatchObject({
        answers: [expect.objectContaining({ rawAnswer: "Green Park" })],
        id: seeded.attemptId
      });
      expect(createIntensiveRepo(restoredDb).listDictationAttempts(seeded.cueId)).toEqual([
        expect.objectContaining({
          normalizedText: "green park",
          userText: "green park"
        })
      ]);
    } finally {
      restoredDb.close();
    }
  });
});
