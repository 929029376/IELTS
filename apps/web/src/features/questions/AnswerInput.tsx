import type { QuestionType } from "@ielts/shared/questionTypes";

export interface AnswerInputProps {
  questionId: string;
  questionType: QuestionType;
  value: string;
  onChange: (value: string) => void;
}

export function AnswerInput({ questionId, questionType, value, onChange }: AnswerInputProps) {
  if (questionType === "single_choice" || questionType === "multiple_choice") {
    return (
      <textarea
        aria-label={`Answer for question ${questionId}`}
        className="answer-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
      />
    );
  }

  return (
    <input
      aria-label={`Answer for question ${questionId}`}
      className="answer-input"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
