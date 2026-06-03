import type { QuestionType } from "@ielts/shared/questionTypes";

export interface AnswerInputProps {
  questionId: string;
  questionType: QuestionType;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function AnswerInput({ questionId, questionType, value, onBlur, onChange }: AnswerInputProps) {
  if (questionType === "single_choice" || questionType === "multiple_choice") {
    return (
      <textarea
        aria-label={`Answer for question ${questionId}`}
        className="answer-input"
        value={value}
        onBlur={onBlur}
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
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
