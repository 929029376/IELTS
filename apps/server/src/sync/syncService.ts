import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { AttemptAnswerRecord, AttemptRecord } from "../db/attemptRepo";
import type { DatabaseHandle } from "../db/database";
import type { FrequencyEntryRecord } from "../db/frequencyRepo";
import type { DictationAttemptRecord, ListeningCueRecord } from "../db/intensiveRepo";
import { createSyncRepo } from "../db/syncRepo";

const syncJsonlFiles = [
  "attempts.jsonl",
  "answers.jsonl",
  "mistakes.jsonl",
  "stats.jsonl",
  "frequency.jsonl",
  "imports.jsonl"
] as const;

type SyncJsonlFile = (typeof syncJsonlFiles)[number];
type SyncGroup = "answers" | "attempts" | "frequency" | "imports" | "mistakes" | "stats";

export interface SyncServiceOptions {
  deviceId: string;
  deviceName: string;
  platform: NodeJS.Platform | string;
  syncFolderPath: string;
}

interface SyncEnvelope<TPayload = unknown> {
  createdAt: string;
  deviceId: string;
  eventId: string;
  payload: TPayload;
  type: string;
}

interface SyncDeviceRecord {
  firstSeenAt: string;
  id: string;
  name: string;
  platform: NodeJS.Platform | string;
}

interface MistakeLabelPayload {
  attemptAnswerId: string;
  id: string;
  label: string;
}

interface AnswerSentencePayload {
  answerKeyId: string;
  answerSentence: string;
}

function fileForGroup(group: SyncGroup): SyncJsonlFile {
  return `${group}.jsonl` as SyncJsonlFile;
}

function groupForEventType(type: string): SyncGroup {
  if (type.startsWith("attempt.")) {
    return "attempts";
  }
  if (type.startsWith("answer.")) {
    return "answers";
  }
  if (type.startsWith("mistake.")) {
    return "mistakes";
  }
  if (type.startsWith("stats.")) {
    return "stats";
  }
  if (type.startsWith("frequency.")) {
    return "frequency";
  }
  if (type.startsWith("intensive.")) {
    return "stats";
  }
  return "imports";
}

function toJsonLine(event: SyncEnvelope) {
  return `${JSON.stringify(event)}\n`;
}

function parseJsonl(text: string): { events: SyncEnvelope[]; malformedCount: number } {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce(
      (parsed, line) => {
        try {
          parsed.events.push(JSON.parse(line) as SyncEnvelope);
        } catch {
          parsed.malformedCount += 1;
        }
        return parsed;
      },
      { events: [], malformedCount: 0 } as { events: SyncEnvelope[]; malformedCount: number }
    );
}

function readDevicesFile(devicesPath: string): { devices: SyncDeviceRecord[] } {
  if (!existsSync(devicesPath)) {
    return { devices: [] };
  }

  try {
    const parsed = JSON.parse(readFileSync(devicesPath, "utf8")) as { devices?: unknown };
    if (!Array.isArray(parsed.devices)) {
      return { devices: [] };
    }

    return {
      devices: parsed.devices.filter((device): device is SyncDeviceRecord => {
        if (!device || typeof device !== "object") {
          return false;
        }

        const record = device as Record<string, unknown>;
        return (
          typeof record.firstSeenAt === "string" &&
          typeof record.id === "string" &&
          typeof record.name === "string" &&
          typeof record.platform === "string"
        );
      })
    };
  } catch {
    return { devices: [] };
  }
}

export function getDefaultSyncFolderPath(platform: NodeJS.Platform | string, selectedWindowsPath?: string): string {
  if (platform === "win32") {
    return selectedWindowsPath ?? "IELTS-Sync";
  }

  return "/Users/musheng/Desktop/同步空间/IELTS-Sync";
}

