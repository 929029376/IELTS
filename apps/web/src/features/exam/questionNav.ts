import type { QuestionNavigatorItem } from "../questions/QuestionNavigator";

export interface ExamQuestionState {
  questionNumber: number;
  answered: boolean;
  markedForReview: boolean;
  current?: boolean;
  correct?: boolean;
  incorrect?: boolean;
}

export function createQuestionNavItems(questions: ExamQuestionState[]): QuestionNavigatorItem[] {
  return questions.map((question) => {
    if (question.current) {
      return { questionNumber: question.questionNumber, state: "current" };
    }
    if (question.correct) {
      return { questionNumber: question.questionNumber, state: "correct" };
    }
    if (question.incorrect) {
      return { questionNumber: question.questionNumber, state: "incorrect" };
    }
    if (question.markedForReview) {
      return { questionNumber: question.questionNumber, state: "marked" };
    }
    if (question.answered) {
      return { questionNumber: question.questionNumber, state: "answered" };
    }
    return { questionNumber: question.questionNumber, state: "unanswered" };
  });
}

export function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
