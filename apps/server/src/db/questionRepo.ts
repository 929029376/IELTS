import { randomUUID } from "node:crypto";
import type { FrequencyClass, Part, Subject } from "@ielts/shared";
import type { QuestionType } from "@ielts/shared/questionTypes";
import type { DatabaseHandle } from "./database";

export interface SourceRecord {
  id: string;
  sourceType: string;
  originalPath: string;
  checksum: string;
  importStatus: string;
  version: number;
}

export interface SourceAssetRecord {
  id: string;
  sourceId: string;
  assetKind: "html" | "docx" | "pdf" | "audio" | "other";
  originalName: string;
  filePath: string | null;
  textContent: string | null;
  checksum: string | null;
}

export interface PassageRecord {
  id: string;
  sourceId: string;
  subject: Subject;
  part: Part;
  title: string;
  frequencyClass: FrequencyClass;
}

export interface QuestionRecord {
  id: string;
  passageId: string;
  questionNumber: number;
  questionType: QuestionType;
  prompt: string;
  answerRules: Record<string, unknown>;
}

export interface AnswerKeyRecord {
  id: string;
  questionId: string;
  acceptedAnswers: string[];
  answerSentence: string | null;
  explanation: string | null;
  synonyms: string[];
}

export interface PassageWithQuestions extends PassageRecord {
  questions: Array<QuestionRecord & { answerKeys: AnswerKeyRecord[] }>;
}

export interface PracticeQuestionRecord extends QuestionRecord {
  passageTitle: string;
  subject: Subject;
  part: Part;
  answerKeys: AnswerKeyRecord[];
}

