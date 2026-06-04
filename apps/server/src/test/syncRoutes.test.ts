import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { createFrequencyRepo } from "../db/frequencyRepo";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { buildServer } from "../server";

function seedQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      checksum: "sync-routes-seed",
      importStatus: "imported",
      originalPath: "seed/sync-routes.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "Sync Routes"
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Question 1",
      questionNumber: 1,
      questionType: "fill_blank"
    });
    questions.createAnswerKey({
      acceptedAnswers: ["green park"],
      answerSentence: "The booking is under Green Park.",
      explanation: "Direct answer.",
      questionId: question.id,
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedListeningPassage(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      checksum: "sync-routes-listening-seed",
      importStatus: "imported",
      originalPath: "seed/sync-routes-listening.json",
      sourceType: "seed",
      version: 1
    });
    return questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "listening",
      title: "Sync Listening Intensive"
    }).id;
  } finally {
    db.close();
  }
}

function seedReadingAnswerKey(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      checksum: `sync-routes-reading-answer-key-${databasePath}`,
      importStatus: "imported",
      originalPath: "seed/sync-routes-reading-answer-key.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "Sync Reading Answer Sentence"
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Select the answer evidence.",
      questionNumber: 1,
      questionType: "matching"
    });
    return questions.createAnswerKey({
      acceptedAnswers: ["selected sentence"],
      answerSentence: null,
      explanation: "Select the sentence.",
      questionId: question.id,
      synonyms: []
    }).id;
  } finally {
    db.close();
  }
}

