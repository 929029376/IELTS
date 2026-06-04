import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/database";
import { migrate } from "../db/migrate";
import { createAttemptRepo } from "../db/attemptRepo";
import { createQuestionRepo } from "../db/questionRepo";
import { buildServer } from "../server";

function seedPracticeFilterCandidates(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  function createCandidate(input: {
    frequencyClass: "high" | "low" | "medium";
    part: "P1" | "P2";
    questionType: "fill_blank" | "single_choice";
    title: string;
  }) {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: `seed/${input.title}.json`,
      checksum: `practice-filter-${input.title}`,
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: input.part,
      title: input.title,
      frequencyClass: input.frequencyClass
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: input.questionType,
      prompt: `${input.title} prompt`,
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["answer"],
      answerSentence: `${input.title} evidence.`,
      explanation: `${input.title} explanation.`,
      synonyms: []
    });
  }

  try {
    createCandidate({ frequencyClass: "high", part: "P1", questionType: "single_choice", title: "Wrong Part" });
    createCandidate({ frequencyClass: "medium", part: "P2", questionType: "single_choice", title: "Wrong Frequency" });
    createCandidate({ frequencyClass: "high", part: "P2", questionType: "fill_blank", title: "Wrong Type" });
    createCandidate({ frequencyClass: "high", part: "P2", questionType: "single_choice", title: "Target Practice" });
  } finally {
    db.close();
  }
}

function seedFortyQuestions(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/forty-reading.json",
      checksum: "forty-reading-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Forty Question Practice Set",
      frequencyClass: "high"
    });

    for (let index = 1; index <= 40; index += 1) {
      const question = questions.createQuestion({
        passageId: passage.id,
        questionNumber: index,
        questionType: "fill_blank",
        prompt: `Question ${index}`,
        answerRules: { maxWords: 2 }
      });
      questions.createAnswerKey({
        questionId: question.id,
        acceptedAnswers: [`answer ${index}`],
        answerSentence: `The answer is answer ${index}.`,
        explanation: `Question ${index} is answered directly in the sample text.`,
        synonyms: []
      });
    }
  } finally {
    db.close();
  }
}

function seedWordLimitAliasQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/word-limit-alias.json",
      checksum: "word-limit-alias-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Word Limit Alias Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which place is mentioned?",
      answerRules: { wordLimit: "NO MORE THAN TWO WORDS" }
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["green park station"],
      answerSentence: "The speaker says green park station.",
      explanation: "The answer has too many words for the stated limit.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedNumberAllowedWordLimitQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/word-limit-number.json",
      checksum: "word-limit-number-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Word Limit Number Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which stop is mentioned?",
      answerRules: { wordLimit: "NO MORE THAN TWO WORDS AND/OR A NUMBER" }
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["green park 24"],
      answerSentence: "The speaker says green park 24.",
      explanation: "The answer has two words and one allowed number.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedOptionalAnswerWordQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/optional-answer-word.json",
      checksum: "optional-answer-word-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Optional Answer Word Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which place is mentioned?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["(the) green park(s)"],
      answerSentence: "The speaker says the green parks.",
      explanation: "The article and plural marker are optional in the answer key.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedSlashAliasAnswerQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/slash-alias-answer.json",
      checksum: "slash-alias-answer-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Slash Alias Answer Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which location spelling is accepted?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["centre / center"],
      answerSentence: "The speaker says the centre.",
      explanation: "The answer key accepts UK and US spelling.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedUnicodeDashAnswerQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/unicode-dash-answer.json",
      checksum: "unicode-dash-answer-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Unicode Dash Answer Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which hyphenated phrase is accepted?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["well–known"],
      answerSentence: "The speaker says well-known.",
      explanation: "Imported answer keys can contain Unicode dash characters.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedPunctuatedAnswerQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/punctuated-answer.json",
      checksum: "punctuated-answer-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Punctuated Answer Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which place is accepted?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["green park。"],
      answerSentence: "The answer text was copied with punctuation.",
      explanation: "Imported answer keys can include sentence punctuation.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedQuotedAnswerQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/quoted-answer.json",
      checksum: "quoted-answer-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Quoted Answer Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which quoted place is accepted?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["“green park”"],
      answerSentence: "The answer text was copied with quote marks.",
      explanation: "Imported answer keys can include surrounding quote marks.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedNumberedAnswerQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/numbered-answer.json",
      checksum: "numbered-answer-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Numbered Answer Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which numbered answer is accepted?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["Q1：green park"],
      answerSentence: "The imported answer key included the question number.",
      explanation: "Imported answer keys can include numbering prefixes.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedParenthesizedAnswerQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/parenthesized-answer.json",
      checksum: "parenthesized-answer-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Parenthesized Answer Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which parenthesized answer is accepted?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["green park"],
      answerSentence: "The answer itself is green park.",
      explanation: "User-entered copied answers can include surrounding parentheses.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedDelimitedAnswersQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/delimited-answers.json",
      checksum: "delimited-answers-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Delimited Answers Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which alternative answer is accepted?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["green park 或 green parks"],
      answerSentence: "The imported answer key kept both alternatives in one cell.",
      explanation: "Imported answer cells can contain multiple alternatives.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedMultipleChoiceQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/multiple-choice.json",
      checksum: "multiple-choice-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Multiple Choice Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "multiple_choice",
      prompt: "Which TWO options are correct?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["AC"],
      answerSentence: "The passage supports options A and C.",
      explanation: "Both options must be selected, but their order does not matter.",
      synonyms: []
    });
  } finally {
    db.close();
  }
}

