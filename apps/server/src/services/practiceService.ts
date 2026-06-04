import {
  academicReadingBandTable,
  estimateBand,
  type FrequencyClass,
  isAnswerCorrect,
  listeningBandTable,
  normalizeAnswer
} from "@ielts/shared";
import type { Part, Subject } from "@ielts/shared";
import type { QuestionType } from "@ielts/shared/questionTypes";
import { createAttemptRepo } from "../db/attemptRepo";
import type { DatabaseHandle } from "../db/database";
import { createQuestionRepo } from "../db/questionRepo";
import { buildFullListeningSet, buildFullReadingSet, type TestBuilderOptions } from "./testBuilder";

export interface PracticeQuestionResponse {
  assetPaths: string[];
  audioDurationSeconds: number | null;
  audioPath: string | null;
  id: string;
  frequencyClass: FrequencyClass;
  passageId: string;
  passageText: string | null;
  passageTitle: string;
  questionNumber: number;
  questionType: string;
  prompt: string;
  answerRules: Record<string, unknown>;
  part: string;
}

export class EmptyPracticeStartError extends Error {
  constructor() {
    super("No questions found for this local practice request.");
    this.name = "EmptyPracticeStartError";
  }
}

export class PracticeAttemptNotFoundError extends Error {
  constructor() {
    super("Attempt not found.");
    this.name = "PracticeAttemptNotFoundError";
  }
}

export class PracticeAttemptAlreadySubmittedError extends Error {
  constructor() {
    super("Attempt has already been submitted.");
    this.name = "PracticeAttemptAlreadySubmittedError";
  }
}

export class PracticeQuestionNotFoundError extends Error {
  constructor() {
    super("Question not found.");
    this.name = "PracticeQuestionNotFoundError";
  }
}

export class PracticeQuestionSubjectMismatchError extends Error {
  constructor() {
    super("Question subject does not match attempt subject.");
    this.name = "PracticeQuestionSubjectMismatchError";
  }
}

const wordLimitNumbers: Record<string, number> = {
  eight: 8,
  five: 5,
  four: 4,
  nine: 9,
  one: 1,
  seven: 7,
  six: 6,
  ten: 10,
  three: 3,
  two: 2
};

const fullIeltsTestQuestionCount = 40;

function parseWordLimit(value: string): number | undefined {
  const numericMatch = value.match(/\d+/);
  if (numericMatch) {
    return Number.parseInt(numericMatch[0], 10);
  }

  const normalized = value.toLowerCase();
  for (const [word, limit] of Object.entries(wordLimitNumbers)) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      return limit;
    }
  }

  return undefined;
}

