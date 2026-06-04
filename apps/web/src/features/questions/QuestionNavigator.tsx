export type QuestionNavState =
  | "unanswered"
  | "answered"
  | "current"
  | "marked"
  | "correct"
  | "incorrect";

export interface QuestionNavigatorItem {
  questionNumber: number;
  state: QuestionNavState;
}

export interface QuestionNavigatorProps {
  items: QuestionNavigatorItem[];
  onSelectQuestion?: (questionNumber: number) => void;
}

export function QuestionNavigator({ items, onSelectQuestion }: QuestionNavigatorProps) {
  return (
    <nav className="question-navigator" aria-label="Question navigation">
      {items.map((item) => (
        <button
          aria-label={`Question ${item.questionNumber}, ${item.state}`}
          className={`question-nav-item question-nav-item-${item.state}`}
          key={item.questionNumber}
          onClick={() => onSelectQuestion?.(item.questionNumber)}
          type="button"
        >
          {item.questionNumber}
        </button>
      ))}
    </nav>
  );
}