describe("sync routes", () => {
  it("appends practice writes to sync JSONL files and imports remote events manually", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    seedQuestion(databasePath);

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const config = await server.inject({ method: "GET", url: "/api/sync/config" });
      expect(config.statusCode).toBe(200);
      expect(config.json()).toMatchObject({ syncFolderPath });
      expect(existsSync(join(syncFolderPath, "attempts.jsonl"))).toBe(true);

      const start = await server.inject({
        method: "POST",
        payload: { mode: "practice", subject: "reading" },
        url: "/api/practice/start"
      });
      const started = start.json<{ attemptId: string; questions: Array<{ id: string }> }>();
      await server.inject({
        method: "POST",
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "Green Park",
          timeSpentSeconds: 20
        },
        url: `/api/practice/${started.attemptId}/answer`
      });
      await server.inject({ method: "POST", url: `/api/practice/${started.attemptId}/submit` });

      expect(readFileSync(join(syncFolderPath, "attempts.jsonl"), "utf8")).toContain("attempt.submitted");
      expect(readFileSync(join(syncFolderPath, "answers.jsonl"), "utf8")).toContain("answer.saved");

      const sync = await server.inject({ method: "POST", url: "/api/sync/import" });
      expect(sync.statusCode).toBe(200);
      expect(sync.json()).toMatchObject({ imported: 0 });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("imports remote events on startup when sync is configured", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-startup-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "attempts.jsonl"),
      `${JSON.stringify({
        createdAt: "2026-06-01T08:00:00.000Z",
        deviceId: "windows-pc",
        eventId: "startup-attempt",
        payload: {
          estimatedBand: null,
          id: "remote-startup-attempt",
          mode: "practice",
          rawScore: null,
          startedAt: "2026-06-01T08:00:00.000Z",
          subject: "reading",
          submittedAt: null
        },
        type: "attempt.created"
      })}\n`
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const review = await server.inject({
        method: "GET",
        url: "/api/practice/remote-startup-attempt/review"
      });
      expect(review.statusCode).toBe(200);
      expect(review.json()).toMatchObject({ id: "remote-startup-attempt", subject: "reading" });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("appends intensive listening cue and dictation writes to sync JSONL files", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-intensive-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    const passageId = seedListeningPassage(databasePath);

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const cueResponse = await server.inject({
        method: "POST",
        payload: {
          endSeconds: 4.2,
          label: "Sentence 1",
          passageId,
          startSeconds: 1.2,
          transcript: "Green Park"
        },
        url: "/api/study/listening-cues"
      });
      const cue = cueResponse.json<{ id: string }>();

      await server.inject({
        method: "PUT",
        payload: {
          endSeconds: 5.4,
          label: "Corrected Sentence 1",
          startSeconds: 1.5,
          transcript: "Green Park corrected"
        },
        url: `/api/study/listening-cues/${cue.id}`
      });

      await server.inject({
        method: "POST",
        payload: {
          cueId: cue.id,
          userText: "green park"
        },
        url: "/api/study/dictation-attempts"
      });

      const statsJsonl = readFileSync(join(syncFolderPath, "stats.jsonl"), "utf8");
      expect(statsJsonl).toContain("intensive.listening_cue.created");
      expect(statsJsonl).toContain("intensive.listening_cue.updated");
      expect(statsJsonl).toContain("intensive.dictation_attempt.saved");
      expect(statsJsonl).toContain("Green Park");
      expect(statsJsonl).toContain("Green Park corrected");
      expect(statsJsonl).toContain("green park");
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("imports remote intensive listening cue updates that arrive before the create event in the same batch", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-intensive-cue-update-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    const passageId = seedListeningPassage(databasePath);
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "stats.jsonl"),
      [
        JSON.stringify({
          createdAt: "2026-06-04T08:02:00.000Z",
          deviceId: "windows-pc",
          eventId: "remote-cue-update-before-create",
          payload: {
            endSeconds: 5.6,
            id: "remote-cue-update-1",
            label: "Corrected Sentence 1",
            passageId,
            startSeconds: 1.5,
            transcript: "Green Park corrected"
          },
          type: "intensive.listening_cue.updated"
        }),
        JSON.stringify({
          createdAt: "2026-06-04T08:00:00.000Z",
          deviceId: "windows-pc",
          eventId: "remote-cue-create-after-update",
          payload: {
            endSeconds: 4.2,
            id: "remote-cue-update-1",
            label: "Sentence 1",
            passageId,
            startSeconds: 1.2,
            transcript: "Green Park"
          },
          type: "intensive.listening_cue.created"
        }),
        ""
      ].join("\n")
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const db = (server as typeof server & { db: DatabaseHandle }).db;
      const cue = db
        .prepare(
          `
          SELECT
            start_seconds AS startSeconds,
            end_seconds AS endSeconds,
            label,
            transcript
          FROM listening_cues
          WHERE id = ?
        `
        )
        .get("remote-cue-update-1") as {
        endSeconds: number;
        label: string;
        startSeconds: number;
        transcript: string;
      };

      expect(cue).toEqual({
        endSeconds: 5.6,
        label: "Corrected Sentence 1",
        startSeconds: 1.5,
        transcript: "Green Park corrected"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("does not crash when remote intensive events reference question-bank rows missing on this device", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-intensive-missing-bank-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "stats.jsonl"),
      [
        JSON.stringify({
          createdAt: "2026-06-04T08:00:00.000Z",
          deviceId: "windows-pc",
          eventId: "remote-cue-with-missing-passage",
          payload: {
            endSeconds: 4.2,
            id: "remote-cue-1",
            label: "Sentence 1",
            passageId: "missing-passage-id",
            startSeconds: 1.2,
            transcript: "Green Park"
          },
          type: "intensive.listening_cue.created"
        }),
        JSON.stringify({
          createdAt: "2026-06-04T08:01:00.000Z",
          deviceId: "windows-pc",
          eventId: "remote-dictation-with-missing-cue",
          payload: {
            cueId: "missing-cue-id",
            id: "remote-dictation-1",
            isCorrect: true,
            normalizedText: "green park",
            userText: "green park"
          },
          type: "intensive.dictation_attempt.saved"
        }),
        ""
      ].join("\n")
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const sync = await server.inject({ method: "POST", url: "/api/sync/import" });
      expect(sync.statusCode).toBe(200);
      expect(sync.json()).toMatchObject({ imported: 0, skipped: 2 });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("appends close-reading answer sentence updates to sync JSONL files", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-answer-sentence-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    const answerKeyId = seedReadingAnswerKey(databasePath);

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const update = await server.inject({
        method: "POST",
        payload: {
          answerKeyId,
          answerSentence: "The selected sentence proves the answer."
        },
        url: "/api/study/answer-sentence"
      });
      expect(update.statusCode).toBe(200);

      const importsJsonl = readFileSync(join(syncFolderPath, "imports.jsonl"), "utf8");
      expect(importsJsonl).toContain("answer_key.answer_sentence.updated");
      expect(importsJsonl).toContain(answerKeyId);
      expect(importsJsonl).toContain("The selected sentence proves the answer.");
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("imports remote answer sentence updates and skips missing answer keys", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-remote-answer-sentence-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    const answerKeyId = seedReadingAnswerKey(databasePath);
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "imports.jsonl"),
      [
        JSON.stringify({
          createdAt: "2026-06-04T08:00:00.000Z",
          deviceId: "windows-pc",
          eventId: "remote-answer-sentence-update",
          payload: {
            answerKeyId,
            answerSentence: "Remote selected sentence proves the answer."
          },
          type: "answer_key.answer_sentence.updated"
        }),
        JSON.stringify({
          createdAt: "2026-06-04T08:01:00.000Z",
          deviceId: "windows-pc",
          eventId: "remote-answer-sentence-missing-key",
          payload: {
            answerKeyId: "missing-answer-key",
            answerSentence: "This unresolved answer sentence should wait."
          },
          type: "answer_key.answer_sentence.updated"
        }),
        ""
      ].join("\n")
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const db = (server as typeof server & { db: DatabaseHandle }).db;
      expect(
        (
          db
            .prepare("SELECT answer_sentence AS answerSentence FROM answer_keys WHERE id = ?")
            .get(answerKeyId) as { answerSentence: string | null }
        ).answerSentence
      ).toBe("Remote selected sentence proves the answer.");

      const sync = await server.inject({ method: "POST", url: "/api/sync/import" });
      expect(sync.statusCode).toBe(200);
      expect(sync.json()).toMatchObject({ imported: 0, skipped: 2 });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("appends frequency row updates to sync JSONL files", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-frequency-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const response = await server.inject({
        method: "POST",
        payload: {
          rows: [
            {
              chineseTitle: "剑桥高频阅读",
              difficulty: 3,
              englishTitle: "Cambridge high frequency reading",
              frequencyClass: "high",
              part: "P1",
              sourceMonth: "2026-06",
              subject: "reading"
            }
          ]
        },
        url: "/api/import/frequency-rows"
      });
      expect(response.statusCode).toBe(200);

      const frequencyJsonl = readFileSync(join(syncFolderPath, "frequency.jsonl"), "utf8");
      expect(frequencyJsonl).toContain("frequency.entry.upserted");
      expect(frequencyJsonl).toContain("Cambridge high frequency reading");
      expect(frequencyJsonl).toContain("high");
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("imports remote frequency row updates on startup", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-remote-frequency-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "frequency.jsonl"),
      `${JSON.stringify({
        createdAt: "2026-06-04T08:00:00.000Z",
        deviceId: "windows-pc",
        eventId: "remote-frequency-entry",
        payload: {
          chineseTitle: "远端高频阅读",
          difficulty: 2.5,
          englishTitle: "Remote high frequency reading",
          frequencyClass: "high",
          id: "remote-frequency-entry-id",
          part: "P2",
          sourceMonth: "2026-06",
          subject: "reading"
        },
        type: "frequency.entry.upserted"
      })}\n`
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const db = (server as typeof server & { db: DatabaseHandle }).db;
      expect(createFrequencyRepo(db).listFrequencyEntries()).toEqual([
        expect.objectContaining({
          chineseTitle: "远端高频阅读",
          englishTitle: "Remote high frequency reading",
          frequencyClass: "high",
          sourceMonth: "2026-06"
        })
      ]);
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("leaves unknown future sync events unrecorded so upgrades can process them later", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-unknown-event-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "imports.jsonl"),
      `${JSON.stringify({
        createdAt: "2026-06-04T08:00:00.000Z",
        deviceId: "future-device",
        eventId: "future-event-id",
        payload: {
          reason: "A newer app version can understand this later."
        },
        type: "future.event.type"
      })}\n`
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const db = (server as typeof server & { db: DatabaseHandle }).db;
      expect(
        (
          db
            .prepare("SELECT COUNT(*) AS count FROM sync_events WHERE event_id = ?")
            .get("future-event-id") as { count: number }
        ).count
      ).toBe(0);

      const sync = await server.inject({ method: "POST", url: "/api/sync/import" });
      expect(sync.statusCode).toBe(200);
      expect(sync.json()).toMatchObject({ imported: 0, skipped: 1 });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("skips malformed JSONL sync lines without blocking valid events", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-sync-malformed-jsonl-"));
    const databasePath = join(tempDir, "ielts.db");
    const syncFolderPath = join(tempDir, "IELTS-Sync");
    mkdirSync(syncFolderPath, { recursive: true });
    writeFileSync(
      join(syncFolderPath, "attempts.jsonl"),
      [
        "{ this is not valid json",
        JSON.stringify({
          createdAt: "2026-06-04T08:00:00.000Z",
          deviceId: "windows-pc",
          eventId: "valid-attempt-after-malformed-line",
          payload: {
            estimatedBand: null,
            id: "valid-attempt-after-malformed-line",
            mode: "practice",
            rawScore: null,
            startedAt: "2026-06-04T08:00:00.000Z",
            subject: "reading",
            submittedAt: null
          },
          type: "attempt.created"
        }),
        ""
      ].join("\n")
    );

    const server = buildServer({
      databasePath,
      sync: {
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath
      }
    });

    try {
      const review = await server.inject({
        method: "GET",
        url: "/api/practice/valid-attempt-after-malformed-line/review"
      });
      expect(review.statusCode).toBe(200);
      expect(review.json()).toMatchObject({ id: "valid-attempt-after-malformed-line" });

      const sync = await server.inject({ method: "POST", url: "/api/sync/import" });
      expect(sync.statusCode).toBe(200);
      expect(sync.json()).toMatchObject({ imported: 0, skipped: 2 });
    } finally {
      await server.close();
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