function getMaxWords(answerRules: Record<string, unknown>): number | undefined {
  for (const key of ["maxWords", "wordLimit", "max_words"]) {
    const value = answerRules[key];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseWordLimit(value);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

function getAllowNumber(answerRules: Record<string, unknown>): boolean {
  for (const key of ["allowNumber", "allow_number", "numberAllowed", "number_allowed"]) {
    if (answerRules[key] === true) {
      return true;
    }
  }

  for (const key of ["maxWords", "wordLimit", "max_words"]) {
    const value = answerRules[key];
    if (typeof value === "string" && /\bnumber\b/i.test(value)) {
      return true;
    }
  }

  return false;
}

export function createPracticeService(db: DatabaseHandle, options: TestBuilderOptions = {}) {
  const attempts = createAttemptRepo(db);
  const questions = createQuestionRepo(db);

  function getPassageResources(passageId: string) {
    const loaded = questions.getPassageWithQuestions(passageId);
    const assets = loaded ? questions.listSourceAssets(loaded.sourceId) : [];
    const audio = loaded ? questions.getFirstListeningAudio(loaded.id) : null;
    return {
      assetPaths: assets.flatMap((asset) => (asset.filePath ? [asset.filePath] : [])),
      audioDurationSeconds: audio?.durationSeconds ?? null,
      audioPath: audio?.filePath ?? null,
      passageText: assets.find((asset) => asset.textContent)?.textContent ?? null
    };
  }

  return {
    startPractice(input: {
      frequencyClass?: FrequencyClass;
      mistakeLabel?: string;
      mode: "practice" | "mock" | "intensive";
      part?: Part;
      questionType?: QuestionType;
      subject: Subject;
    }): { attemptId: string; questions: PracticeQuestionResponse[] } {
      const practiceQuestions: PracticeQuestionResponse[] =
        input.mode === "mock"
          ? (input.subject === "listening" ? buildFullListeningSet(db, options) : buildFullReadingSet(db, options))
              .passages.flatMap((passage) => {
                const loaded = questions.getPassageWithQuestions(passage.id);
                const resources = getPassageResources(passage.id);
                return (
                  loaded?.questions.map((question): PracticeQuestionResponse => ({
                    assetPaths: resources.assetPaths,
                    audioDurationSeconds: resources.audioDurationSeconds,
                    audioPath: resources.audioPath,
                    frequencyClass: loaded.frequencyClass,
                    id: question.id,
                    passageId: question.passageId,
                    passageText: resources.passageText,
                    passageTitle: loaded.title,
                    questionNumber: question.questionNumber,
                    questionType: question.questionType,
                    prompt: question.prompt,
                    answerRules: question.answerRules,
                    part: loaded.part
                  })) ?? []
                );
              })
          : questions
              .listPracticeQuestions({
                frequencyClass: input.frequencyClass,
                mistakeLabel: input.mistakeLabel,
                part: input.part,
                questionType: input.questionType,
                subject: input.subject,
                limit: 40
              })
              .map((question): PracticeQuestionResponse => ({
                ...getPassageResources(question.passageId),
                frequencyClass: question.frequencyClass,
                id: question.id,
                passageId: question.passageId,
                passageTitle: question.passageTitle,
                questionNumber: question.questionNumber,
                questionType: question.questionType,
                prompt: question.prompt,
                answerRules: question.answerRules,
                part: question.part
              }));

      if (practiceQuestions.length === 0) {
        throw new EmptyPracticeStartError();
      }

      const attempt = attempts.createAttempt({
        mode: input.mode,
        subject: input.subject,
        startedAt: new Date().toISOString()
      });
      attempts.recordAttemptQuestions(
        attempt.id,
        practiceQuestions.map((question) => question.id)
      );

      return {
        attemptId: attempt.id,
        questions: practiceQuestions
      };
    },

    answerQuestion(input: {
      attemptId: string;
      questionId: string;
      rawAnswer: string;
      timeSpentSeconds: number;
      markedForReview: boolean;
    }) {
      const attempt = attempts.getAttemptWithAnswers(input.attemptId);
      if (!attempt) {
        throw new PracticeAttemptNotFoundError();
      }
      if (attempt.submittedAt) {
        throw new PracticeAttemptAlreadySubmittedError();
      }

      const question = questions.getQuestionWithAnswerKeys(input.questionId);
      if (!question) {
        throw new PracticeQuestionNotFoundError();
      }
      if (question.subject !== attempt.subject) {
        throw new PracticeQuestionSubjectMismatchError();
      }

      const acceptedAnswers = question.answerKeys.flatMap((answerKey) => answerKey.acceptedAnswers);
      const maxWords = getMaxWords(question.answerRules);
      const allowNumber = getAllowNumber(question.answerRules);
      const unorderedChoices = question.questionType === "multiple_choice";
      const judgmentAliases =
        question.questionType === "true_false_not_given" || question.questionType === "yes_no_not_given";
      const normalizedAnswer = normalizeAnswer(input.rawAnswer);
      const isCorrect = isAnswerCorrect(input.rawAnswer, acceptedAnswers, {
        allowNumber,
        judgmentAliases,
        maxWords,
        unorderedChoices
      });

      const answer = attempts.saveAnswer({
        attemptId: input.attemptId,
        questionId: input.questionId,
        rawAnswer: input.rawAnswer,
        normalizedAnswer,
        isCorrect,
        timeSpentSeconds: input.timeSpentSeconds,
        markedForReview: input.markedForReview
      });

      return {
        attemptId: answer.attemptId,
        id: answer.id,
        questionId: answer.questionId,
        rawAnswer: answer.rawAnswer,
        normalizedAnswer: answer.normalizedAnswer,
        isCorrect: answer.isCorrect,
        markedForReview: answer.markedForReview,
        timeSpentSeconds: answer.timeSpentSeconds
      };
    },

    submitPractice(attemptId: string) {
      const attempt = attempts.getAttemptWithAnswers(attemptId);
      if (!attempt) {
        throw new PracticeAttemptNotFoundError();
      }
      if (attempt.submittedAt) {
        throw new PracticeAttemptAlreadySubmittedError();
      }

      const rawScore = attempt.answers.filter((answer) => answer.isCorrect).length;
      const table = attempt.subject === "listening" ? listeningBandTable : academicReadingBandTable;
      const loadedQuestionCount = attempt.questions.length || attempt.answers.length;
      const shouldEstimateBand = attempt.mode === "mock" && loadedQuestionCount >= fullIeltsTestQuestionCount;
      const estimatedBand = shouldEstimateBand ? estimateBand(rawScore, table) : null;
      const submittedAt = new Date().toISOString();

      attempts.submitAttempt({
        attemptId,
        submittedAt,
        rawScore,
        estimatedBand
      });

      return {
        attemptId,
        submittedAt,
        rawScore,
        estimatedBand
      };
    },

    reviewPractice(attemptId: string) {
      const attempt = attempts.getAttemptWithAnswers(attemptId);
      if (!attempt) {
        throw new PracticeAttemptNotFoundError();
      }

      const answerByQuestionId = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
      const reviewQuestionIds =
        attempt.questions.length > 0
          ? attempt.questions.map((loadedQuestion) => loadedQuestion.questionId)
          : attempt.answers.map((answer) => answer.questionId);
      const reviewItems = reviewQuestionIds.map((questionId) => {
        const answer = answerByQuestionId.get(questionId);
        const question = questions.getQuestionWithAnswerKeys(questionId);
        const answerKeys = question?.answerKeys ?? [];
        return {
          answerSentence: answerKeys.find((answerKey) => answerKey.answerSentence)?.answerSentence ?? null,
          acceptedAnswers: answerKeys.flatMap((answerKey) => answerKey.acceptedAnswers),
          explanation: answerKeys.find((answerKey) => answerKey.explanation)?.explanation ?? null,
          isAnswered: Boolean(answer),
          isCorrect: answer?.isCorrect ?? false,
          markedForReview: answer?.markedForReview ?? false,
          part: question?.part ?? null,
          passageTitle: question?.passageTitle ?? null,
          prompt: question?.prompt ?? null,
          questionId,
          questionNumber: question?.questionNumber ?? null,
          questionType: question?.questionType ?? null,
          rawAnswer: answer?.rawAnswer ?? "",
          synonyms: answerKeys.flatMap((answerKey) => answerKey.synonyms)
        };
      });

      return { ...attempt, reviewItems };
    }
  };
}
