import type { FrequencyClass, Subject } from "@ielts/shared";
import type { DatabaseHandle } from "../db/database";
import { buildFullListeningSet, buildFullReadingSet, type CandidatePassage } from "./testBuilder";

interface SubjectOverview {
  cueCount: number;
  frequency: Record<FrequencyClass, number>;
  passageCount: number;
  questionCount: number;
}

export interface StudyOverview {
  readiness: {
    listeningFullMockReady: boolean;
    readingFullMockReady: boolean;
  };
  recommendedMockSets: {
    listening: { passages: CandidatePassage[]; subject: "listening" } | null;
    reading: { passages: CandidatePassage[]; subject: "reading" } | null;
  };
  subjects: Record<Subject, SubjectOverview>;
}

export interface IntensiveStudyPreview {
  listening: {
    audioPath: string | null;
    audioTitle: string;
    cues: Array<{
      endSeconds: number;
      id: string;
      label: string | null;
      startSeconds: number;
      transcript: string | null;
    }>;
    passageId: string;
  } | null;
  reading: {
    attemptAnswerId: string | null;
    answerKeyId: string;
    answerSentence: string | null;
    explanation: string | null;
    keywords: string[];
    passageText: string;
    passageTitle: string;
    questionPrompt: string;
    synonyms: string[];
  } | null;
}

const emptyFrequency = (): Record<FrequencyClass, number> => ({
  high: 0,
  low: 0,
  medium: 0,
  unknown: 0
});

function summarizeSubject(db: DatabaseHandle, subject: Subject): SubjectOverview {
  const passageRows = db
    .prepare(
      `
      SELECT frequency_class AS frequencyClass, COUNT(*) AS count
      FROM passages
      WHERE subject = ?
      GROUP BY frequency_class
    `
    )
    .all(subject) as Array<{ count: number; frequencyClass: FrequencyClass }>;
  const questionRow = db
    .prepare(
      `
      SELECT COUNT(q.id) AS count
      FROM questions q
      JOIN passages p ON p.id = q.passage_id
      WHERE p.subject = ?
    `
    )
    .get(subject) as { count: number };
  const cueRow = db
    .prepare(
      `
      SELECT COUNT(lc.id) AS count
      FROM listening_cues lc
      JOIN passages p ON p.id = lc.passage_id
      WHERE p.subject = ?
    `
    )
    .get(subject) as { count: number };
  const frequency = emptyFrequency();

  for (const row of passageRows) {
    frequency[row.frequencyClass] = row.count;
  }

  return {
    cueCount: cueRow.count,
    frequency,
    passageCount: passageRows.reduce((sum, row) => sum + row.count, 0),
    questionCount: questionRow.count
  };
}

function tryBuildSet<T>(builder: () => T): T | null {
  try {
    return builder();
  } catch {
    return null;
  }
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function parseKeywords(answerRulesJson: string): string[] {
  try {
    const rules = JSON.parse(answerRulesJson) as { keywords?: unknown };
    if (!Array.isArray(rules.keywords)) {
      return [];
    }

    return [
      ...new Set(
        rules.keywords
          .filter((keyword): keyword is string => typeof keyword === "string")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      )
    ];
  } catch {
    return [];
  }
}

function getListeningPreview(db: DatabaseHandle): IntensiveStudyPreview["listening"] {
  const passage = db
    .prepare(
      `
      SELECT
        p.id,
        p.title,
        la.file_path AS audioPath
      FROM passages p
      LEFT JOIN listening_audio la ON la.passage_id = p.id
      WHERE p.subject = 'listening'
      ORDER BY
        CASE p.frequency_class
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          WHEN 'low' THEN 2
          ELSE 3
        END,
        p.part ASC,
        p.title ASC
      LIMIT 1
    `
    )
    .get() as { audioPath: string | null; id: string; title: string } | undefined;

  if (!passage) {
    return null;
  }

  const cues = db
    .prepare(
      `
      SELECT
        id,
        start_seconds AS startSeconds,
        end_seconds AS endSeconds,
        label,
        transcript
      FROM listening_cues
      WHERE passage_id = ?
      ORDER BY start_seconds ASC
    `
    )
    .all(passage.id) as NonNullable<IntensiveStudyPreview["listening"]>["cues"];

  return {
    audioPath: passage.audioPath,
    audioTitle: passage.title,
    cues,
    passageId: passage.id
  };
}

function getReadingPreview(db: DatabaseHandle): IntensiveStudyPreview["reading"] {
  const row = db
    .prepare(
      `
      SELECT
        aa.id AS attemptAnswerId,
        ak.id AS answerKeyId,
        p.title AS passageTitle,
        q.prompt AS questionPrompt,
        ak.answer_sentence AS answerSentence,
        ak.explanation,
        ak.synonyms_json AS synonymsJson,
        q.answer_rules_json AS answerRulesJson,
        COALESCE(sa.text_content, '') AS passageText
      FROM questions q
      JOIN passages p ON p.id = q.passage_id
      JOIN answer_keys ak ON ak.question_id = q.id
      LEFT JOIN attempt_answers aa ON aa.question_id = q.id
        AND aa.is_correct = 0
      LEFT JOIN source_assets sa ON sa.source_id = p.source_id
        AND sa.asset_kind IN ('html', 'docx', 'pdf')
        AND sa.text_content IS NOT NULL
        AND TRIM(sa.text_content) != ''
      WHERE p.subject = 'reading'
      ORDER BY
        CASE WHEN aa.id IS NOT NULL THEN 0 ELSE 1 END,
        aa.updated_at DESC,
        CASE
          WHEN ak.answer_sentence IS NULL OR TRIM(ak.answer_sentence) = '' THEN 0
          ELSE 1
        END,
        CASE
          WHEN ak.explanation IS NULL OR TRIM(ak.explanation) = '' THEN 0
          ELSE 1
        END,
        CASE p.frequency_class
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          WHEN 'low' THEN 2
          ELSE 3
        END,
        p.part ASC,
        q.question_number ASC
      LIMIT 1
    `
    )
    .get() as
    | {
        attemptAnswerId: string | null;
        answerKeyId: string;
        answerSentence: string | null;
        answerRulesJson: string;
        explanation: string | null;
        passageText: string;
        passageTitle: string;
        questionPrompt: string;
        synonymsJson: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    attemptAnswerId: row.attemptAnswerId,
    answerKeyId: row.answerKeyId,
    answerSentence: row.answerSentence,
    explanation: row.explanation,
    keywords: parseKeywords(row.answerRulesJson),
    passageText: row.passageText || row.answerSentence || row.questionPrompt,
    passageTitle: row.passageTitle,
    questionPrompt: row.questionPrompt,
    synonyms: parseJson<string[]>(row.synonymsJson)
  };
}

export function createStudyService(db: DatabaseHandle) {
  return {
    getIntensivePreview(): IntensiveStudyPreview {
      return {
        listening: getListeningPreview(db),
        reading: getReadingPreview(db)
      };
    },

    getOverview(): StudyOverview {
      const listening = tryBuildSet(() => buildFullListeningSet(db, { random: () => 0 }));
      const reading = tryBuildSet(() => buildFullReadingSet(db, { random: () => 0 }));

      return {
        readiness: {
          listeningFullMockReady: listening !== null,
          readingFullMockReady: reading !== null
        },
        recommendedMockSets: {
          listening,
          reading
        },
        subjects: {
          listening: summarizeSubject(db, "listening"),
          reading: summarizeSubject(db, "reading")
        }
      };
    }
  };
}
