import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../server";
import { createAttemptRepo } from "../db/attemptRepo";
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

  it("recommends the highest-weight mock candidate after recency penalties", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-study-recency-overview-"));
    const server = buildServer({ databasePath: join(tempDir, "ielts.db") });
    servers.push(server);
    const db = (server as typeof server & { db: DatabaseHandle }).db;
    const attempts = createAttemptRepo(db);
    const questions = createQuestionRepo(db);

    function seedPassage(input: {
      frequencyClass: "high" | "medium" | "low" | "unknown";
      part: "P1" | "P2" | "P3" | "P4";
      title: string;
    }) {
      const source = questions.createSource({
        checksum: `recency-${input.title}`,
        importStatus: "imported",
        originalPath: `seed/${input.title}.json`,
        sourceType: "seed",
        version: 1
      });
      const passage = questions.createPassage({
        frequencyClass: input.frequencyClass,
        part: input.part,
        sourceId: source.id,
        subject: "listening",
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
        answerSentence: "answer",
        explanation: "sample",
        questionId: question.id,
        synonyms: []
      });
      return { passage, question };
    }

    const recentHigh = seedPassage({
      frequencyClass: "high",
      part: "P1",
      title: "A Recently Completed High"
    });
    seedPassage({
      frequencyClass: "medium",
      part: "P1",
      title: "B Fresh Medium"
    });
    seedPassage({ frequencyClass: "high", part: "P2", title: "P2 High" });
    seedPassage({ frequencyClass: "high", part: "P3", title: "P3 High" });
    seedPassage({ frequencyClass: "high", part: "P4", title: "P4 High" });

    const attempt = attempts.createAttempt({
      mode: "mock",
      startedAt: "2026-06-03T09:00:00.000Z",
      subject: "listening"
    });
    attempts.saveAnswer({
      attemptId: attempt.id,
      isCorrect: true,
      markedForReview: false,
      normalizedAnswer: "answer",
      questionId: recentHigh.question.id,
      rawAnswer: "answer",
      timeSpentSeconds: 30
    });
    attempts.submitAttempt({
      attemptId: attempt.id,
      estimatedBand: 9,
      rawScore: 1,
      submittedAt: "2026-06-03T10:00:00.000Z"
    });

    const response = await server.inject({ method: "GET", url: "/api/study/overview" });

    expect(response.statusCode).toBe(200);
    expect(response.json().recommendedMockSets.listening.passages[0]).toMatchObject({
      frequencyClass: "medium",
      selectionWeight: 3,
      title: "B Fresh Medium"
    });
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
    questions.createListeningAudio({
      checksum: "live-intensive-audio",
      durationSeconds: 320,
      filePath: "/Users/musheng/Desktop/IELTS/listening/live-intensive.mp3",
      passageId: listeningPassage.id
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
      answerRules: { keywords: ["claim", "key answer sentence"] },
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
      audioPath: "/Users/musheng/Desktop/IELTS/listening/live-intensive.mp3",
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
      keywords: ["claim", "key answer sentence"],
      passageText: "The key answer sentence proves the claim. The distractor sentence is nearby.",
      synonyms: ["prove = support"]
    });
  });

  it("creates listening cues and stores dictation attempts through intensive study routes", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-study-cue-routes-"));
    const server = buildServer({ databasePath: join(tempDir, "ielts.db") });
    servers.push(server);
    const db = (server as typeof server & { db: DatabaseHandle }).db;
    const questions = createQuestionRepo(db);
    const source = questions.createSource({
      checksum: "study-cue-route-source",
      importStatus: "imported",
      originalPath: "seed/study-cue-route.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "listening",
      title: "Cue Route Listening"
    });

    const emptyPreview = await server.inject({ method: "GET", url: "/api/study/intensive" });
    expect(emptyPreview.json().listening).toMatchObject({
      audioTitle: "Cue Route Listening",
      cues: [],
      passageId: passage.id
    });

    const cueResponse = await server.inject({
      method: "POST",
      payload: {
        endSeconds: 4.2,
        label: "Sentence 1",
        passageId: passage.id,
        startSeconds: 1.2,
        transcript: "Green Park"
      },
      url: "/api/study/listening-cues"
    });
    const cue = cueResponse.json();

    expect(cueResponse.statusCode).toBe(201);
    expect(cue).toMatchObject({
      endSeconds: 4.2,
      label: "Sentence 1",
      passageId: passage.id,
      startSeconds: 1.2,
      transcript: "Green Park"
    });

    const updateResponse = await server.inject({
      method: "PUT",
      payload: {
        endSeconds: 5.8,
        label: "Corrected Sentence 1",
        startSeconds: 1.6,
        transcript: "Green Park corrected"
      },
      url: `/api/study/listening-cues/${cue.id}`
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      endSeconds: 5.8,
      id: cue.id,
      label: "Corrected Sentence 1",
      passageId: passage.id,
      startSeconds: 1.6,
      transcript: "Green Park corrected"
    });

    const updatedPreview = await server.inject({ method: "GET", url: "/api/study/intensive" });
    expect(updatedPreview.json().listening.cues).toEqual([
      expect.objectContaining({
        endSeconds: 5.8,
        id: cue.id,
        label: "Corrected Sentence 1",
        startSeconds: 1.6,
        transcript: "Green Park corrected"
      })
    ]);

    const dictationResponse = await server.inject({
      method: "POST",
      payload: {
        cueId: cue.id,
        userText: " green park corrected "
      },
      url: "/api/study/dictation-attempts"
    });

    expect(dictationResponse.statusCode).toBe(201);
    expect(dictationResponse.json()).toMatchObject({
      cueId: cue.id,
      isCorrect: true,
      normalizedText: "green park corrected",
      userText: " green park corrected "
    });
  });

  it("returns the latest wrong reading answer for mistake labeling and stores the selected label", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-study-mistake-labels-"));
    const server = buildServer({ databasePath: join(tempDir, "ielts.db") });
    servers.push(server);
    const db = (server as typeof server & { db: DatabaseHandle }).db;
    const questions = createQuestionRepo(db);
    const attempts = createAttemptRepo(db);
    const source = questions.createSource({
      checksum: "study-mistake-label-source",
      importStatus: "imported",
      originalPath: "seed/study-mistake-label.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P2",
      sourceId: source.id,
      subject: "reading",
      title: "Mistake Label Reading"
    });
    questions.createSourceAsset({
      assetKind: "html",
      checksum: "study-mistake-label-html",
      filePath: null,
      originalName: "mistake-label.html",
      sourceId: source.id,
      textContent: "The answer sentence identifies the evidence. A distractor appears later."
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Which sentence gives the answer?",
      questionNumber: 1,
      questionType: "matching"
    });
    questions.createAnswerKey({
      acceptedAnswers: ["answer sentence"],
      answerSentence: "answer sentence",
      explanation: "The answer sentence identifies the evidence.",
      questionId: question.id,
      synonyms: ["identifies = shows"]
    });
    const attempt = attempts.createAttempt({
      mode: "practice",
      startedAt: "2026-06-04T08:00:00.000Z",
      subject: "reading"
    });
    const answer = attempts.saveAnswer({
      attemptId: attempt.id,
      isCorrect: false,
      markedForReview: false,
      normalizedAnswer: "distractor",
      questionId: question.id,
      rawAnswer: "distractor",
      timeSpentSeconds: 42
    });

    const preview = await server.inject({ method: "GET", url: "/api/study/intensive" });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().reading).toMatchObject({
      attemptAnswerId: answer.id,
      answerSentence: "answer sentence",
      questionPrompt: "Which sentence gives the answer?"
    });

    const labelResponse = await server.inject({
      method: "POST",
      payload: {
        attemptAnswerId: answer.id,
        label: "定位失败"
      },
      url: "/api/study/mistake-labels"
    });

    expect(labelResponse.statusCode).toBe(201);
    expect(labelResponse.json()).toMatchObject({
      label: "定位失败"
    });
    expect(attempts.listMistakeLabels(answer.id)).toEqual(["定位失败"]);
  });

  it("updates a manually selected reading answer sentence for close reading", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-study-answer-sentence-"));
    const server = buildServer({ databasePath: join(tempDir, "ielts.db") });
    servers.push(server);
    const db = (server as typeof server & { db: DatabaseHandle }).db;
    const questions = createQuestionRepo(db);
    const source = questions.createSource({
      checksum: "study-answer-sentence-source",
      importStatus: "imported",
      originalPath: "seed/study-answer-sentence.json",
      sourceType: "seed",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "high",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "Manual Answer Sentence Reading"
    });
    questions.createSourceAsset({
      assetKind: "html",
      checksum: "study-answer-sentence-html",
      filePath: null,
      originalName: "answer-sentence.html",
      sourceId: source.id,
      textContent: "The first sentence is a distractor. The selected sentence proves the answer."
    });
    const question = questions.createQuestion({
      answerRules: {},
      passageId: passage.id,
      prompt: "Select the evidence sentence.",
      questionNumber: 1,
      questionType: "matching"
    });
    const answerKey = questions.createAnswerKey({
      acceptedAnswers: ["selected sentence"],
      answerSentence: null,
      explanation: "Select the sentence that proves the answer.",
      questionId: question.id,
      synonyms: []
    });

    const preview = await server.inject({ method: "GET", url: "/api/study/intensive" });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().reading).toMatchObject({
      answerKeyId: answerKey.id,
      answerSentence: null,
      questionPrompt: "Select the evidence sentence."
    });

    const update = await server.inject({
      method: "POST",
      payload: {
        answerKeyId: answerKey.id,
        answerSentence: "The selected sentence proves the answer."
      },
      url: "/api/study/answer-sentence"
    });
    expect(update.statusCode).toBe(200);
    expect(update.json()).toMatchObject({
      answerKeyId: answerKey.id,
      answerSentence: "The selected sentence proves the answer."
    });

    const updatedPreview = await server.inject({ method: "GET", url: "/api/study/intensive" });
    expect(updatedPreview.json().reading).toMatchObject({
      answerKeyId: answerKey.id,
      answerSentence: "The selected sentence proves the answer."
    });
  });

  it("returns reading questions with missing evidence so answer sentences can be selected manually", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-study-missing-evidence-"));
    const server = buildServer({ databasePath: join(tempDir, "ielts.db") });
    servers.push(server);
    const db = (server as typeof server & { db: DatabaseHandle }).db;
    const questions = createQuestionRepo(db);
    const source = questions.createSource({
      checksum: "study-missing-evidence-source",
      importStatus: "needs_review",
      originalPath: "reading/PDF/missing-evidence.pdf",
      sourceType: "reading-pdf",
      version: 1
    });
    const passage = questions.createPassage({
      frequencyClass: "medium",
      part: "P2",
      sourceId: source.id,
      subject: "reading",
      title: "Imported PDF Missing Evidence"
    });
    questions.createSourceAsset({
      assetKind: "pdf",
      checksum: "study-missing-evidence-pdf",
      filePath: "/tmp/missing-evidence.pdf",
      originalName: "missing-evidence.pdf",
      sourceId: source.id,
      textContent: "A distractor opens the paragraph. The manual evidence sentence supports the answer."
    });
    const question = questions.createQuestion({
      answerRules: { keywords: ["manual evidence"] },
      passageId: passage.id,
      prompt: "Which sentence supports the answer?",
      questionNumber: 2,
      questionType: "matching"
    });
    const answerKey = questions.createAnswerKey({
      acceptedAnswers: ["manual evidence sentence"],
      answerSentence: null,
      explanation: null,
      questionId: question.id,
      synonyms: []
    });

    const preview = await server.inject({ method: "GET", url: "/api/study/intensive" });

    expect(preview.statusCode).toBe(200);
    expect(preview.json().reading).toMatchObject({
      answerKeyId: answerKey.id,
      answerSentence: null,
      explanation: null,
      keywords: ["manual evidence"],
      passageText: "A distractor opens the paragraph. The manual evidence sentence supports the answer.",
      passageTitle: "Imported PDF Missing Evidence",
      questionPrompt: "Which sentence supports the answer?"
    });
  });
});
