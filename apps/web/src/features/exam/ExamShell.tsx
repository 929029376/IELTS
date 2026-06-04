import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CircleHelp, Flag, Settings, Timer } from "lucide-react";
import { QuestionNavigator } from "../questions/QuestionNavigator";
import { createQuestionNavItems, formatTimer, type ExamQuestionState } from "./questionNav";

export interface ExamSubmitEvent {
  reason: "manual" | "time_expired";
}

export interface ExamShellProps extends PropsWithChildren {
  title: string;
  durationSeconds: number;
  questions: ExamQuestionState[];
  onSubmit: (event: ExamSubmitEvent) => void;
  onSelectQuestion?: (questionNumber: number) => void;
  onToggleCurrentQuestionMark?: () => void;
  submitLabel?: string;
}

export function ExamShell({
  title,
  durationSeconds,
  questions,
  onSubmit,
  onSelectQuestion,
  onToggleCurrentQuestionMark,
  submitLabel = "Submit test",
  children
}: ExamShellProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activePanel, setActivePanel] = useState<"help" | "settings" | null>(null);
  const [largeText, setLargeText] = useState(false);
  const unansweredCount = questions.filter((question) => !question.answered).length;
  const markedCount = questions.filter((question) => question.markedForReview).length;
  const navItems = useMemo(() => createQuestionNavItems(questions), [questions]);

  function submit(reason: ExamSubmitEvent["reason"]) {
    if (isSubmitted) {
      return;
    }
    setIsSubmitted(true);
    onSubmit({ reason });
  }

  useEffect(() => {
    if (isSubmitted) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          submit("time_expired");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isSubmitted]);

  function handleSubmitClick() {
    if (unansweredCount > 0 || markedCount > 0) {
      setShowWarning(true);
      return;
    }
    submit("manual");
  }

  return (
    <section className={largeText ? "exam-shell exam-shell-large-text" : "exam-shell"} aria-label={title}>
      <header className="exam-topbar">
        <div className="exam-title-group">
          <BookOpen size={18} aria-hidden="true" />
          <h2>{title}</h2>
        </div>
        <div className="exam-controls" aria-label="Exam controls">
          <span className="exam-timer" aria-label="Time remaining">
            <Timer size={16} aria-hidden="true" />
            {formatTimer(remainingSeconds)}
          </span>
          <button type="button" onClick={() => setActivePanel("help")}>
            <CircleHelp size={16} aria-hidden="true" />
            Help
          </button>
          <button type="button" onClick={() => setActivePanel("settings")}>
            <Settings size={16} aria-hidden="true" />
            Settings
          </button>
          <button type="button" onClick={onToggleCurrentQuestionMark}>
            <Flag size={16} aria-hidden="true" />
            Mark for review
          </button>
        </div>
      </header>

      {activePanel === "help" ? (
        <section className="exam-popover" role="dialog" aria-label="Exam help">
          <div>
            <h3>Exam help</h3>
            <p>Use the question numbers to move through the test, mark questions for review, and submit when ready.</p>
          </div>
          <button type="button" onClick={() => setActivePanel(null)}>
            Close exam help
          </button>
        </section>
      ) : null}

      {activePanel === "settings" ? (
        <section className="exam-popover" role="dialog" aria-label="Exam settings">
          <div>
            <h3>Exam settings</h3>
            <p>Adjust the exam interface for comfortable reading.</p>
          </div>
          <button
            aria-pressed={largeText}
            type="button"
            onClick={() => setLargeText((current) => !current)}
          >
            Large interface text
          </button>
        </section>
      ) : null}

      <div className="exam-content">{children}</div>

      {showWarning ? (
        <div className="submit-warning" role="alert">
          <p>
            {unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"} and {markedCount} marked
            question{markedCount === 1 ? "" : "s"} remain.
          </p>
          <button type="button" onClick={() => submit("manual")}>
            Submit anyway
          </button>
        </div>
      ) : null}

      <footer className="exam-bottom-bar">
        <QuestionNavigator items={navItems} onSelectQuestion={onSelectQuestion} />
        <button className="submit-test-button" type="button" onClick={handleSubmitClick}>
          {submitLabel}
        </button>
      </footer>
    </section>
  );
}
