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

function countAttempts(databasePath: string): number {
  const db = openDatabase(databasePath);
  try {
    return (db.prepare("SELECT COUNT(*) AS count FROM attempts").get() as { count: number }).count;
  } finally {
    db.close();
  }
}

function countAttemptAnswers(databasePath: string): number {
  const db = openDatabase(databasePath);
  try {
    return (db.prepare("SELECT COUNT(*) AS count FROM attempt_answers").get() as { count: number }).count;
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

function seedSingleListeningQuestion(databasePath: string): string {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/single-listening.json",
      checksum: "single-listening-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Single Listening Question",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Which listening answer is mentioned?",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["audio answer"],
      answerSentence: "The speaker says audio answer.",
      explanation: "The answer belongs to listening.",
      synonyms: []
    });
    return question.id;
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
      acceptedAnswers: ["[the] green park[s]"],
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
      acceptedAnswers: ["centre／center"],
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
      acceptedAnswers: ["Ｇｒｅｅｎ Ｐａｒｋ。"],
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
      acceptedAnswers: ["green park\ngreen parks"],
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

function seedJudgmentAbbreviationQuestion(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/judgment-abbreviation.json",
      checksum: "judgment-abbreviation-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Judgment Abbreviation Practice",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "true_false_not_given",
      prompt: "The passage gives enough evidence for the claim.",
      answerRules: {}
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["NG"],
      answerSentence: "The passage does not state enough evidence.",
      explanation: "Imported IELTS answer keys often abbreviate NOT GIVEN as NG.",
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
  it("does not create an attempt when practice filters return no questions", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-empty-practice-start-"));
    const databasePath = join(tempDir, "ielts.db");

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });

      expect(start.statusCode).toBe(409);
      expect(start.json()).toMatchObject({
        error: "No questions found for this local practice request."
      });
      expect(countAttempts(databasePath)).toBe(0);
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("does not create an attempt when a mock set is missing a required part", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-incomplete-mock-start-"));
    const databasePath = join(tempDir, "ielts.db");
    seedPracticeFilterCandidates(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "mock", subject: "reading" }
      });

      expect(start.statusCode).toBe(409);
      expect(start.json()).toMatchObject({
        error: "No reading candidate found for P3."
      });
      expect(countAttempts(databasePath)).toBe(0);
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

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
      const reviewed = review.json<{
        answers: Array<{ isCorrect: boolean; questionId: string; rawAnswer: string }>;
        id: string;
        reviewItems: Array<{
          acceptedAnswers: string[];
          answerSentence: string | null;
          explanation: string | null;
          isCorrect: boolean;
          passageTitle: string | null;
          prompt: string | null;
          questionId: string;
          rawAnswer: string;
          synonyms: string[];
        }>;
      }>();
      expect(reviewed).toMatchObject({
        id: started.attemptId,
        answers: [
          expect.objectContaining({
            questionId: firstQuestion.id,
            rawAnswer: " Answer 1 ",
            isCorrect: true
          })
        ]
      });
      expect(reviewed.reviewItems).toHaveLength(40);
      expect(reviewed.reviewItems[0]).toMatchObject({
        answerSentence: "The answer is answer 1.",
        acceptedAnswers: ["answer 1"],
        explanation: "Question 1 is answered directly in the sample text.",
        isCorrect: true,
        passageTitle: "Forty Question Practice Set",
        prompt: "Question 1",
        rawAnswer: " Answer 1 ",
        synonyms: [],
        questionId: firstQuestion.id
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("includes unanswered loaded questions in submitted attempt reviews", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-review-unanswered-questions-"));
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

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          questionId: started.questions[0].id,
          rawAnswer: "answer 1",
          timeSpentSeconds: 11,
          markedForReview: false
        }
      });
      expect(answer.statusCode).toBe(200);

      const submit = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/submit`
      });
      expect(submit.statusCode).toBe(200);

      const review = await server.inject({
        method: "GET",
        url: `/api/practice/${started.attemptId}/review`
      });

      expect(review.statusCode).toBe(200);
      const reviewed = review.json<{
        reviewItems: Array<{
          isAnswered: boolean;
          isCorrect: boolean;
          questionId: string;
          questionNumber: number;
          rawAnswer: string;
        }>;
      }>();
      expect(reviewed.reviewItems).toHaveLength(40);
      expect(reviewed.reviewItems[0]).toMatchObject({
        isAnswered: true,
        isCorrect: true,
        questionId: started.questions[0].id,
        rawAnswer: "answer 1"
      });
      expect(reviewed.reviewItems[1]).toMatchObject({
        isAnswered: false,
        isCorrect: false,
        questionId: started.questions[1].id,
        questionNumber: 2,
        rawAnswer: ""
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns not found instead of writing answers for a missing attempt", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-answer-missing-attempt-"));
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
        questions: Array<{ id: string }>;
      }>();

      const answer = await server.inject({
        method: "POST",
        url: "/api/practice/missing-attempt-id/answer",
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "answer 1",
          timeSpentSeconds: 9
        }
      });

      expect(answer.statusCode).toBe(404);
      expect(answer.json()).toMatchObject({
        error: "Attempt not found."
      });
      expect(countAttemptAnswers(databasePath)).toBe(0);
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns not found instead of writing answers for a missing question", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-answer-missing-question-"));
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
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: "missing-question-id",
          rawAnswer: "answer 1",
          timeSpentSeconds: 9
        }
      });

      expect(answer.statusCode).toBe(404);
      expect(answer.json()).toMatchObject({
        error: "Question not found."
      });
      expect(countAttemptAnswers(databasePath)).toBe(0);
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects answers whose question subject does not match the attempt subject", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-answer-subject-mismatch-"));
    const databasePath = join(tempDir, "ielts.db");
    seedFortyQuestions(databasePath);
    const listeningQuestionId = seedSingleListeningQuestion(databasePath);

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
      }>();

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: listeningQuestionId,
          rawAnswer: "audio answer",
          timeSpentSeconds: 9
        }
      });

      expect(answer.statusCode).toBe(409);
      expect(answer.json()).toMatchObject({
        error: "Question subject does not match attempt subject."
      });
      expect(countAttemptAnswers(databasePath)).toBe(0);
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects answer changes after an attempt has been submitted", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-answer-after-submit-"));
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
        questions: Array<{ id: string }>;
      }>();
      const questionId = started.questions[0].id;

      const firstAnswer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId,
          rawAnswer: "answer 1",
          timeSpentSeconds: 9
        }
      });
      expect(firstAnswer.statusCode).toBe(200);

      const submit = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/submit`
      });
      expect(submit.statusCode).toBe(200);

      const lateAnswer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId,
          rawAnswer: "wrong after submit",
          timeSpentSeconds: 12
        }
      });

      expect(lateAnswer.statusCode).toBe(409);
      expect(lateAnswer.json()).toMatchObject({
        error: "Attempt has already been submitted."
      });
      expect(countAttemptAnswers(databasePath)).toBe(1);

      const review = await server.inject({
        method: "GET",
        url: `/api/practice/${started.attemptId}/review`
      });
      expect(review.statusCode).toBe(200);
      expect(review.json()).toMatchObject({
        answers: [
          expect.objectContaining({
            questionId,
            rawAnswer: "answer 1"
          })
        ]
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects duplicate submissions for an already submitted attempt", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-submit-duplicate-attempt-"));
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
      }>();

      const firstSubmit = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/submit`
      });
      expect(firstSubmit.statusCode).toBe(200);

      const duplicateSubmit = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/submit`
      });

      expect(duplicateSubmit.statusCode).toBe(409);
      expect(duplicateSubmit.json()).toMatchObject({
        error: "Attempt has already been submitted."
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns not found when submitting a missing attempt", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-submit-missing-attempt-"));
    const databasePath = join(tempDir, "ielts.db");
    seedFortyQuestions(databasePath);

    const server = buildServer({ databasePath });

    try {
      const submit = await server.inject({
        method: "POST",
        url: "/api/practice/missing-attempt-id/submit"
      });

      expect(submit.statusCode).toBe(404);
      expect(submit.json()).toMatchObject({
        error: "Attempt not found."
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns not found when reviewing a missing attempt", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-review-missing-attempt-"));
    const databasePath = join(tempDir, "ielts.db");
    seedFortyQuestions(databasePath);

    const server = buildServer({ databasePath });

    try {
      const review = await server.inject({
        method: "GET",
        url: "/api/practice/missing-attempt-id/review"
      });

      expect(review.statusCode).toBe(404);
      expect(review.json()).toMatchObject({
        error: "Attempt not found."
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

  it("does not estimate an IELTS band for incomplete mock sets", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-incomplete-mock-score-"));
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
        attemptId: string;
        questions: Array<{ id: string }>;
      }>();
      expect(started.questions).toHaveLength(3);

      for (const question of started.questions) {
        const answer = await server.inject({
          method: "POST",
          url: `/api/practice/${started.attemptId}/answer`,
          payload: {
            markedForReview: false,
            questionId: question.id,
            rawAnswer: "answer",
            timeSpentSeconds: 20
          }
        });
        expect(answer.statusCode).toBe(200);
      }

      const submit = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/submit`
      });

      expect(submit.statusCode).toBe(200);
      expect(submit.json()).toMatchObject({
        rawScore: 3,
        estimatedBand: null
      });
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

  it("scores IELTS judgment abbreviations against fixed UI choices", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-judgment-abbreviation-"));
    const databasePath = join(tempDir, "ielts.db");
    seedJudgmentAbbreviationQuestion(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", questionType: "true_false_not_given", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string; questionType: string }>;
      }>();
      expect(started.questions).toEqual([
        expect.objectContaining({
          questionType: "true_false_not_given"
        })
      ]);

      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          markedForReview: false,
          questionId: started.questions[0].id,
          rawAnswer: "NOT GIVEN",
          timeSpentSeconds: 12
        }
      });

      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        isCorrect: true,
        normalizedAnswer: "not given"
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
