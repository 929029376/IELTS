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

export interface PracticeQuestionResponse {
  id: string;
  passageId: string;
  passageTitle: string;
  questionNumber: number;
  questionType: string;
  prompt: string;
  answerRules: Record<string, unknown>;
  part: string;
}

export function createPracticeService(db: DatabaseHandle) {
  const attempts = createAttemptRepo(db);
  const questions = createQuestionRepo(db);

  return {
    startPractice(input: {
      mode: "practice" | "mock" | "intensive";
      subject: Subject;
    }): { attemptId: string; questions: PracticeQuestionResponse[] } {
      const practiceQuestions = questions.listPracticeQuestions({
        subject: input.subject,
        limit: 40
      });
      const attempt = attempts.createAttempt({
        mode: input.mode,
        subject: input.subject,
        startedAt: new Date().toISOString()
      });

      return {
        attemptId: attempt.id,
        questions: practiceQuestions.map((question) => ({
          id: question.id,
          passageId: question.passageId,
          passageTitle: question.passageTitle,
          questionNumber: question.questionNumber,
          questionType: question.questionType,
          prompt: question.prompt,
          answerRules: question.answerRules,
          part: question.part
        }))
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

      return attempt;
    }
  };
}
