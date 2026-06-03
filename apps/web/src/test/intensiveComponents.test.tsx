import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CueEditor } from "../features/intensive/CueEditor";
import { IntensiveListeningPlayer } from "../features/intensive/IntensiveListeningPlayer";
import { CloseReadingView } from "../features/intensive/CloseReadingView";
import { IntensivePracticePreview } from "../features/intensive/IntensivePracticePreview";

describe("intensive study components", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses segment repeat when cues exist", () => {
    render(
      <IntensiveListeningPlayer
        audioTitle="Booking call"
        cues={[
          {
            id: "cue-1",
            startSeconds: 1,
            endSeconds: 4,
            label: "Sentence 1",
            transcript: "Green Park"
          }
        ]}
        onDictationSubmit={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Repeat Sentence 1" })).toBeInTheDocument();
    expect(screen.queryByText("No sentence cues yet. Use A-B repeat or create a cue.")).not.toBeInTheDocument();
  });

  it("uses stable sentence labels when live cue labels are missing", () => {
    render(
      <IntensivePracticePreview
        preview={{
          listening: {
            audioTitle: "Live cue review",
            cues: [{ endSeconds: 4, id: "cue-without-label", label: null, startSeconds: 1, transcript: "Green Park" }]
          },
          reading: null
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Repeat Sentence 1" })).toBeInTheDocument();
  });

  it("falls back to A-B repeat and cue prompt when no cues exist", () => {
    render(<IntensiveListeningPlayer audioTitle="Booking call" cues={[]} onDictationSubmit={() => undefined} />);

    expect(screen.getByRole("button", { name: "Set A point" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set B point" })).toBeInTheDocument();
    expect(screen.getByText("No sentence cues yet. Use A-B repeat or create a cue.")).toBeInTheDocument();
  });

  it("submits dictation text", () => {
    const onDictationSubmit = vi.fn();
    render(
      <IntensiveListeningPlayer
        audioTitle="Booking call"
        cues={[{ id: "cue-1", startSeconds: 1, endSeconds: 4, label: "Sentence 1", transcript: "Green Park" }]}
        onDictationSubmit={onDictationSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText("Dictation input"), { target: { value: "green park" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit dictation" }));

    expect(onDictationSubmit).toHaveBeenCalledWith({ cueId: "cue-1", userText: "green park" });
  });

  it("edits listening cue fields", () => {
    const onSave = vi.fn();
    render(<CueEditor onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Cue label"), { target: { value: "Sentence 1" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "3.5" } });
    fireEvent.change(screen.getByLabelText("Transcript"), { target: { value: "Green Park" } });
    fireEvent.click(screen.getByRole("button", { name: "Save cue" }));

    expect(onSave).toHaveBeenCalledWith({
      label: "Sentence 1",
      startSeconds: 1.5,
      endSeconds: 3.5,
      transcript: "Green Park"
    });
  });

  it("renders close reading evidence, manual answer sentence selection, and mistake labels", () => {
    const onSelectAnswerSentence = vi.fn();
    const onMistakeLabel = vi.fn();

    render(
      <CloseReadingView
        passageText="Tea travelled along trade routes. The answer sentence identifies the key evidence."
        answerSentence="answer sentence"
        keywords={["trade routes"]}
        synonyms={["evidence", "proof"]}
        explanation="The sentence directly supports the answer."
        question={<p>Question 1</p>}
        isWrongAnswer
        onSelectAnswerSentence={onSelectAnswerSentence}
        onMistakeLabel={onMistakeLabel}
      />
    );

    expect(screen.getByText("answer sentence")).toHaveClass("ielts-highlight");
    expect(screen.getByText("trade routes")).toHaveClass("keyword-highlight");
    expect(screen.getByText("evidence")).toBeInTheDocument();
    expect(screen.getByText("The sentence directly supports the answer.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use selected sentence as answer evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "定位失败" }));

    expect(onSelectAnswerSentence).toHaveBeenCalled();
    expect(onMistakeLabel).toHaveBeenCalledWith("定位失败");
  });
});
