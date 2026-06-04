import type { QuestionType } from "@ielts/shared/questionTypes";

export interface AnswerInputProps {
  questionId: string;
  questionType: QuestionType;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

const trueFalseNotGivenChoices = ["TRUE", "FALSE", "NOT GIVEN"];
const yesNoNotGivenChoices = ["YES", "NO", "NOT GIVEN"];

function fixedChoicesForQuestionType(questionType: QuestionType) {
  if (questionType === "true_false_not_given") {
    return trueFalseNotGivenChoices;
  }

  if (questionType === "yes_no_not_given") {
    return yesNoNotGivenChoices;
  }

  return null;
}

function normalizedFixedChoiceValue(value: string, fixedChoices: string[]) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  return fixedChoices.find((choice) => choice.toLowerCase() === normalizedValue) ?? value;
}

export function AnswerInput({ questionId, questionType, value, onBlur, onChange }: AnswerInputProps) {
  const fixedChoices = fixedChoicesForQuestionType(questionType);
  if (fixedChoices) {
    return (
      <select
        aria-label={`Answer for question ${questionId}`}
        className="answer-input"
        value={normalizedFixedChoiceValue(value, fixedChoices)}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose answer</option>
        {fixedChoices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    );
  }

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
