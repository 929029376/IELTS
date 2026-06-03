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

export function createStudyService(db: DatabaseHandle) {
  return {
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
