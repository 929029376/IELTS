import {
  academicReadingBandTable,
  estimateBand,
  isAnswerCorrect,
  listeningBandTable,
  normalizeAnswer
} from "@ielts/shared";
import type { Subject } from "@ielts/shared";
import { createAttemptRepo } from "../db/attemptRepo";
import type { DatabaseHandle } from "../db/database";
import { createQuestionRepo } from "../db/questionRepo";
import { buildFullListeningSet, buildFullReadingSet, type TestBuilderOptions } from "./testBuilder";

export interface PracticeQuestionResponse {
  assetPaths: string[];
  audioDurationSeconds: number | null;
  audioPath: string | null;
  id: string;
  passageId: string;
  passageText: string | null;
  passageTitle: string;
  questionNumber: number;
  questionType: string;
  prompt: string;
  answerRules: Record<string, unknown>;
  part: string;
}

export function createPracticeService(db: DatabaseHandle, options: TestBuilderOptions = {}) {
  const attempts = createAttemptRepo(db);
  const questions = createQuestionRepo(db);

  return {
    startPractice(input: {
      mode: "practice" | "mock" | "intensive";
      subject: Subject;
    }): { attemptId: string; questions: PracticeQuestionResponse[] } {
      const practiceQuestions: PracticeQuestionResponse[] =
        input.mode === "mock"
          ? (input.subject === "listening" ? buildFullListeningSet(db, options) : buildFullReadingSet(db, options))
              .passages.flatMap((passage) => {
                const loaded = questions.getPassageWithQuestions(passage.id);
                const assets = loaded ? questions.listSourceAssets(loaded.sourceId) : [];
                const audio = loaded ? questions.getFirstListeningAudio(loaded.id) : null;
                const passageText = assets.find((asset) => asset.textContent)?.textContent ?? null;
                const assetPaths = assets.flatMap((asset) => (asset.filePath ? [asset.filePath] : []));
                return (
                  loaded?.questions.map((question): PracticeQuestionResponse => ({
                    assetPaths,
                    audioDurationSeconds: audio?.durationSeconds ?? null,
                    audioPath: audio?.filePath ?? null,
                    id: question.id,
                    passageId: question.passageId,
                    passageText,
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
                subject: input.subject,
                limit: 40
              })
              .map((question): PracticeQuestionResponse => ({
                assetPaths: [],
                audioDurationSeconds: null,
                audioPath: null,
                id: question.id,
                passageId: question.passageId,
                passageText: null,
                passageTitle: question.passageTitle,
                questionNumber: question.questionNumber,
                questionType: question.questionType,
                prompt: question.prompt,
                answerRules: question.answerRules,
                part: question.part
              }));
      const attempt = attempts.createAttempt({
        mode: input.mode,
        subject: input.subject,
        startedAt: new Date().toISOString()
      });

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
      const question = questions.getQuestionWithAnswerKeys(input.questionId);
      if (!question) {
        throw new Error("Question not found.");
      }

      const acceptedAnswers = question.answerKeys.flatMap((answerKey) => answerKey.acceptedAnswers);
      const maxWords =
        typeof question.answerRules.maxWords === "number" ? question.answerRules.maxWords : undefined;
      const normalizedAnswer = normalizeAnswer(input.rawAnswer);
      const isCorrect = isAnswerCorrect(input.rawAnswer, acceptedAnswers, { maxWords });

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
        throw new Error("Attempt not found.");
      }

      const rawScore = attempt.answers.filter((answer) => answer.isCorrect).length;
      const table = attempt.subject === "listening" ? listeningBandTable : academicReadingBandTable;
      const estimatedBand = estimateBand(rawScore, table);
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
        throw new Error("Attempt not found.");
      }

      const reviewItems = attempt.answers.map((answer) => {
        const question = questions.getQuestionWithAnswerKeys(answer.questionId);
        const answerKeys = question?.answerKeys ?? [];
        return {
          answerSentence: answerKeys.find((answerKey) => answerKey.answerSentence)?.answerSentence ?? null,
          acceptedAnswers: answerKeys.flatMap((answerKey) => answerKey.acceptedAnswers),
          explanation: answerKeys.find((answerKey) => answerKey.explanation)?.explanation ?? null,
          isCorrect: answer.isCorrect,
          markedForReview: answer.markedForReview,
          part: question?.part ?? null,
          passageTitle: question?.passageTitle ?? null,
          prompt: question?.prompt ?? null,
          questionId: answer.questionId,
          questionNumber: question?.questionNumber ?? null,
          questionType: question?.questionType ?? null,
          rawAnswer: answer.rawAnswer,
          synonyms: answerKeys.flatMap((answerKey) => answerKey.synonyms)
        };
      });

      return { ...attempt, reviewItems };
    }
  };
}
