import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { FrequencyClass, Part, Subject } from "@ielts/shared";
import { dataDir } from "../config/paths";
import type { DatabaseHandle } from "../db/database";

export interface HardeningServiceOptions {
  backupDir?: string;
  backupReminderAttemptThreshold?: number;
  backupReminderFreshDays?: number;
  now?: string;
}

export interface ImportFailureReport {
  byStatus: Record<string, number>;
  sources: Array<{
    assetCount: number;
    createdAt: string;
    id: string;
    importStatus: string;
    originalPath: string;
    sourceType: string;
    version: number;
  }>;
  totalUnresolved: number;
}

export interface QuestionBankCompleteness {
  issueCounts: Record<CompletenessIssue, number>;
  passages: Array<{
    frequencyClass: FrequencyClass;
    id: string;
    issueLabels: string[];
    part: Part;
    questionCount: number;
    sourceStatus: string;
    subject: Subject;
    title: string;
  }>;
  totalPassages: number;
}

export interface BackupReminder {
  latestBackupAt: string | null;
  reason: string | null;
  shouldRemind: boolean;
  submittedAttemptCount: number;
}

type CompletenessIssue =
  | "missingAnswerKey"
  | "missingAnswerSentence"
  | "missingAudio"
  | "missingExplanation"
  | "missingFrequencyEntry"
  | "missingListeningCues"
  | "missingTranscript";

interface PassageCompletenessRow {
  answerKeysMissingAnswerSentence: number;
  answerKeysMissingExplanation: number;
  frequencyClass: FrequencyClass;
  frequencyEntryCount: number;
  id: string;
  listeningAudioCount: number;
  listeningCueCount: number;
  listeningCueTranscriptCount: number;
  missingAnswerKeyQuestions: number;
  part: Part;
  questionCount: number;
  sourceStatus: string;
  subject: Subject;
  title: string;
}

const issueLabels: Record<CompletenessIssue, string> = {
  missingAnswerKey: "missing answer key",
  missingAnswerSentence: "missing answer sentence",
  missingAudio: "missing audio",
  missingExplanation: "missing explanation",
  missingFrequencyEntry: "missing frequency entry",
  missingListeningCues: "missing listening cues",
  missingTranscript: "missing transcript"
};

function emptyIssueCounts(): Record<CompletenessIssue, number> {
  return {
    missingAnswerKey: 0,
    missingAnswerSentence: 0,
    missingAudio: 0,
    missingExplanation: 0,
    missingFrequencyEntry: 0,
    missingListeningCues: 0,
    missingTranscript: 0
  };
}

function readBackupExportedAt(filePath: string): string | null {
  try {
    const payload = JSON.parse(readFileSync(filePath, "utf8")) as { exportedAt?: unknown };
    return typeof payload.exportedAt === "string" ? payload.exportedAt : null;
  } catch {
    return null;
  }
}

function latestBackupTimestamp(backupDir: string): string | null {
  if (!existsSync(backupDir)) {
    return null;
  }

  const backupFiles = readdirSync(backupDir)
    .filter((fileName) => fileName.startsWith("ielts-backup-") && fileName.endsWith(".json"))
    .map((fileName) => join(backupDir, fileName));

  if (backupFiles.length === 0) {
    return null;
  }

  return backupFiles
    .map((filePath) => readBackupExportedAt(filePath) ?? statSync(filePath).mtime.toISOString())
    .sort()
    .at(-1) ?? null;
}

function daysBetween(leftIso: string, rightIso: string) {
  return (new Date(leftIso).getTime() - new Date(rightIso).getTime()) / (1000 * 60 * 60 * 24);
}

