import type { FrequencyClass, Part, Subject } from "@ielts/shared";
import type { QuestionType } from "@ielts/shared/questionTypes";
import type { DatabaseHandle } from "../db/database";

export interface CandidatePassage {
  id: string;
  sourceId: string;
  subject: Subject;
  part: Part;
  title: string;
  frequencyClass: FrequencyClass;
  lastCompletedAt: string | null;
  selectionWeight: number;
}

export interface CandidateFilters {
  subject?: Subject;
  part?: Part;
  frequencyClass?: FrequencyClass;
  questionType?: QuestionType;
  mistakeLabel?: string;
}

export interface TestBuilderOptions {
  random?: () => number;
  now?: string;
}

export function calculateSelectionWeight(input: {
  frequencyClass: FrequencyClass;
  lastCompletedAt: string | null;
  now?: string;
}): number {
  const baseWeightByFrequency: Record<FrequencyClass, number> = {
    high: 5,
    medium: 3,
    low: 1,
    unknown: 1
  };
  const baseWeight = baseWeightByFrequency[input.frequencyClass];

  if (!input.lastCompletedAt) {
    return baseWeight;
  }

  const nowMs = new Date(input.now ?? new Date().toISOString()).getTime();
  const completedMs = new Date(input.lastCompletedAt).getTime();
  const ageDays = (nowMs - completedMs) / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) {
    return baseWeight * 0.1;
  }
  if (ageDays <= 30) {
    return baseWeight * 0.4;
  }
  return baseWeight;
}

export function weightedPick<T extends { selectionWeight: number }>(
  candidates: T[],
  random: () => number = Math.random
): T | null {
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.selectionWeight, 0);
  if (totalWeight <= 0) {
    return candidates[0] ?? null;
  }

  let cursor = random() * totalWeight;
  for (const candidate of candidates) {
    cursor -= candidate.selectionWeight;
    if (cursor <= 0) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1] ?? null;
}

export function filterCandidatePassages(
  db: DatabaseHandle,
  filters: CandidateFilters = {},
  options: TestBuilderOptions = {}
): CandidatePassage[] {
  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters.subject) {
    where.push("p.subject = @subject");
    params.subject = filters.subject;
  }
  if (filters.part) {
    where.push("p.part = @part");
    params.part = filters.part;
  }
  if (filters.frequencyClass) {
    where.push("p.frequency_class = @frequencyClass");
    params.frequencyClass = filters.frequencyClass;
  }
  if (filters.questionType) {
    where.push(
      "EXISTS (SELECT 1 FROM questions q_filter WHERE q_filter.passage_id = p.id AND q_filter.question_type = @questionType)"
    );
    params.questionType = filters.questionType;
  }
  if (filters.mistakeLabel) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM questions q_mistake
        JOIN attempt_answers aa_mistake ON aa_mistake.question_id = q_mistake.id
        JOIN mistake_labels ml ON ml.attempt_answer_id = aa_mistake.id
        WHERE q_mistake.passage_id = p.id AND ml.label = @mistakeLabel
      )
    `);
    params.mistakeLabel = filters.mistakeLabel;
  }

  const rows = db
    .prepare(
      `
      SELECT
        p.id,
        p.source_id AS sourceId,
        p.subject,
        p.part,
        p.title,
        p.frequency_class AS frequencyClass,
        MAX(a.submitted_at) AS lastCompletedAt
      FROM passages p
      LEFT JOIN questions q ON q.passage_id = p.id
      LEFT JOIN attempt_answers aa ON aa.question_id = q.id
      LEFT JOIN attempts a ON a.id = aa.attempt_id AND a.submitted_at IS NOT NULL
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      GROUP BY p.id
      ORDER BY p.part ASC, p.title ASC
    `
    )
    .all(params) as Array<Omit<CandidatePassage, "selectionWeight">>;

  return rows.map((row) => ({
    ...row,
    selectionWeight: calculateSelectionWeight({
      frequencyClass: row.frequencyClass,
      lastCompletedAt: row.lastCompletedAt,
      now: options.now
    })
  }));
}

function buildFullSet(
  db: DatabaseHandle,
  subject: Subject,
  parts: Part[],
  options: TestBuilderOptions = {}
): { subject: Subject; passages: CandidatePassage[] } {
  const random = options.random ?? Math.random;
  const passages = parts.map((part) => {
    const candidates = filterCandidatePassages(db, { subject, part }, options);
    const selected = weightedPick(candidates, random);
    if (!selected) {
      throw new Error(`No ${subject} candidate found for ${part}.`);
    }
    return selected;
  });

  return { subject, passages };
}

export function buildFullListeningSet(
  db: DatabaseHandle,
  options: TestBuilderOptions = {}
): { subject: "listening"; passages: CandidatePassage[] } {
  return buildFullSet(db, "listening", ["P1", "P2", "P3", "P4"], options) as {
    subject: "listening";
    passages: CandidatePassage[];
  };
}

export function buildFullReadingSet(
  db: DatabaseHandle,
  options: TestBuilderOptions = {}
): { subject: "reading"; passages: CandidatePassage[] } {
  return buildFullSet(db, "reading", ["P1", "P2", "P3"], options) as {
    subject: "reading";
    passages: CandidatePassage[];
  };
}
