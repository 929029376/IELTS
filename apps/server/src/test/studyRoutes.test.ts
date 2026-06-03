import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../server";
import { createIntensiveRepo } from "../db/intensiveRepo";
import type { DatabaseHandle } from "../db/database";
import { createQuestionRepo } from "../db/questionRepo";

describe("study overview routes", () => {
  const servers: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(servers.map((server) => server.close()));
    servers.length = 0;
  });

  it("returns local question-bank availability and high-frequency mock recommendations without creating attempts", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-study-overview-"));
    const server = buildServer({ databasePath: join(tempDir, "ielts.db") });
    servers.push(server);
    const db = (server as typeof server & { db: DatabaseHandle }).db;
    const questions = createQuestionRepo(db);
    const intensive = createIntensiveRepo(db);

    function seedPassage(input: {
      frequencyClass: "high" | "medium" | "low" | "unknown";
      part: "P1" | "P2" | "P3" | "P4";
      subject: "listening" | "reading";
      title: string;
    }) {
      const source = questions.createSource({
        checksum: `checksum-${input.title}`,
        importStatus: "imported",
        originalPath: `seed/${input.title}.json`,
        sourceType: "seed",
        version: 1
      });
      const passage = questions.createPassage({
        frequencyClass: input.frequencyClass,
        part: input.part,
        sourceId: source.id,
        subject: input.subject,
        title: input.title
      });
      const question = questions.createQuestion({
        answerRules: {},
        passageId: passage.id,
        prompt: `${input.title} prompt`,
        questionNumber: 1,
        questionType: "fill_blank"
      });
      questions.createAnswerKey({
        acceptedAnswers: ["answer"],
        answerSentence: "The answer is in the evidence sentence.",
        explanation: "The sentence supports the answer.",
        questionId: question.id,
        synonyms: []
      });
      return passage;
    }

    const listeningP1High = seedPassage({
      frequencyClass: "high",
      part: "P1",
      subject: "listening",
      title: "Live Listening P1 High"
    });
    seedPassage({ frequencyClass: "low", part: "P1", subject: "listening", title: "Live Listening P1 Low" });
    seedPassage({ frequencyClass: "high", part: "P2", subject: "listening", title: "Live Listening P2 High" });
    seedPassage({ frequencyClass: "medium", part: "P3", subject: "listening", title: "Live Listening P3 Medium" });
    seedPassage({ frequencyClass: "high", part: "P4", subject: "listening", title: "Live Listening P4 High" });
    seedPassage({ frequencyClass: "high", part: "P1", subject: "reading", title: "Live Reading P1 High" });
    seedPassage({ frequencyClass: "medium", part: "P2", subject: "reading", title: "Live Reading P2 Medium" });
    seedPassage({ frequencyClass: "low", part: "P3", subject: "reading", title: "Live Reading P3 Low" });
    intensive.createListeningCue({
      endSeconds: 16.2,
      label: "Sentence 1",
      passageId: listeningP1High.id,
      startSeconds: 12.5,
      transcript: "The booking is under Green Park."
    });

    const response = await server.inject({ method: "GET", url: "/api/study/overview" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      readiness: {
        listeningFullMockReady: true,
        readingFullMockReady: true
      },
      subjects: {
        listening: {
          cueCount: 1,
          frequency: { high: 3, low: 1, medium: 1, unknown: 0 },
          passageCount: 5,
          questionCount: 5
        },
        reading: {
          cueCount: 0,
          frequency: { high: 1, low: 1, medium: 1, unknown: 0 },
          passageCount: 3,
          questionCount: 3
        }
      }
    });
    expect(response.json().recommendedMockSets.listening.passages.map((passage: { title: string }) => passage.title)).toEqual([
      "Live Listening P1 High",
      "Live Listening P2 High",
      "Live Listening P3 Medium",
      "Live Listening P4 High"
    ]);
    expect(response.json().recommendedMockSets.reading.passages.map((passage: { title: string }) => passage.title)).toEqual([
      "Live Reading P1 High",
      "Live Reading P2 Medium",
      "Live Reading P3 Low"
    ]);
    expect(
      (
        db
          .prepare("SELECT COUNT(*) AS count FROM attempts")
          .get() as { count: number }
      ).count
    ).toBe(0);
  });

  it("returns live intensive listening cues and reading evidence for the Mac intensive panel", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-study-intensive-"));
    const server = buildServer({ databasePath: join(tempDir, "ielts.db") });
    servers.push(server);
    const db = (server as typeof server & { db: DatabaseHandle }).db;
    const questions = createQuestionRepo(db);
    const intensive = createIntensiveRepo(db);
    const source = questions.createSource({
      checksum: "study-intensive-source",
      importStatus: "imported",
      originalPath: "seed/study-intensive.json",
      sourceType: "seed",
      version: 1
    });
    const listeningPassage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "listening",
      title: "Live Listening Intensive"
    });
    intensive.createListeningCue({
      endSeconds: 9.4,
      label: "Sentence 2",
      passageId: listeningPassage.id,
      startSeconds: 5.2,
      transcript: "The appointment is at nine thirty."
    });
    const readingPassage = questions.createPassage({
      frequencyClass: "high",
      part: "P2",
      sourceId: source.id,
      subject: "reading",
      title: "Live Reading Intensive"
    });
    questions.createSourceAsset({
      assetKind: "html",
      checksum: "reading-intensive-html",
      filePath: null,
      originalName: "reading.html",
      sourceId: source.id,
      textContent: "The key answer sentence proves the claim. The distractor sentence is nearby."
    });
    const readingQuestion = questions.createQuestion({
      answerRules: {},
      passageId: readingPassage.id,
      prompt: "Find the evidence sentence.",
      questionNumber: 1,
      questionType: "matching"
    });
    questions.createAnswerKey({
      acceptedAnswers: ["key answer sentence"],
      answerSentence: "key answer sentence",
      explanation: "This sentence directly proves the claim.",
      questionId: readingQuestion.id,
      synonyms: ["prove = support"]
    });

    const response = await server.inject({ method: "GET", url: "/api/study/intensive" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.listening).toMatchObject({
      audioTitle: "Live Listening Intensive",
      cues: [
        expect.objectContaining({
          label: "Sentence 2",
          transcript: "The appointment is at nine thirty."
        })
      ]
    });
    expect(body.reading).toMatchObject({
      answerSentence: "key answer sentence",
      explanation: "This sentence directly proves the claim.",
      passageText: "The key answer sentence proves the claim. The distractor sentence is nearby.",
      synonyms: ["prove = support"]
    });
  });
});