export interface ListeningAudioRecord {
  id: string;
  passageId: string;
  filePath: string;
  durationSeconds: number | null;
  checksum: string | null;
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function createQuestionRepo(db: DatabaseHandle) {
  function listAnswerKeys(questionId: string): AnswerKeyRecord[] {
    return (db
      .prepare(
        `
        SELECT
          id,
          question_id AS questionId,
          accepted_answers_json AS acceptedAnswersJson,
          answer_sentence AS answerSentence,
          explanation,
          synonyms_json AS synonymsJson
        FROM answer_keys
        WHERE question_id = ?
        ORDER BY created_at ASC
      `
      )
      .all(questionId) as Array<{
      id: string;
      questionId: string;
      acceptedAnswersJson: string;
      answerSentence: string | null;
      explanation: string | null;
      synonymsJson: string;
    }>).map((answer) => ({
      id: answer.id,
      questionId: answer.questionId,
      acceptedAnswers: parseJson<string[]>(answer.acceptedAnswersJson),
      answerSentence: answer.answerSentence,
      explanation: answer.explanation,
      synonyms: parseJson<string[]>(answer.synonymsJson)
    }));
  }

  return {
    createSource(input: Omit<SourceRecord, "id">): SourceRecord {
      const record: SourceRecord = { id: randomUUID(), ...input };
      db.prepare(`
        INSERT INTO sources (id, source_type, original_path, checksum, import_status, version)
        VALUES (@id, @sourceType, @originalPath, @checksum, @importStatus, @version)
      `).run(record);
      return record;
    },

    findSourceByChecksum(checksum: string): SourceRecord | null {
      const row = db
        .prepare(
          `
          SELECT
            id,
            source_type AS sourceType,
            original_path AS originalPath,
            checksum,
            import_status AS importStatus,
            version
          FROM sources
          WHERE checksum = ?
        `
        )
        .get(checksum) as SourceRecord | undefined;

      return row ?? null;
    },

    createSourceAsset(input: Omit<SourceAssetRecord, "id">): SourceAssetRecord {
      const record: SourceAssetRecord = { id: randomUUID(), ...input };
      db.prepare(`
        INSERT INTO source_assets (
          id, source_id, asset_kind, original_name, file_path, text_content, checksum
        )
        VALUES (@id, @sourceId, @assetKind, @originalName, @filePath, @textContent, @checksum)
      `).run(record);
      return record;
    },

    listSourceAssets(sourceId: string): SourceAssetRecord[] {
      return db
        .prepare(
          `
          SELECT
            id,
            source_id AS sourceId,
            asset_kind AS assetKind,
            original_name AS originalName,
            file_path AS filePath,
            text_content AS textContent,
            checksum
          FROM source_assets
          WHERE source_id = ?
          ORDER BY created_at ASC
        `
        )
        .all(sourceId) as SourceAssetRecord[];
    },

    createPassage(input: Omit<PassageRecord, "id">): PassageRecord {
      const record: PassageRecord = { id: randomUUID(), ...input };
      db.prepare(`
        INSERT INTO passages (id, source_id, subject, part, title, frequency_class)
        VALUES (@id, @sourceId, @subject, @part, @title, @frequencyClass)
      `).run(record);
      return record;
    },

    listPassages(): PassageRecord[] {
      return db
        .prepare(
          `
          SELECT
            id,
            source_id AS sourceId,
            subject,
            part,
            title,
            frequency_class AS frequencyClass
          FROM passages
          ORDER BY subject ASC, part ASC, title ASC
        `
        )
        .all() as PassageRecord[];
    },

    createQuestion(input: Omit<QuestionRecord, "id">): QuestionRecord {
      const record: QuestionRecord = { id: randomUUID(), ...input };
      db.prepare(`
        INSERT INTO questions (id, passage_id, question_number, question_type, prompt, answer_rules_json)
        VALUES (@id, @passageId, @questionNumber, @questionType, @prompt, @answerRulesJson)
      `).run({
        ...record,
        answerRulesJson: JSON.stringify(record.answerRules)
      });
      return record;
    },

    createAnswerKey(input: Omit<AnswerKeyRecord, "id">): AnswerKeyRecord {
      const record: AnswerKeyRecord = { id: randomUUID(), ...input };
      db.prepare(`
        INSERT INTO answer_keys (
          id, question_id, accepted_answers_json, answer_sentence, explanation, synonyms_json
        )
        VALUES (@id, @questionId, @acceptedAnswersJson, @answerSentence, @explanation, @synonymsJson)
      `).run({
        ...record,
        acceptedAnswersJson: JSON.stringify(record.acceptedAnswers),
        synonymsJson: JSON.stringify(record.synonyms)
      });
      return record;
    },

    createListeningAudio(input: Omit<ListeningAudioRecord, "id">): ListeningAudioRecord {
      const record: ListeningAudioRecord = { id: randomUUID(), ...input };
      db.prepare(`
        INSERT INTO listening_audio (id, passage_id, file_path, duration_seconds, checksum)
        VALUES (@id, @passageId, @filePath, @durationSeconds, @checksum)
      `).run(record);
      return record;
    },

    getPassageWithQuestions(passageId: string): PassageWithQuestions | null {
      const passage = db
        .prepare(
          `
          SELECT
            id,
            source_id AS sourceId,
            subject,
            part,
            title,
            frequency_class AS frequencyClass
          FROM passages
          WHERE id = ?
        `
        )
        .get(passageId) as PassageRecord | undefined;

      if (!passage) {
        return null;
      }

      const questionRows = db
        .prepare(
          `
          SELECT
            id,
            passage_id AS passageId,
            question_number AS questionNumber,
            question_type AS questionType,
            prompt,
            answer_rules_json AS answerRulesJson
          FROM questions
          WHERE passage_id = ?
          ORDER BY question_number ASC
        `
        )
        .all(passageId) as Array<Omit<QuestionRecord, "answerRules"> & { answerRulesJson: string }>;

      const answerStatement = db.prepare(`
        SELECT
          id,
          question_id AS questionId,
          accepted_answers_json AS acceptedAnswersJson,
          answer_sentence AS answerSentence,
          explanation,
          synonyms_json AS synonymsJson
        FROM answer_keys
        WHERE question_id = ?
        ORDER BY created_at ASC
      `);

      return {
        ...passage,
        questions: questionRows.map((question) => ({
          id: question.id,
          passageId: question.passageId,
          questionNumber: question.questionNumber,
          questionType: question.questionType,
          prompt: question.prompt,
          answerRules: parseJson<Record<string, unknown>>(question.answerRulesJson),
          answerKeys: (answerStatement.all(question.id) as Array<{
            id: string;
            questionId: string;
            acceptedAnswersJson: string;
            answerSentence: string | null;
            explanation: string | null;
            synonymsJson: string;
          }>).map((answer) => ({
            id: answer.id,
            questionId: answer.questionId,
            acceptedAnswers: parseJson<string[]>(answer.acceptedAnswersJson),
            answerSentence: answer.answerSentence,
            explanation: answer.explanation,
            synonyms: parseJson<string[]>(answer.synonymsJson)
          }))
        }))
      };
    },

    getFirstPassageBySource(sourceId: string): PassageRecord | null {
      const row = db
        .prepare(
          `
          SELECT
            id,
            source_id AS sourceId,
            subject,
            part,
            title,
            frequency_class AS frequencyClass
          FROM passages
          WHERE source_id = ?
          ORDER BY created_at ASC
          LIMIT 1
        `
        )
        .get(sourceId) as PassageRecord | undefined;

      return row ?? null;
    },

    listPracticeQuestions(input: { subject: Subject; limit: number }): PracticeQuestionRecord[] {
      const rows = db
        .prepare(
          `
          SELECT
            q.id,
            q.passage_id AS passageId,
            q.question_number AS questionNumber,
            q.question_type AS questionType,
            q.prompt,
            q.answer_rules_json AS answerRulesJson,
            p.title AS passageTitle,
            p.subject,
            p.part
          FROM questions q
          JOIN passages p ON p.id = q.passage_id
          WHERE p.subject = ?
          ORDER BY p.part ASC, q.question_number ASC
          LIMIT ?
        `
        )
        .all(input.subject, input.limit) as Array<
        Omit<PracticeQuestionRecord, "answerRules" | "answerKeys"> & { answerRulesJson: string }
      >;

      return rows.map((row) => ({
        id: row.id,
        passageId: row.passageId,
        questionNumber: row.questionNumber,
        questionType: row.questionType,
        prompt: row.prompt,
        answerRules: parseJson<Record<string, unknown>>(row.answerRulesJson),
        passageTitle: row.passageTitle,
        subject: row.subject,
        part: row.part,
        answerKeys: listAnswerKeys(row.id)
      }));
    },

    getQuestionWithAnswerKeys(questionId: string): PracticeQuestionRecord | null {
      const row = db
        .prepare(
          `
          SELECT
            q.id,
            q.passage_id AS passageId,
            q.question_number AS questionNumber,
            q.question_type AS questionType,
            q.prompt,
            q.answer_rules_json AS answerRulesJson,
            p.title AS passageTitle,
            p.subject,
            p.part
          FROM questions q
          JOIN passages p ON p.id = q.passage_id
          WHERE q.id = ?
        `
        )
        .get(questionId) as
        | (Omit<PracticeQuestionRecord, "answerRules" | "answerKeys"> & { answerRulesJson: string })
        | undefined;

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        passageId: row.passageId,
        questionNumber: row.questionNumber,
        questionType: row.questionType,
        prompt: row.prompt,
        answerRules: parseJson<Record<string, unknown>>(row.answerRulesJson),
        passageTitle: row.passageTitle,
        subject: row.subject,
        part: row.part,
        answerKeys: listAnswerKeys(row.id)
      };
    },

    listAnswerKeys
  };
}
