import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CueEditor } from "../features/intensive/CueEditor";
import { IntensiveListeningPlayer } from "../features/intensive/IntensiveListeningPlayer";
import { CloseReadingView } from "../features/intensive/CloseReadingView";
import { IntensivePracticePreview } from "../features/intensive/IntensivePracticePreview";

describe("intensive study components", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses segment repeat when cues exist", () => {
    render(
      <IntensiveListeningPlayer
        audioTitle="Booking call"
        audioPath={null}
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

  it("plays real local intensive audio and loops the selected sentence cue", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const audioPath = "/Users/musheng/Desktop/IELTS/listening/intensive-p1.mp3";
    render(
      <IntensiveListeningPlayer
        audioTitle="Booking call"
        audioPath={audioPath}
        cues={[
          {
            id: "cue-1",
            startSeconds: 1.5,
            endSeconds: 3.5,
            label: "Sentence 1",
            transcript: "Green Park"
          }
        ]}
        onDictationSubmit={() => undefined}
      />
    );

    const audio = screen.getByLabelText("Intensive listening audio") as HTMLAudioElement;
    expect(audio).toHaveAttribute("src", `/api/assets/local?path=${encodeURIComponent(audioPath)}`);

    fireEvent.click(screen.getByRole("button", { name: "Repeat Sentence 1" }));

    expect(audio.currentTime).toBe(1.5);
    expect(play).toHaveBeenCalledTimes(1);

    audio.currentTime = 3.6;
    fireEvent.timeUpdate(audio);

    expect(audio.currentTime).toBe(1.5);
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

  it("shows local empty states instead of sample intensive material when no passages are available", () => {
    render(<IntensivePracticePreview preview={{ listening: null, reading: null }} />);

    expect(screen.getByText("No local listening passage")).toBeInTheDocument();
    expect(screen.getByText("No local reading passage")).toBeInTheDocument();
    expect(screen.queryByText("Listening Part 1 Review")).not.toBeInTheDocument();
    expect(screen.queryByText("The booking is under Green Park.")).not.toBeInTheDocument();
    expect(screen.queryByText("Tea travelled along trade routes.")).not.toBeInTheDocument();
  });

  it("falls back to A-B repeat and cue prompt when no cues exist", () => {
    render(
      <IntensiveListeningPlayer
        audioTitle="Booking call"
        audioPath={null}
        cues={[]}
        onDictationSubmit={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Set A point" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set B point" })).toBeInTheDocument();
    expect(screen.getByText("No sentence cues yet. Use A-B repeat or create a cue.")).toBeInTheDocument();
  });

  it("shows the active A-B repeat range while looping custom listening segments", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(
      <IntensiveListeningPlayer
        audioTitle="Booking call"
        audioPath="/Users/musheng/Desktop/IELTS/listening/intensive-p1.mp3"
        cues={[]}
        onDictationSubmit={() => undefined}
      />
    );

    const audio = screen.getByLabelText("Intensive listening audio") as HTMLAudioElement;

    audio.currentTime = 12.4;
    fireEvent.click(screen.getByRole("button", { name: "Set A point" }));
    expect(screen.getByText("A point set at 12.4s")).toBeInTheDocument();

    audio.currentTime = 16.8;
    fireEvent.click(screen.getByRole("button", { name: "Set B point" }));
    expect(screen.getByText("A-B loop: 12.4s to 16.8s")).toBeInTheDocument();

    audio.currentTime = 16.9;
    fireEvent.timeUpdate(audio);

    expect(audio.currentTime).toBe(12.4);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("submits dictation text", () => {
    const onDictationSubmit = vi.fn();
    render(
      <IntensiveListeningPlayer
        audioTitle="Booking call"
        audioPath={null}
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

  it("saves live listening cues and dictation attempts through the local study API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          endSeconds: 3.5,
          id: "cue-live-created",
          label: "Sentence 1",
          passageId: "passage-live-1",
          startSeconds: 1.5,
          transcript: "Green Park"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cueId: "cue-live-created",
          id: "dictation-live-1",
          isCorrect: true,
          normalizedText: "green park",
          userText: "green park"
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntensivePracticePreview
        preview={{
          listening: {
            audioTitle: "Live cue review",
            cues: [],
            passageId: "passage-live-1"
          },
          reading: null
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("Cue label"), { target: { value: "Sentence 1" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "3.5" } });
    fireEvent.change(screen.getByLabelText("Transcript"), { target: { value: "Green Park" } });
    fireEvent.click(screen.getByRole("button", { name: "Save cue" }));

    expect(await screen.findByText("Cue saved for sentence repeat.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Repeat Sentence 1" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/study/listening-cues",
      expect.objectContaining({
        body: JSON.stringify({
          endSeconds: 3.5,
          label: "Sentence 1",
          passageId: "passage-live-1",
          startSeconds: 1.5,
          transcript: "Green Park"
        }),
        method: "POST"
      })
    );

    fireEvent.change(screen.getByLabelText("Dictation input"), { target: { value: "green park" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit dictation" }));

    expect(await screen.findByText("Dictation correct.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/study/dictation-attempts",
      expect.objectContaining({
        body: JSON.stringify({ cueId: "cue-live-created", userText: "green park" }),
        method: "POST"
      })
    );
  });

  it("updates an existing listening cue through the local study API", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        endSeconds: 5.8,
        id: "cue-live-1",
        label: "Corrected Sentence 1",
        passageId: "passage-live-1",
        startSeconds: 1.6,
        transcript: "Green Park corrected"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntensivePracticePreview
        preview={{
          listening: {
            audioTitle: "Live cue review",
            cues: [
              {
                endSeconds: 4.2,
                id: "cue-live-1",
                label: "Sentence 1",
                startSeconds: 1.2,
                transcript: "Green Park"
              }
            ],
            passageId: "passage-live-1"
          },
          reading: null
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Sentence 1" }));
    expect(screen.getByLabelText("Cue label")).toHaveValue("Sentence 1");
    expect(screen.getByLabelText("Start time")).toHaveValue("1.2");
    expect(screen.getByLabelText("End time")).toHaveValue("4.2");
    expect(screen.getByLabelText("Transcript")).toHaveValue("Green Park");

    fireEvent.change(screen.getByLabelText("Cue label"), { target: { value: "Corrected Sentence 1" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "1.6" } });
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "5.8" } });
    fireEvent.change(screen.getByLabelText("Transcript"), { target: { value: "Green Park corrected" } });
    fireEvent.click(screen.getByRole("button", { name: "Update cue" }));

    expect(await screen.findByText("Cue updated for sentence repeat.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Repeat Corrected Sentence 1" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/study/listening-cues/cue-live-1",
      expect.objectContaining({
        body: JSON.stringify({
          endSeconds: 5.8,
          label: "Corrected Sentence 1",
          startSeconds: 1.6,
          transcript: "Green Park corrected"
        }),
        method: "PUT"
      })
    );
  });

  it("saves close-reading mistake labels through the local study API", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "mistake-label-1",
        label: "定位失败"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <IntensivePracticePreview
        preview={{
          listening: null,
          reading: {
            answerSentence: "answer sentence",
            attemptAnswerId: "attempt-answer-1",
            explanation: "The sentence directly supports the answer.",
            keywords: ["trade routes"],
            passageText: "Tea travelled along trade routes. The answer sentence identifies the key evidence.",
            passageTitle: "Reading intensive review",
            questionPrompt: "Question 1: Choose the best evidence.",
            synonyms: ["evidence", "proof"]
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "定位失败" }));

    expect(await screen.findByText("Mistake label saved: 定位失败.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/study/mistake-labels",
      expect.objectContaining({
        body: JSON.stringify({ attemptAnswerId: "attempt-answer-1", label: "定位失败" }),
        method: "POST"
      })
    );
  });

  it("saves a selected close-reading answer sentence through the local study API", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answerKeyId: "answer-key-1",
        answerSentence: "The selected sentence proves the answer."
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "The selected sentence proves the answer."
    } as Selection);

    render(
      <IntensivePracticePreview
        preview={{
          listening: null,
          reading: {
            answerKeyId: "answer-key-1",
            answerSentence: null,
            attemptAnswerId: null,
            explanation: "Select the sentence that proves the answer.",
            keywords: [],
            passageText: "The first sentence is a distractor. The selected sentence proves the answer.",
            passageTitle: "Reading intensive review",
            questionPrompt: "Question 1: Select the evidence.",
            synonyms: []
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Use selected sentence as answer evidence" }));

    expect(await screen.findByText("Answer evidence saved.")).toBeInTheDocument();
    expect(screen.getByText("The selected sentence proves the answer.")).toHaveClass("ielts-highlight");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/study/answer-sentence",
      expect.objectContaining({
        body: JSON.stringify({
          answerKeyId: "answer-key-1",
          answerSentence: "The selected sentence proves the answer."
        }),
        method: "POST"
      })
    );
  });

  it("renders close reading evidence, manual answer sentence selection, and mistake labels", () => {
    const onSelectAnswerSentence = vi.fn();
    const onMistakeLabel = vi.fn();

    render(
      <CloseReadingView
        passageText="Tea travelled along trade routes. The answer sentence identifies trade routes as the key evidence for early tea."
        answerSentence="answer sentence"
        keywords={["trade routes", "early tea"]}
        synonyms={["evidence", "proof"]}
        explanation="The sentence directly supports the answer."
        question={<p>Question 1</p>}
        isWrongAnswer
        onSelectAnswerSentence={onSelectAnswerSentence}
        onMistakeLabel={onMistakeLabel}
      />
    );

    expect(screen.getByText("answer sentence")).toHaveClass("ielts-highlight");
    expect(screen.getAllByText("trade routes")).toHaveLength(2);
    expect(screen.getAllByText("trade routes")[0]).toHaveClass("keyword-highlight");
    expect(screen.getAllByText("trade routes")[1]).toHaveClass("keyword-highlight");
    expect(screen.getByText("early tea")).toHaveClass("keyword-highlight");
    expect(screen.getByText("evidence")).toBeInTheDocument();
    expect(screen.getByText("The sentence directly supports the answer.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use selected sentence as answer evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "定位失败" }));

    expect(onSelectAnswerSentence).toHaveBeenCalled();
    expect(onMistakeLabel).toHaveBeenCalledWith("定位失败");
  });

  it("highlights answer evidence and keywords when imported passage casing differs", () => {
    render(
      <CloseReadingView
        passageText="The Answer Sentence identifies Trade Routes as the key evidence."
        answerSentence="answer sentence"
        keywords={["trade routes"]}
        synonyms={[]}
        explanation="The sentence directly supports the answer."
        question={<p>Question 1</p>}
        isWrongAnswer={false}
        onSelectAnswerSentence={() => undefined}
        onMistakeLabel={() => undefined}
      />
    );

    expect(screen.getByText("Answer Sentence")).toHaveClass("ielts-highlight");
    expect(screen.getByText("Trade Routes")).toHaveClass("keyword-highlight");
  });

  it("highlights answer evidence and keywords when imported passage whitespace differs", () => {
    render(
      <CloseReadingView
        passageText={"The answer\nsentence identifies trade   routes as the key evidence."}
        answerSentence="answer sentence"
        keywords={["trade routes"]}
        synonyms={[]}
        explanation="The sentence directly supports the answer."
        question={<p>Question 1</p>}
        isWrongAnswer={false}
        onSelectAnswerSentence={() => undefined}
        onMistakeLabel={() => undefined}
      />
    );

    expect(
      screen.getByText((_content, element) => element?.tagName === "MARK" && element.textContent === "answer\nsentence")
    ).toHaveClass("ielts-highlight");
    expect(
      screen.getByText((_content, element) => element?.tagName === "MARK" && element.textContent === "trade   routes")
    ).toHaveClass("keyword-highlight");
  });
});
