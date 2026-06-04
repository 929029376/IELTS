import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FrequencyClass, Part, Subject } from "@ielts/shared";
import { dataDir } from "../config/paths";
import type { DatabaseHandle } from "../db/database";

export interface HistoryAttempt {
  durationSeconds: number | null;
  estimatedBand: number | null;
  id: string;
  mode: "practice" | "mock" | "intensive";
  rawScore: number | null;
  startedAt: string;
  subject: Subject;
  submittedAt: string;
}

export interface AccuracyBucket {
  accuracy: number;
  correct: number;
  total: number;
}

export interface AccuracyAnalytics {
  byFrequencyClass: Partial<Record<FrequencyClass, AccuracyBucket>>;
  byPart: Record<Subject, Partial<Record<Part, AccuracyBucket>>>;
  byQuestionType: Record<string, AccuracyBucket>;
  mistakeLabels: Array<{ count: number; label: string }>;
}

export interface BandPrediction {
  basisAttempts: number;
  confidence: "low" | "medium" | "high";
  predictedBand: number | null;
  range: { max: number; min: number } | null;
  subject: Subject;
}

export interface DashboardReport {
  latestMockScore: HistoryAttempt | null;
  predictedListening: BandPrediction;
  predictedReading: BandPrediction;
  recommendedNextPractice: string | null;
  weakestQuestionType: string | null;
}

export interface AnalyticsServiceOptions {
  exportDir?: string;
  now?: string;
}

interface AnswerAnalyticsRow {
  frequencyClass: FrequencyClass;
  isCorrect: number;
  part: Part;
  questionType: string;
  subject: Subject;
}

interface PredictionRow {
  estimatedBand: number | null;
  mode: "practice" | "mock" | "intensive";
  submittedAt: string;
}

function calculateDurationSeconds(startedAt: string, submittedAt: string | null) {
  if (!submittedAt) {
    return null;
  }

  return Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

function emptyBucket(): AccuracyBucket {
  return { accuracy: 0, correct: 0, total: 0 };
}

function addToBucket(target: Record<string, AccuracyBucket>, key: string, isCorrect: boolean) {
  const bucket = target[key] ?? emptyBucket();
  bucket.total += 1;
  if (isCorrect) {
    bucket.correct += 1;
  }
  bucket.accuracy = bucket.total === 0 ? 0 : bucket.correct / bucket.total;
  target[key] = bucket;
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function toCsv<T extends object>(rows: T[], columns: string[]) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape((row as Record<string, unknown>)[column])).join(","))
  ].join("\n");
}

function reportDate(now: string) {
  return now.slice(0, 10);
}

