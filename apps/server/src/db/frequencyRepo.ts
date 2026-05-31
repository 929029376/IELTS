import { randomUUID } from "node:crypto";
import type { FrequencyClass, Part, Subject } from "@ielts/shared";
import type { DatabaseHandle } from "./database";

export interface FrequencyEntryRecord {
  id: string;
  sourceMonth: string;
  subject: Subject;
  part: Part;
  englishTitle: string;
  chineseTitle: string | null;
  frequencyClass: FrequencyClass;
  difficulty: number | null;
}

export function createFrequencyRepo(db: DatabaseHandle) {
  return {
    upsertFrequencyEntry(input: Omit<FrequencyEntryRecord, "id">): FrequencyEntryRecord {
      const existing = db
        .prepare(
          `
          SELECT id
          FROM frequency_entries
          WHERE source_month = ? AND subject = ? AND part = ? AND english_title = ?
        `
        )
        .get(input.sourceMonth, input.subject, input.part, input.englishTitle) as
        | { id: string }
        | undefined;
      const record: FrequencyEntryRecord = { id: existing?.id ?? randomUUID(), ...input };

      db.prepare(`
        INSERT INTO frequency_entries (
          id,
          source_month,
          subject,
          part,
          english_title,
          chinese_title,
          frequency_class,
          difficulty,
          updated_at
        )
        VALUES (
          @id,
          @sourceMonth,
          @subject,
          @part,
          @englishTitle,
          @chineseTitle,
          @frequencyClass,
          @difficulty,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(source_month, subject, part, english_title) DO UPDATE SET
          chinese_title = excluded.chinese_title,
          frequency_class = excluded.frequency_class,
          difficulty = excluded.difficulty,
          updated_at = CURRENT_TIMESTAMP
      `).run(record);
      return record;
    },

    listFrequencyEntries(): FrequencyEntryRecord[] {
      return db
        .prepare(
          `
          SELECT
            id,
            source_month AS sourceMonth,
            subject,
            part,
            english_title AS englishTitle,
            chinese_title AS chineseTitle,
            frequency_class AS frequencyClass,
            difficulty
          FROM frequency_entries
          ORDER BY source_month DESC, part ASC, english_title ASC
        `
        )
        .all() as FrequencyEntryRecord[];
    }
  };
}
