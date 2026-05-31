import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExamShell } from "../features/exam/ExamShell";
import { ListeningExamView } from "../features/exam/ListeningExamView";
import { ReadingExamView } from "../features/exam/ReadingExamView";
import { ScoreReport } from "../features/exam/ScoreReport";
import { createQuestionNavItems } from "../features/exam/questionNav";

describe("exam simulation components", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders timer, help, settings, review marker, bottom nav, and submit warning", () => {
    const onSubmit = vi.fn();

    render(
      <ExamShell
        title="Reading Mock Test"
        durationSeconds={3600}
        questions={[
          { questionNumber: 1, answered: true, markedForReview: false },
          { questionNumber: 2, answered: false, markedForReview: true }
        ]}
        onSubmit={onSubmit}
      >
        <p>Exam body</p>
      </ExamShell>
    );

    expect(screen.getByText("60:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark for review" })).toBeInTheDocument();
    expect(screen.getByLabelText("Question 2, marked")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit test" }));

    expect(screen.getByText("1 unanswered question and 1 marked question remain.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit anyway" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("auto-submits when time expires", () => {
    const onSubmit = vi.fn();

    render(
      <ExamShell
        title="Timed Mock Test"
        durationSeconds={2}
        questions={[{ questionNumber: 1, answered: true, markedForReview: false }]}
        onSubmit={onSubmit}
      >
        <p>Exam body</p>
      </ExamShell>
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSubmit).toHaveBeenCalledWith({ reason: "time_expired" });
  });

  it("renders reading split panes with highlight, notes, and font size controls", () => {
    render(
      <ReadingExamView
        passageTitle="The History of Tea"
        passageText="Tea became popular because the answer sentence explains the trade."
        highlightedText="answer sentence"
        questions={<p>Questions 1-13</p>}
      />
    );

    expect(screen.getByText("The History of Tea")).toBeInTheDocument();
    expect(screen.getByText("answer sentence")).toHaveClass("ielts-highlight");
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Small font" })).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: "Resize reading panes" })).toBeInTheDocument();
  });

  it("renders listening sections and strict mock playback controls", () => {
    render(
      <ListeningExamView
        mode="mock"
        audioTitle="Section 1 audio"
        sections={[
          { id: "s1", title: "Section 1", questions: <p>Questions 1-10</p> },
          { id: "s2", title: "Section 2", questions: <p>Questions 11-20</p> }
        ]}
        finalReviewSeconds={120}
      />
    );

    expect(screen.getByText("Section 1 audio")).toBeInTheDocument();
    expect(screen.getByText("Final review time: 02:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause disabled in mock mode" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Seek disabled in mock mode" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Speed disabled in mock mode" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Section 2" })).toBeInTheDocument();
  });

  it("maps answered and marked question data to nav states", () => {
    expect(
      createQuestionNavItems([
        { questionNumber: 1, answered: false, markedForReview: false },
        { questionNumber: 2, answered: true, markedForReview: false },
        { questionNumber: 3, answered: false, markedForReview: true }
      ])
    ).toEqual([
      { questionNumber: 1, state: "unanswered" },
      { questionNumber: 2, state: "answered" },
      { questionNumber: 3, state: "marked" }
    ]);
  });

  it("renders a mock score report", () => {
    render(<ScoreReport subject="reading" rawScore={32} estimatedBand={7} />);

    expect(screen.getByRole("region", { name: "Score report" })).toBeInTheDocument();
    expect(screen.getByText("32/40")).toBeInTheDocument();
    expect(screen.getByText("7.0")).toBeInTheDocument();
  });
});