export function createSyncService(db: DatabaseHandle, options: SyncServiceOptions) {
  const syncRepo = createSyncRepo(db);
  let currentOptions: SyncServiceOptions = { ...options };

  function syncPath(fileName: string) {
    return join(currentOptions.syncFolderPath, fileName);
  }

  function ensureSyncFolder() {
    mkdirSync(currentOptions.syncFolderPath, { recursive: true });

    for (const fileName of syncJsonlFiles) {
      if (!existsSync(syncPath(fileName))) {
        writeFileSync(syncPath(fileName), "");
      }
    }

    const devicesPath = syncPath("devices.json");
    const device: SyncDeviceRecord = {
      firstSeenAt: new Date().toISOString(),
      id: currentOptions.deviceId,
      name: currentOptions.deviceName,
      platform: currentOptions.platform
    };
    const devices = readDevicesFile(devicesPath);
    const nextDevices = [
      ...(devices.devices ?? []).filter((existingDevice) => existingDevice.id !== currentOptions.deviceId),
      device
    ];
    writeFileSync(devicesPath, `${JSON.stringify({ devices: nextDevices }, null, 2)}\n`);

    db.prepare(
      `
      INSERT OR IGNORE INTO devices (id, name, platform, first_seen_at)
      VALUES (@id, @name, @platform, @firstSeenAt)
    `
    ).run(device);
  }

  function appendEvent<TPayload>(type: string, payload: TPayload, createdAt: string) {
    ensureSyncFolder();
    const event: SyncEnvelope<TPayload> = {
      createdAt,
      deviceId: currentOptions.deviceId,
      eventId: randomUUID(),
      payload,
      type
    };
    appendFileSync(syncPath(fileForGroup(groupForEventType(type))), toJsonLine(event));
    syncRepo.recordSyncEvent({
      createdAt,
      deviceId: currentOptions.deviceId,
      eventId: event.eventId,
      eventType: type,
      payloadJson: JSON.stringify(payload)
    });
    return event;
  }

  function appendAttemptEvent(type: "attempt.created" | "attempt.submitted", attempt: AttemptRecord, createdAt: string) {
    return appendEvent(type, attempt, createdAt);
  }

  function appendAnswerEvent(answer: AttemptAnswerRecord, createdAt: string) {
    return appendEvent("answer.saved", answer, createdAt);
  }

  function appendMistakeEvent(label: MistakeLabelPayload, createdAt: string) {
    return appendEvent("mistake.added", label, createdAt);
  }

  function appendListeningCueEvent(cue: ListeningCueRecord, createdAt: string) {
    return appendEvent("intensive.listening_cue.created", cue, createdAt);
  }

  function appendListeningCueUpdateEvent(cue: ListeningCueRecord, createdAt: string) {
    return appendEvent("intensive.listening_cue.updated", cue, createdAt);
  }

  function appendDictationAttemptEvent(attempt: DictationAttemptRecord, createdAt: string) {
    return appendEvent("intensive.dictation_attempt.saved", attempt, createdAt);
  }

  function appendAnswerSentenceEvent(update: AnswerSentencePayload, createdAt: string) {
    return appendEvent("answer_key.answer_sentence.updated", update, createdAt);
  }

  function appendFrequencyEntryEvent(entry: FrequencyEntryRecord, createdAt: string) {
    return appendEvent("frequency.entry.upserted", entry, createdAt);
  }

  function appendExternalEvent(group: SyncGroup, event: SyncEnvelope) {
    ensureSyncFolder();
    appendFileSync(syncPath(fileForGroup(group)), toJsonLine(event));
  }

  function upsertAttempt(payload: AttemptRecord) {
    db.prepare(
      `
      INSERT INTO attempts (id, mode, subject, started_at, submitted_at, raw_score, estimated_band)
      VALUES (@id, @mode, @subject, @startedAt, @submittedAt, @rawScore, @estimatedBand)
      ON CONFLICT(id) DO UPDATE SET
        submitted_at = COALESCE(excluded.submitted_at, attempts.submitted_at),
        raw_score = COALESCE(excluded.raw_score, attempts.raw_score),
        estimated_band = COALESCE(excluded.estimated_band, attempts.estimated_band)
    `
    ).run(payload);
  }

  function upsertAnswer(payload: AttemptAnswerRecord, event: SyncEnvelope) {
    const existing = db
      .prepare(
        `
        SELECT
          aa.id,
          aa.raw_answer AS rawAnswer,
          aa.normalized_answer AS normalizedAnswer,
          a.submitted_at AS submittedAt
        FROM attempt_answers aa
        JOIN attempts a ON a.id = aa.attempt_id
        WHERE aa.attempt_id = ? AND aa.question_id = ?
      `
      )
      .get(payload.attemptId, payload.questionId) as
      | { id: string; normalizedAnswer: string; rawAnswer: string; submittedAt: string | null }
      | undefined;

    if (
      existing?.submittedAt &&
      (existing.rawAnswer !== payload.rawAnswer || existing.normalizedAnswer !== payload.normalizedAnswer)
    ) {
      db.prepare(
        `
        INSERT OR IGNORE INTO attempt_answer_conflicts (
          id,
          attempt_id,
          question_id,
          local_answer_id,
          remote_answer_id,
          remote_device_id,
          remote_created_at,
          remote_raw_answer,
          remote_normalized_answer,
          remote_is_correct,
          status
        )
        VALUES (
          @id,
          @attemptId,
          @questionId,
          @localAnswerId,
          @remoteAnswerId,
          @remoteDeviceId,
          @remoteCreatedAt,
          @remoteRawAnswer,
          @remoteNormalizedAnswer,
          @remoteIsCorrect,
          'conflict'
        )
      `
      ).run({
        attemptId: payload.attemptId,
        id: randomUUID(),
        localAnswerId: existing.id,
        questionId: payload.questionId,
        remoteAnswerId: payload.id,
        remoteCreatedAt: event.createdAt,
        remoteDeviceId: event.deviceId,
        remoteIsCorrect: payload.isCorrect ? 1 : 0,
        remoteNormalizedAnswer: payload.normalizedAnswer,
        remoteRawAnswer: payload.rawAnswer
      });
      return { conflict: true };
    }

    db.prepare(
      `
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
        @isCorrect,
        @timeSpentSeconds,
        @markedForReview,
        @updatedAt
      )
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        raw_answer = excluded.raw_answer,
        normalized_answer = excluded.normalized_answer,
        is_correct = excluded.is_correct,
        time_spent_seconds = excluded.time_spent_seconds,
        marked_for_review = excluded.marked_for_review,
        updated_at = excluded.updated_at
    `
    ).run({
      ...payload,
      isCorrect: payload.isCorrect ? 1 : 0,
      markedForReview: payload.markedForReview ? 1 : 0,
      updatedAt: event.createdAt
    });
    return { conflict: false };
  }

  function addMistake(payload: MistakeLabelPayload) {
    db.prepare(
      `
      INSERT OR IGNORE INTO mistake_labels (id, attempt_answer_id, label)
      VALUES (@id, @attemptAnswerId, @label)
    `
    ).run(payload);
  }

  function addListeningCue(payload: ListeningCueRecord, createdAt: string) {
    const passage = db.prepare("SELECT id FROM passages WHERE id = ?").get(payload.passageId);
    if (!passage) {
      return false;
    }

    db.prepare(
      `
      INSERT OR IGNORE INTO listening_cues (
        id,
        passage_id,
        start_seconds,
        end_seconds,
        label,
        transcript,
        created_at
      )
      VALUES (
        @id,
        @passageId,
        @startSeconds,
        @endSeconds,
        @label,
        @transcript,
        @createdAt
      )
    `
    ).run({ ...payload, createdAt });
    return true;
  }

  function updateListeningCue(payload: ListeningCueRecord) {
    const passage = db.prepare("SELECT id FROM passages WHERE id = ?").get(payload.passageId);
    if (!passage) {
      return false;
    }

    const result = db.prepare(
      `
      UPDATE listening_cues
      SET start_seconds = @startSeconds,
          end_seconds = @endSeconds,
          label = @label,
          transcript = @transcript
      WHERE id = @id
    `
    ).run(payload);
    return result.changes > 0;
  }

  function addDictationAttempt(payload: DictationAttemptRecord, createdAt: string) {
    const cue = db.prepare("SELECT id FROM listening_cues WHERE id = ?").get(payload.cueId);
    if (!cue) {
      return false;
    }

    db.prepare(
      `
      INSERT OR IGNORE INTO dictation_attempts (
        id,
        cue_id,
        user_text,
        normalized_text,
        is_correct,
        created_at
      )
      VALUES (
        @id,
        @cueId,
        @userText,
        @normalizedText,
        @isCorrect,
        @createdAt
      )
    `
    ).run({
      ...payload,
      createdAt,
      isCorrect: payload.isCorrect === null ? null : payload.isCorrect ? 1 : 0
    });
    return true;
  }

  function updateAnswerSentence(payload: AnswerSentencePayload) {
    const result = db
      .prepare(
        `
        UPDATE answer_keys
        SET answer_sentence = @answerSentence
        WHERE id = @answerKeyId
      `
      )
      .run(payload);
    return result.changes > 0;
  }

  function upsertFrequencyEntry(payload: FrequencyEntryRecord) {
    db.prepare(
      `
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
    `
    ).run(payload);
  }

  function applyEvent(event: SyncEnvelope) {
    if (syncRepo.hasSyncEvent(event.eventId)) {
      return { conflict: false, inserted: false };
    }

    let conflict = false;
    if (event.type === "attempt.created" || event.type === "attempt.submitted") {
      upsertAttempt(event.payload as AttemptRecord);
    } else if (event.type === "answer.saved") {
      conflict = upsertAnswer(event.payload as AttemptAnswerRecord, event).conflict;
    } else if (event.type === "mistake.added") {
      addMistake(event.payload as MistakeLabelPayload);
    } else if (event.type === "intensive.listening_cue.created") {
      if (!addListeningCue(event.payload as ListeningCueRecord, event.createdAt)) {
        return { conflict: false, inserted: false };
      }
    } else if (event.type === "intensive.listening_cue.updated") {
      if (!updateListeningCue(event.payload as ListeningCueRecord)) {
        return { conflict: false, inserted: false };
      }
    } else if (event.type === "intensive.dictation_attempt.saved") {
      if (!addDictationAttempt(event.payload as DictationAttemptRecord, event.createdAt)) {
        return { conflict: false, inserted: false };
      }
    } else if (event.type === "answer_key.answer_sentence.updated") {
      if (!updateAnswerSentence(event.payload as AnswerSentencePayload)) {
        return { conflict: false, inserted: false };
      }
    } else if (event.type === "frequency.entry.upserted") {
      upsertFrequencyEntry(event.payload as FrequencyEntryRecord);
    } else {
      return { conflict: false, inserted: false };
    }

    syncRepo.recordSyncEvent({
      createdAt: event.createdAt,
      deviceId: event.deviceId,
      eventId: event.eventId,
      eventType: event.type,
      payloadJson: JSON.stringify(event.payload)
    });

    return { conflict, inserted: true };
  }

  function importRemoteEvents() {
    ensureSyncFolder();
    let conflicts = 0;
    let imported = 0;
    let skipped = 0;

    for (const fileName of syncJsonlFiles) {
      const parsed = parseJsonl(readFileSync(syncPath(fileName), "utf8"));
      skipped += parsed.malformedCount;
      let pendingEvents = parsed.events;
      let madeProgress = true;

      while (pendingEvents.length > 0 && madeProgress) {
        madeProgress = false;
        const unresolvedEvents: SyncEnvelope[] = [];

        for (const event of pendingEvents) {
          const result = applyEvent(event);
          if (result.inserted) {
            imported += 1;
            madeProgress = true;
          } else {
            unresolvedEvents.push(event);
          }
          if (result.conflict) {
            conflicts += 1;
          }
        }

        pendingEvents = unresolvedEvents;
      }

      skipped += pendingEvents.length;
    }

    return { conflicts, imported, skipped };
  }

  return {
    appendAnswerEvent,
    appendAnswerSentenceEvent,
    appendAttemptEvent,
    appendDictationAttemptEvent,
    appendExternalEvent,
    appendFrequencyEntryEvent,
    appendListeningCueEvent,
    appendListeningCueUpdateEvent,
    appendMistakeEvent,
    ensureSyncFolder,
    getOptions: () => ({ ...currentOptions }),
    importRemoteEvents,
    updateOptions: (nextOptions: Partial<SyncServiceOptions>) => {
      currentOptions = { ...currentOptions, ...nextOptions };
      ensureSyncFolder();
      return { ...currentOptions };
    }
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
