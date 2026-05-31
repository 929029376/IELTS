import { randomUUID } from "node:crypto";
import type { Subject } from "@ielts/shared";
import type { DatabaseHandle } from "./database";

export interface AttemptRecord {
  id: string;
  mode: "practice" | "mock" | "intensive";
  subject: Subject;
  startedAt: string;
  submittedAt: string | null;
  rawScore: number | null;
  estimatedBand: number | null;
}

export interface AttemptAnswerRecord {
  id: string;
  attemptId: string;
  questionId: string;
  rawAnswer: string;
  normalizedAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  markedForReview: boolean;
}

export interface AttemptWithAnswers extends AttemptRecord {
  answers: AttemptAnswerRecord[];
}

export function createAttemptRepo(db: DatabaseHandle) {
  return {
    createAttempt(input: Pick<AttemptRecord, "mode" | "subject" | "startedAt">): AttemptRecord {
      const record: AttemptRecord = {
        id: randomUUID(),
        ...input,
        submittedAt: null,
        rawScore: null,
        estimatedBand: null
      };
      db.prepare(`
        INSERT INTO attempts (id, mode, subject, started_at, submitted_at, raw_score, estimated_band)
        VALUES (@id, @mode, @subject, @startedAt, @submittedAt, @rawScore, @estimatedBand)
      `).run(record);
      return record;
    },

    saveAnswer(input: Omit<AttemptAnswerRecord, "id">): AttemptAnswerRecord {
      const existing = db
        .prepare("SELECT id FROM attempt_answers WHERE attempt_id = ? AND question_id = ?")
        .get(input.attemptId, input.questionId) as { id: string } | undefined;
      const record: AttemptAnswerRecord = {
        id: existing?.id ?? randomUUID(),
        ...input
      };

      db.prepare(`
        INSERT INTO attempt_answers (
          id,
          attempt_id,
          question_id,
          raw_answer,
          normalized_answer,
          is_correct,
          time_spent_seconds,
          marked_for_review,
          updated_at
        )
        VALUES (
          @id,
          @attemptId,
          @questionId,
          @rawAnswer,
          @normalizedAnswer,
          @isCorrectInt,
          @timeSpentSeconds,
          @markedForReviewInt,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(attempt_id, question_id) DO UPDATE SET
          raw_answer = excluded.raw_answer,
          normalized_answer = excluded.normalized_answer,
          is_correct = excluded.is_correct,
          time_spent_seconds = excluded.time_spent_seconds,
          marked_for_review = excluded.marked_for_review,
          updated_at = CURRENT_TIMESTAMP
      `).run({
        ...record,
        isCorrectInt: record.isCorrect ? 1 : 0,
        markedForReviewInt: record.markedForReview ? 1 : 0
      });
      return record;
    },

    submitAttempt(input: {
      attemptId: string;
      submittedAt: string;
      rawScore: number;
      estimatedBand: number;
    }): void {
      db.prepare(`
        UPDATE attempts
        SET submitted_at = @submittedAt, raw_score = @rawScore, estimated_band = @estimatedBand
        WHERE id = @attemptId
      `).run(input);
    },

    getAttemptWithAnswers(attemptId: string): AttemptWithAnswers | null {
      const attempt = db
        .prepare(
          `
          SELECT
            id,
            mode,
            subject,
            started_at AS startedAt,
            submitted_at AS submittedAt,
            raw_score AS rawScore,
            estimated_band AS estimatedBand
          FROM attempts
          WHERE id = ?
        `
        )
        .get(attemptId) as AttemptRecord | undefined;

      if (!attempt) {
        return null;
      }

      const answers = db
        .prepare(
          `
          SELECT
            id,
            attempt_id AS attemptId,
            question_id AS questionId,
            raw_answer AS rawAnswer,
            normalized_answer AS normalizedAnswer,
            is_correct AS isCorrect,
            time_spent_seconds AS timeSpentSeconds,
            marked_for_review AS markedForReview
          FROM attempt_answers
          WHERE attempt_id = ?
          ORDER BY updated_at ASC
        `
        )
        .all(attemptId) as Array<Omit<AttemptAnswerRecord, "isCorrect" | "markedForReview"> & {
        isCorrect: number;
        markedForReview: number;
      }>;

      return {
        ...attempt,
        answers: answers.map((answer) => ({
          ...answer,
          isCorrect: answer.isCorrect === 1,
          markedForReview: answer.markedForReview === 1
        }))
      };
    }
  };
}
