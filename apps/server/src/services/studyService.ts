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
    audioTitle: string;
    cues: Array<{
      endSeconds: number;
      id: string;
      label: string | null;
      startSeconds: number;
      transcript: string | null;
    }>;
  } | null;
  reading: {
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

function getListeningPreview(db: DatabaseHandle): IntensiveStudyPreview["listening"] {
  const passage = db
    .prepare(
      `
      SELECT
        p.id,
        p.title
      FROM passages p
      WHERE p.subject = 'listening'
        AND EXISTS (
          SELECT 1
          FROM listening_cues lc
          WHERE lc.passage_id = p.id
        )
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
    .get() as { id: string; title: string } | undefined;

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
    audioTitle: passage.title,
    cues
  };
}

function getReadingPreview(db: DatabaseHandle): IntensiveStudyPreview["reading"] {
  const row = db
    .prepare(
      `
      SELECT
        p.title AS passageTitle,
        q.prompt AS questionPrompt,
        ak.answer_sentence AS answerSentence,
        ak.explanation,
        ak.synonyms_json AS synonymsJson,
        COALESCE(sa.text_content, '') AS passageText
      FROM questions q
      JOIN passages p ON p.id = q.passage_id
      JOIN answer_keys ak ON ak.question_id = q.id
      LEFT JOIN source_assets sa ON sa.source_id = p.source_id
        AND sa.asset_kind IN ('html', 'docx', 'pdf')
        AND sa.text_content IS NOT NULL
        AND TRIM(sa.text_content) != ''
      WHERE p.subject = 'reading'
        AND (
          (ak.answer_sentence IS NOT NULL AND TRIM(ak.answer_sentence) != '')
          OR (ak.explanation IS NOT NULL AND TRIM(ak.explanation) != '')
        )
      ORDER BY
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
        answerSentence: string | null;
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
    answerSentence: row.answerSentence,
    explanation: row.explanation,
    keywords: [],
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