export function createAnalyticsService(db: DatabaseHandle, options: AnalyticsServiceOptions = {}) {
  const now = options.now ?? new Date().toISOString();
  const exportDir = options.exportDir ?? join(dataDir, "exports");

  function listHistory(): HistoryAttempt[] {
    const rows = db
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
        WHERE submitted_at IS NOT NULL
        ORDER BY submitted_at DESC
      `
      )
      .all() as Array<Omit<HistoryAttempt, "durationSeconds" | "submittedAt"> & { submittedAt: string }>;

    return rows.map((row) => ({
      ...row,
      durationSeconds: calculateDurationSeconds(row.startedAt, row.submittedAt)
    }));
  }

  function getAccuracyAnalytics(): AccuracyAnalytics {
    const byPart: AccuracyAnalytics["byPart"] = {
      listening: {},
      reading: {}
    };
    const byQuestionType: AccuracyAnalytics["byQuestionType"] = {};
    const byFrequencyClass: AccuracyAnalytics["byFrequencyClass"] = {};

    const rows = db
      .prepare(
        `
        SELECT
          p.subject,
          p.part,
          p.frequency_class AS frequencyClass,
          q.question_type AS questionType,
          COALESCE(aa.is_correct, 0) AS isCorrect
        FROM attempt_questions aq
        JOIN attempts a ON a.id = aq.attempt_id
        JOIN questions q ON q.id = aq.question_id
        JOIN passages p ON p.id = q.passage_id
        LEFT JOIN attempt_answers aa
          ON aa.attempt_id = aq.attempt_id AND aa.question_id = aq.question_id
        WHERE a.submitted_at IS NOT NULL
        UNION ALL
        SELECT
          p.subject,
          p.part,
          p.frequency_class AS frequencyClass,
          q.question_type AS questionType,
          aa.is_correct AS isCorrect
        FROM attempt_answers aa
        JOIN attempts a ON a.id = aa.attempt_id
        JOIN questions q ON q.id = aa.question_id
        JOIN passages p ON p.id = q.passage_id
        WHERE a.submitted_at IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM attempt_questions aq
            WHERE aq.attempt_id = a.id
          )
      `
      )
      .all() as AnswerAnalyticsRow[];

    for (const row of rows) {
      addToBucket(byPart[row.subject] as Record<string, AccuracyBucket>, row.part, row.isCorrect === 1);
      addToBucket(byQuestionType, row.questionType, row.isCorrect === 1);
      addToBucket(byFrequencyClass as Record<string, AccuracyBucket>, row.frequencyClass, row.isCorrect === 1);
    }

    const mistakeLabels = db
      .prepare(
        `
        SELECT ml.label, COUNT(*) AS count
        FROM mistake_labels ml
        JOIN attempt_answers aa ON aa.id = ml.attempt_answer_id
        JOIN attempts a ON a.id = aa.attempt_id
        WHERE a.submitted_at IS NOT NULL
        GROUP BY ml.label
        ORDER BY count DESC, ml.label ASC
      `
      )
      .all() as Array<{ count: number; label: string }>;

    return { byFrequencyClass, byPart, byQuestionType, mistakeLabels };
  }

  function predictBand(subject: Subject): BandPrediction {
    const rows = db
      .prepare(
        `
        SELECT mode, submitted_at AS submittedAt, estimated_band AS estimatedBand
        FROM attempts
        WHERE subject = ? AND submitted_at IS NOT NULL AND estimated_band IS NOT NULL
        ORDER BY submitted_at DESC
      `
      )
      .all(subject) as PredictionRow[];

    if (rows.length === 0) {
      return {
        basisAttempts: 0,
        confidence: "low",
        predictedBand: null,
        range: null,
        subject
      };
    }

    const nowMs = new Date(now).getTime();
    let weightedTotal = 0;
    let totalWeight = 0;
    let mockCount = 0;

    for (const row of rows) {
      if (row.estimatedBand === null) {
        continue;
      }
      if (row.mode === "mock") {
        mockCount += 1;
      }

      const ageDays = (nowMs - new Date(row.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.max(0.4, 1 - ageDays / 90);
      const modeWeight = row.mode === "mock" ? 2 : row.mode === "practice" ? 1 : 0.5;
      const weight = modeWeight * recencyWeight;
      weightedTotal += row.estimatedBand * weight;
      totalWeight += weight;
    }

    const predictedBand = roundToHalf(weightedTotal / totalWeight);
    const confidence = mockCount >= 3 ? "high" : mockCount >= 1 && rows.length >= 3 ? "medium" : "low";

    return {
      basisAttempts: rows.length,
      confidence,
      predictedBand,
      range: {
        max: Math.min(9, predictedBand + 0.5),
        min: Math.max(0, predictedBand - 0.5)
      },
      subject
    };
  }

  function getDashboardReport(): DashboardReport {
    const history = listHistory();
    const analytics = getAccuracyAnalytics();
    const weakestQuestionType =
      Object.entries(analytics.byQuestionType)
        .filter(([, bucket]) => bucket.total > 0)
        .sort(([, left], [, right]) => left.accuracy - right.accuracy || right.total - left.total)[0]?.[0] ?? null;
    const latestMockScore = history.find((attempt) => attempt.mode === "mock") ?? null;

    return {
      latestMockScore,
      predictedListening: predictBand("listening"),
      predictedReading: predictBand("reading"),
      recommendedNextPractice: weakestQuestionType ? `Review ${weakestQuestionType} questions` : null,
      weakestQuestionType
    };
  }

  function exportReports() {
    mkdirSync(exportDir, { recursive: true });

    const date = reportDate(now);
    const history = listHistory();
    const mockRows = history.filter((attempt) => attempt.mode === "mock");
    const mockJson = join(exportDir, `mock-report-${date}.json`);
    const mockCsv = join(exportDir, `mock-report-${date}.csv`);
    const mistakesCsv = join(exportDir, `mistakes-${date}.csv`);

    writeFileSync(mockJson, `${JSON.stringify(mockRows, null, 2)}\n`);
    writeFileSync(
      mockCsv,
      `${toCsv(mockRows, ["subject", "mode", "submittedAt", "rawScore", "estimatedBand", "durationSeconds"])}\n`
    );

    const mistakeRows = db
      .prepare(
        `
        SELECT
          p.subject,
          p.part,
          p.title AS passageTitle,
          q.question_number AS questionNumber,
          q.question_type AS questionType,
          ml.label
        FROM mistake_labels ml
        JOIN attempt_answers aa ON aa.id = ml.attempt_answer_id
        JOIN attempts a ON a.id = aa.attempt_id
        JOIN questions q ON q.id = aa.question_id
        JOIN passages p ON p.id = q.passage_id
        WHERE a.submitted_at IS NOT NULL
        ORDER BY a.submitted_at DESC, p.subject ASC, p.part ASC, q.question_number ASC
      `
      )
      .all() as Array<Record<string, string | number | null>>;

    writeFileSync(
      mistakesCsv,
      `${toCsv(mistakeRows, ["subject", "part", "passageTitle", "questionNumber", "questionType", "label"])}\n`
    );

    return { mistakesCsv, mockCsv, mockJson };
  }

  return {
    exportReports,
    getAccuracyAnalytics,
    getDashboardReport,
    listHistory,
    predictBand
  };
}
