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
}

export function QuestionNavigator({ items }: QuestionNavigatorProps) {
  return (
    <nav className="question-navigator" aria-label="Question navigation">
      {items.map((item) => (
        <button
          aria-label={`Question ${item.questionNumber}, ${item.state}`}
          className={`question-nav-item question-nav-item-${item.state}`}
          key={item.questionNumber}
          type="button"
        >
          {item.questionNumber}
        </button>
      ))}
    </nav>
  );
}