function seedPracticeMistakeLabelCandidates(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);
  const attempts = createAttemptRepo(db);

  function createCandidate(title: string) {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: `seed/${title}.json`,
      checksum: `mistake-filter-${title}`,
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P2",
      title,
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: `${title} prompt`,
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["answer"],
      answerSentence: `${title} evidence.`,
      explanation: `${title} explanation.`,
      synonyms: []
    });
    return question;
  }

  try {
    const targetQuestion = createCandidate("Target Mistake Label Practice");
    createCandidate("Unlabelled Practice");
    const attempt = attempts.createAttempt({
      mode: "practice",
      subject: "reading",
      startedAt: "2026-06-04T08:00:00.000Z"
    });
    const answer = attempts.saveAnswer({
      attemptId: attempt.id,
      isCorrect: false,
      markedForReview: false,
      normalizedAnswer: "wrong",
      questionId: targetQuestion.id,
      rawAnswer: "wrong",
      timeSpentSeconds: 15
    });
    attempts.addMistakeLabel({ attemptAnswerId: answer.id, label: "定位失败" });
  } finally {
    db.close();
  }
}

function seedReadingMockCandidates(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  function createPassage(input: {
    frequencyClass: "high" | "low" | "medium";
    part: "P1" | "P2" | "P3";
    title: string;
  }) {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: `seed/${input.title}.json`,
      checksum: `checksum-${input.title}`,
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: input.part,
      title: input.title,
      frequencyClass: input.frequencyClass
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: `${input.title} question`,
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["answer"],
      answerSentence: "The evidence sentence contains the answer.",
      explanation: "Use the evidence sentence.",
      synonyms: []
    });
  }

  try {
    createPassage({ frequencyClass: "low", part: "P1", title: "Z Low Frequency P1" });
    createPassage({ frequencyClass: "high", part: "P1", title: "A High Frequency P1" });
    createPassage({ frequencyClass: "medium", part: "P2", title: "Reading P2 Medium" });
    createPassage({ frequencyClass: "low", part: "P3", title: "Reading P3 Low" });
  } finally {
    db.close();
  }
}

function seedMockCandidatesWithAssets(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  function createPassage(input: {
    audioPath?: string;
    frequencyClass: "high" | "low" | "medium";
    part: "P1" | "P2" | "P3" | "P4";
    subject: "listening" | "reading";
    textContent?: string;
    title: string;
  }) {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: `seed/${input.title}.json`,
      checksum: `asset-checksum-${input.title}`,
      importStatus: "imported",
      version: 1
    });
    if (input.textContent) {
      questions.createSourceAsset({
        assetKind: input.subject === "reading" ? "pdf" : "html",
        checksum: `text-${input.title}`,
        filePath: `assets/${input.title}.pdf`,
        originalName: `${input.title}.pdf`,
        sourceId: source.id,
        textContent: input.textContent
      });
    }
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: input.subject,
      part: input.part,
      title: input.title,
      frequencyClass: input.frequencyClass
    });
    if (input.audioPath) {
      questions.createListeningAudio({
        checksum: `audio-${input.title}`,
        durationSeconds: 320,
        filePath: input.audioPath,
        passageId: passage.id
      });
    }
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: `${input.title} question`,
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["answer"],
      answerSentence: "The answer appears in the imported passage.",
      explanation: "Use the imported resource.",
      synonyms: []
    });
  }

  try {
    createPassage({
      frequencyClass: "high",
      part: "P1",
      subject: "reading",
      textContent: "Imported reading passage text appears in the exam pane.",
      title: "Reading Asset P1"
    });
    createPassage({ frequencyClass: "medium", part: "P2", subject: "reading", title: "Reading Asset P2" });
    createPassage({ frequencyClass: "low", part: "P3", subject: "reading", title: "Reading Asset P3" });
    createPassage({
      audioPath: "/Users/musheng/Desktop/IELTS/listening/asset-p1.mp3",
      frequencyClass: "high",
      part: "P1",
      subject: "listening",
      title: "Listening Asset P1"
    });
    createPassage({ frequencyClass: "medium", part: "P2", subject: "listening", title: "Listening Asset P2" });
    createPassage({ frequencyClass: "medium", part: "P3", subject: "listening", title: "Listening Asset P3" });
    createPassage({ frequencyClass: "low", part: "P4", subject: "listening", title: "Listening Asset P4" });
  } finally {
    db.close();
  }
}