export function createHardeningService(db: DatabaseHandle, options: HardeningServiceOptions = {}) {
  const now = options.now ?? new Date().toISOString();
  const backupDir = options.backupDir ?? join(dataDir, "backups");
  const backupReminderAttemptThreshold = options.backupReminderAttemptThreshold ?? 10;
  const backupReminderFreshDays = options.backupReminderFreshDays ?? 7;

  function getImportFailureReport(): ImportFailureReport {
    const sources = db
      .prepare(
        `
        SELECT
          s.id,
          s.source_type AS sourceType,
          s.original_path AS originalPath,
          s.import_status AS importStatus,
          s.version,
          s.created_at AS createdAt,
          COUNT(sa.id) AS assetCount
        FROM sources s
        LEFT JOIN source_assets sa ON sa.source_id = s.id
        WHERE s.import_status != 'imported'
        GROUP BY s.id
        ORDER BY
          CASE s.import_status
            WHEN 'failed' THEN 0
            WHEN 'needs_review' THEN 1
            ELSE 2
          END ASC,
          s.created_at ASC,
          s.original_path ASC
      `
      )
      .all() as ImportFailureReport["sources"];
    const byStatus: Record<string, number> = {};

    for (const source of sources) {
      byStatus[source.importStatus] = (byStatus[source.importStatus] ?? 0) + 1;
    }

    return {
      byStatus,
      sources,
      totalUnresolved: sources.length
    };
  }

  function getQuestionBankCompleteness(): QuestionBankCompleteness {
    const issueCounts = emptyIssueCounts();
    const rows = db
      .prepare(
        `
        SELECT
          p.id,
          p.subject,
          p.part,
          p.title,
          p.frequency_class AS frequencyClass,
          s.import_status AS sourceStatus,
          COUNT(DISTINCT q.id) AS questionCount,
          COUNT(DISTINCT CASE WHEN ak.id IS NULL THEN q.id END) AS missingAnswerKeyQuestions,
          COUNT(DISTINCT CASE
            WHEN ak.id IS NOT NULL AND (ak.explanation IS NULL OR TRIM(ak.explanation) = '')
            THEN q.id
          END) AS answerKeysMissingExplanation,
          COUNT(DISTINCT CASE
            WHEN p.subject = 'reading'
              AND ak.id IS NOT NULL
              AND (ak.answer_sentence IS NULL OR TRIM(ak.answer_sentence) = '')
            THEN q.id
          END) AS answerKeysMissingAnswerSentence,
          COUNT(DISTINCT la.id) AS listeningAudioCount,
          COUNT(DISTINCT lc.id) AS listeningCueCount,
          COUNT(DISTINCT CASE
            WHEN lc.transcript IS NOT NULL AND TRIM(lc.transcript) != ''
            THEN lc.id
          END) AS listeningCueTranscriptCount,
          COUNT(DISTINCT fe.id) AS frequencyEntryCount
        FROM passages p
        JOIN sources s ON s.id = p.source_id
        LEFT JOIN questions q ON q.passage_id = p.id
        LEFT JOIN answer_keys ak ON ak.question_id = q.id
        LEFT JOIN listening_audio la ON la.passage_id = p.id
        LEFT JOIN listening_cues lc ON lc.passage_id = p.id
        LEFT JOIN frequency_entries fe
          ON fe.subject = p.subject
          AND fe.part = p.part
          AND LOWER(fe.english_title) = LOWER(p.title)
        GROUP BY p.id
        ORDER BY p.subject ASC, p.part ASC, p.title ASC
      `
      )
      .all() as PassageCompletenessRow[];

    const passages = rows.map((row) => {
      const issues: CompletenessIssue[] = [];
      if (row.questionCount === 0 || row.missingAnswerKeyQuestions > 0) {
        issues.push("missingAnswerKey");
      }
      if (row.answerKeysMissingExplanation > 0) {
        issues.push("missingExplanation");
      }
      if (row.answerKeysMissingAnswerSentence > 0) {
        issues.push("missingAnswerSentence");
      }
      if (row.subject === "listening" && row.listeningAudioCount === 0) {
        issues.push("missingAudio");
      }
      if (row.subject === "listening" && row.listeningCueCount === 0) {
        issues.push("missingListeningCues");
      }
      if (row.subject === "listening" && row.listeningCueTranscriptCount === 0) {
        issues.push("missingTranscript");
      }
      if (row.frequencyClass === "unknown" || row.frequencyEntryCount === 0) {
        issues.push("missingFrequencyEntry");
      }

      for (const issue of issues) {
        issueCounts[issue] += 1;
      }

      return {
        frequencyClass: row.frequencyClass,
        id: row.id,
        issueLabels: issues.map((issue) => issueLabels[issue]),
        part: row.part,
        questionCount: row.questionCount,
        sourceStatus: row.sourceStatus,
        subject: row.subject,
        title: row.title
      };
    });

    return {
      issueCounts,
      passages,
      totalPassages: rows.length
    };
  }

  function getBackupReminder(): BackupReminder {
    const submittedAttemptCount = (
      db.prepare("SELECT COUNT(*) AS count FROM attempts WHERE submitted_at IS NOT NULL").get() as { count: number }
    ).count;
    const latestBackupAt = latestBackupTimestamp(backupDir);
    const staleBackup = latestBackupAt === null || daysBetween(now, latestBackupAt) > backupReminderFreshDays;
    const shouldRemind = submittedAttemptCount >= backupReminderAttemptThreshold && staleBackup;

    return {
      latestBackupAt,
      reason: shouldRemind
        ? `You have ${submittedAttemptCount} submitted attempts and no recent backup.`
        : null,
      shouldRemind,
      submittedAttemptCount
    };
  }

  function getStatus() {
    return {
      backupReminder: getBackupReminder(),
      importFailures: getImportFailureReport(),
      questionBankCompleteness: getQuestionBankCompleteness()
    };
  }

  return {
    getBackupReminder,
    getImportFailureReport,
    getQuestionBankCompleteness,
    getStatus
  };
}
