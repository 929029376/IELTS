import { randomUUID } from "node:crypto";
import { isAnswerCorrect, normalizeAnswer } from "@ielts/shared";
import type { DatabaseHandle } from "./database";

export interface ListeningCueRecord {
  id: string;
  passageId: string;
  startSeconds: number;
  endSeconds: number;
  label: string | null;
  transcript: string | null;
}

export interface DictationAttemptRecord {
  id: string;
  cueId: string;
  userText: string;
  normalizedText: string;
  isCorrect: boolean | null;
}

type ListeningCueUpdateInput = Pick<ListeningCueRecord, "id" | "startSeconds" | "endSeconds" | "label" | "transcript">;

export function createIntensiveRepo(db: DatabaseHandle) {
  return {
    createListeningCue(input: Omit<ListeningCueRecord, "id">): ListeningCueRecord {
      const record: ListeningCueRecord = { id: randomUUID(), ...input };
      db.prepare(`
        INSERT INTO listening_cues (id, passage_id, start_seconds, end_seconds, label, transcript)
        VALUES (@id, @passageId, @startSeconds, @endSeconds, @label, @transcript)
      `).run(record);
      return record;
    },

    updateListeningCue(input: ListeningCueUpdateInput): void {
      db.prepare(`
        UPDATE listening_cues
        SET start_seconds = @startSeconds,
            end_seconds = @endSeconds,
            label = @label,
            transcript = @transcript
        WHERE id = @id
      `).run(input);
    },

    listListeningCues(passageId: string): ListeningCueRecord[] {
      return db
        .prepare(
          `
          SELECT
            id,
            passage_id AS passageId,
            start_seconds AS startSeconds,
            end_seconds AS endSeconds,
            label,
            transcript
          FROM listening_cues
          WHERE passage_id = ?
          ORDER BY start_seconds ASC
        `
        )
        .all(passageId) as ListeningCueRecord[];
    },

    saveDictationAttempt(input: { cueId: string; userText: string }): DictationAttemptRecord {
      const cue = db
        .prepare("SELECT transcript FROM listening_cues WHERE id = ?")
        .get(input.cueId) as { transcript: string | null } | undefined;
      if (!cue) {
        throw new Error("Listening cue not found.");
      }

      const normalizedText = normalizeAnswer(input.userText);
      const isCorrect = cue.transcript ? isAnswerCorrect(input.userText, [cue.transcript]) : null;
      const record: DictationAttemptRecord = {
        id: randomUUID(),
        cueId: input.cueId,
        userText: input.userText,
        normalizedText,
        isCorrect
      };

      db.prepare(`
        INSERT INTO dictation_attempts (id, cue_id, user_text, normalized_text, is_correct)
        VALUES (@id, @cueId, @userText, @normalizedText, @isCorrectInt)
      `).run({
        ...record,
        isCorrectInt: record.isCorrect === null ? null : record.isCorrect ? 1 : 0
      });

      return record;
    },

    listDictationAttempts(cueId: string): DictationAttemptRecord[] {
      const rows = db
        .prepare(
          `
          SELECT
            id,
            cue_id AS cueId,
            user_text AS userText,
            normalized_text AS normalizedText,
            is_correct AS isCorrect
          FROM dictation_attempts
          WHERE cue_id = ?
          ORDER BY created_at ASC
        `
        )
        .all(cueId) as Array<Omit<DictationAttemptRecord, "isCorrect"> & { isCorrect: number | null }>;

      return rows.map((row) => ({
        ...row,
        isCorrect: row.isCorrect === null ? null : row.isCorrect === 1
      }));
    }
  };
}