describe("practice routes", () => {
  it("filters practice starts by part, frequency class, and question type", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-filter-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    seedPracticeFilterCandidates(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: {
          frequencyClass: "high",
          mode: "practice",
          part: "P2",
          questionType: "single_choice",
          subject: "reading"
        }
      });
      expect(start.statusCode).toBe(200);
      expect(start.json()).toMatchObject({
        questions: [
          expect.objectContaining({
            frequencyClass: "high",
            part: "P2",
            passageTitle: "Target Practice",
            questionType: "single_choice"
          })
        ]
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("filters practice starts by historical mistake label", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-mistake-filter-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    seedPracticeMistakeLabelCandidates(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: {
          mistakeLabel: "定位失败",
          mode: "practice",
          subject: "reading"
        }
      });
      expect(start.statusCode).toBe(200);
      expect(start.json()).toMatchObject({
        questions: [
          expect.objectContaining({
            passageTitle: "Target Mistake Label Practice"
          })
        ]
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("starts, answers, submits, reviews, and reloads a 40-question practice attempt", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    seedFortyQuestions(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string; questionNumber: number }>;
      }>();
      expect(started.questions).toHaveLength(40);

      const firstQuestion = started.questions[0];
      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          questionId: firstQuestion.id,
          rawAnswer: " Answer 1 ",
          timeSpentSeconds: 11,
          markedForReview: true
        }
      });
      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        normalizedAnswer: "answer 1",
        isCorrect: true,
        markedForReview: true
      });

      const submit = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/submit`
      });
      expect(submit.statusCode).toBe(200);
      expect(submit.json()).toMatchObject({
        rawScore: 1,
        estimatedBand: null
      });

      const review = await server.inject({
        method: "GET",
        url: `/api/practice/${started.attemptId}/review`
      });
      expect(review.statusCode).toBe(200);
      expect(review.json()).toMatchObject({
        id: started.attemptId,
        answers: [
          expect.objectContaining({
            questionId: firstQuestion.id,
            rawAnswer: " Answer 1 ",
            isCorrect: true
          })
        ],
        reviewItems: [
          expect.objectContaining({
            answerSentence: "The answer is answer 1.",
            acceptedAnswers: ["answer 1"],
            explanation: "Question 1 is answered directly in the sample text.",
            isCorrect: true,
            passageTitle: "Forty Question Practice Set",
            prompt: "Question 1",
            rawAnswer: " Answer 1 ",
            synonyms: [],
            questionId: firstQuestion.id
          })
        ]
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("applies common word-limit aliases before marking a matched answer correct", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-word-limit-alias-"));
    const databasePath = join(tempDir, "ielts.db");
    seedWordLimitAliasQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "listening" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "green park station",
          timeSpentSeconds: 10
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: false,
        normalizedAnswer: "green park station"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("allows a number outside the word count when the IELTS word-limit rule permits it", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-word-limit-number-"));
    const databasePath = join(tempDir, "ielts.db");
    seedNumberAllowedWordLimitQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "listening" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "green park 24",
          timeSpentSeconds: 10
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "green park 24"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores accepted answers with optional parenthesized words", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-optional-answer-word-"));
    const databasePath = join(tempDir, "ielts.db");
    seedOptionalAnswerWordQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "listening" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "green park",
          timeSpentSeconds: 10
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "green park"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores accepted answers with slash-separated aliases", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-slash-alias-answer-"));
    const databasePath = join(tempDir, "ielts.db");
    seedSlashAliasAnswerQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "listening" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "center",
          timeSpentSeconds: 10
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "center"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores imported unicode dash answers with typed hyphen answers", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-unicode-dash-answer-"));
    const databasePath = join(tempDir, "ielts.db");
    seedUnicodeDashAnswerQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "listening" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "well-known",
          timeSpentSeconds: 10
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "well-known"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores imported answers with surrounding punctuation", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-punctuated-answer-"));
    const databasePath = join(tempDir, "ielts.db");
    seedPunctuatedAnswerQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "green park",
          timeSpentSeconds: 8
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "green park"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores imported answers with surrounding quotes", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-quoted-answer-"));
    const databasePath = join(tempDir, "ielts.db");
    seedQuotedAnswerQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "green park",
          timeSpentSeconds: 8
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "green park"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores imported answers with numbering prefixes", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-numbered-answer-"));
    const databasePath = join(tempDir, "ielts.db");
    seedNumberedAnswerQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "green park",
          timeSpentSeconds: 8
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "green park"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores copied answers with surrounding parentheses", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-parenthesized-answer-"));
    const databasePath = join(tempDir, "ielts.db");
    seedParenthesizedAnswerQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "(green park)",
          timeSpentSeconds: 8
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "green park"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores imported multi-answer cells with delimiters", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-delimited-answers-"));
    const databasePath = join(tempDir, "ielts.db");
    seedDelimitedAnswersQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "green parks",
          timeSpentSeconds: 8
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "green parks"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scores multiple-choice answers without requiring option order", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-multiple-choice-"));
    const databasePath = join(tempDir, "ielts.db");
    seedMultipleChoiceQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", questionType: "multiple_choice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string; questionType: string }>;
      }>();
      expect(started.questions).toEqual([
        expect.objectContaining({
          questionType: "multiple_choice"
        })
      ]);

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "A & C",
          timeSpentSeconds: 12
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "a & c"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("starts mock attempts from the frequency-weighted full-set builder instead of sequential questions", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-mock-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    seedReadingMockCandidates(databasePath);

    const server = buildServer({ databasePath, testBuilderRandom: () => 0.8 });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "mock", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);

      const started = start.json<{
        questions: Array<{ part: string; passageTitle: string; questionNumber: number }>;
      }>();
      expect(started.questions.map((question) => question.passageTitle)).toEqual([
        "A High Frequency P1",
        "Reading P2 Medium",
        "Reading P3 Low"
      ]);
      expect(started.questions.map((question) => question.part)).toEqual(["P1", "P2", "P3"]);
      expect(started.questions).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ passageTitle: "Z Low Frequency P1" })])
      );
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns imported passage text and listening audio metadata with mock questions", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-mock-assets-"));
    const databasePath = join(tempDir, "ielts.db");
    seedMockCandidatesWithAssets(databasePath);

    const server = buildServer({ databasePath, testBuilderRandom: () => 0.1 });

    try {
      const readingStart = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "mock", subject: "reading" }
      });
      expect(readingStart.statusCode).toBe(200);
      expect(readingStart.json()).toMatchObject({
        questions: expect.arrayContaining([
          expect.objectContaining({
            assetPaths: ["assets/Reading Asset P1.pdf"],
            passageText: "Imported reading passage text appears in the exam pane.",
            passageTitle: "Reading Asset P1"
          })
        ])
      });

      const listeningStart = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "mock", subject: "listening" }
      });
      expect(listeningStart.statusCode).toBe(200);
      expect(listeningStart.json()).toMatchObject({
        questions: expect.arrayContaining([
          expect.objectContaining({
            audioPath: "/Users/musheng/Desktop/IELTS/listening/asset-p1.mp3",
            audioDurationSeconds: 320,
            passageTitle: "Listening Asset P1"
          })
        ])
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns imported passage text and listening audio metadata with practice questions", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-assets-"));
    const databasePath = join(tempDir, "ielts.db");
    seedMockCandidatesWithAssets(databasePath);

    const server = buildServer({ databasePath });

    try {
      const readingStart = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(readingStart.statusCode).toBe(200);
      expect(readingStart.json()).toMatchObject({
        questions: expect.arrayContaining([
          expect.objectContaining({
            assetPaths: ["assets/Reading Asset P1.pdf"],
            passageText: "Imported reading passage text appears in the exam pane.",
            passageTitle: "Reading Asset P1"
          })
        ])
      });

      const listeningStart = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "listening" }
      });
      expect(listeningStart.statusCode).toBe(200);
      expect(listeningStart.json()).toMatchObject({
        questions: expect.arrayContaining([
          expect.objectContaining({
            audioPath: "/Users/musheng/Desktop/IELTS/listening/asset-p1.mp3",
            audioDurationSeconds: 320,
            passageTitle: "Listening Asset P1"
          })
        ])
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
