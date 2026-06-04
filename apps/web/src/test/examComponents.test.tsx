import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExamShell } from "../features/exam/ExamShell";
import { ExamPreview } from "../features/exam/ExamPreview";
import { ListeningExamView } from "../features/exam/ListeningExamView";
import { ReadingExamView } from "../features/exam/ReadingExamView";
import { ScoreReport } from "../features/exam/ScoreReport";
import { createQuestionNavItems } from "../features/exam/questionNav";

describe("exam simulation components", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders timer, help, settings, review marker, bottom nav, and submit warning", () => {
    const onSubmit = vi.fn();

    const { container } = render(
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

    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("dialog", { name: "Exam help" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close exam help" }));

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog", { name: "Exam settings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Large interface text" }));
    expect(container.querySelector(".exam-shell")).toHaveClass("exam-shell-large-text");

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

  it("uses elapsed timing for practice sessions without auto-submitting", () => {
    const onSubmit = vi.fn();

    render(
      <ExamShell
        title="Reading Practice"
        durationSeconds={2}
        timerMode="elapsed"
        questions={[{ questionNumber: 1, answered: true, markedForReview: false }]}
        onSubmit={onSubmit}
        submitLabel="Submit practice"
      >
        <p>Practice body</p>
      </ExamShell>
    );

    expect(screen.getByLabelText("Time elapsed")).toHaveTextContent("00:00");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByLabelText("Time elapsed")).toHaveTextContent("00:03");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Submit practice" }));

    expect(onSubmit).toHaveBeenCalledWith({ reason: "manual" });
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

  it("highlights user-selected reading passage text during a local exam", () => {
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "popular because"
    } as Selection);

    render(
      <ReadingExamView
        passageTitle="The History of Tea"
        passageText="Tea became popular because the answer sentence explains the trade."
        highlightedText="answer sentence"
        questions={<p>Questions 1-13</p>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Highlight selected text" }));

    expect(screen.getByText("popular because")).toHaveClass("user-highlight");
    expect(screen.getByText("answer sentence")).toHaveClass("ielts-highlight");
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
    expect(screen.getByText("Estimated band")).toBeInTheDocument();
    expect(screen.getByText("7.0")).toBeInTheDocument();
    expect(screen.getByText(/IELTS band scores are estimates/i)).toBeInTheDocument();
  });

  it("does not render a static sample exam before a local attempt is started", () => {
    render(<ExamPreview />);

    expect(screen.getByLabelText("Mock exam starter")).toBeInTheDocument();
    expect(screen.queryByText("The History of Tea")).not.toBeInTheDocument();
    expect(screen.queryByText("Reading Mock Test")).not.toBeInTheDocument();
  });

  it("renders practice accuracy without an IELTS band estimate", () => {
    render(<ScoreReport mode="practice" subject="reading" rawScore={3} estimatedBand={4} totalQuestions={4} />);

    const report = screen.getByRole("region", { name: "Score report" });

    expect(within(report).getByText("3/4")).toBeInTheDocument();
    expect(within(report).getByText("Practice accuracy")).toBeInTheDocument();
    expect(within(report).getByText("75%")).toBeInTheDocument();
    expect(within(report).queryByText("Estimated band")).not.toBeInTheDocument();
    expect(screen.getByText(/Practice accuracy is based on this local set/i)).toBeInTheDocument();
  });

  it("starts a local reading mock set through the practice API", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-mock-1",
            questions: [
              {
                answerRules: {},
                id: "question-1",
                part: "P1",
                passageId: "passage-1",
                passageText: "Live imported reading text should replace the placeholder passage.",
                passageTitle: "Live Reading P1 High",
                prompt: "What is the key answer?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));

    expect(await screen.findByText("Loaded local reading mock")).toBeInTheDocument();
    expect(screen.getAllByText("Live Reading P1 High").length).toBeGreaterThan(0);
    expect(screen.getByText("Live imported reading text should replace the placeholder passage.")).toBeInTheDocument();
    expect(screen.getByText("What is the key answer?")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/practice/start",
      expect.objectContaining({
        body: JSON.stringify({ mode: "mock", subject: "reading" }),
        method: "POST"
      })
    );
  });

  it("renders a local reading PDF asset when structured passage text is unavailable", async () => {
    vi.useRealTimers();
    const pdfPath = "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/P1-history-of-tea.pdf";
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-pdf-1",
            questions: [
              {
                answerRules: {},
                assetPaths: [pdfPath],
                id: "question-pdf-1",
                part: "P1",
                passageId: "passage-pdf-1",
                passageText: null,
                passageTitle: "PDF Reading P1 High",
                prompt: "What does the PDF passage say?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));

    const pdfPreview = await screen.findByTitle("Local reading PDF");
    expect(pdfPreview).toHaveAttribute("data", `/api/assets/local?path=${encodeURIComponent(pdfPath)}`);
    expect(screen.getByText(pdfPath)).toBeInTheDocument();
  });

  it("keeps local reading mock passages separated by part and switches the active passage", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-multi-passage-1",
            questions: [
              {
                answerRules: {},
                id: "reading-p1-q1",
                part: "P1",
                passageId: "reading-p1",
                passageText: "Reading passage one text.",
                passageTitle: "Reading Passage One",
                prompt: "What is in passage one?",
                questionNumber: 1,
                questionType: "fill_blank"
              },
              {
                answerRules: {},
                id: "reading-p2-q1",
                part: "P2",
                passageId: "reading-p2",
                passageText: "Reading passage two text.",
                passageTitle: "Reading Passage Two",
                prompt: "What is in passage two?",
                questionNumber: 14,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));

    expect(await screen.findByText("Reading passage one text.")).toBeInTheDocument();
    expect(screen.queryByText("Reading passage two text.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "P2 Reading Passage Two" }));

    expect(screen.getByText("Reading passage two text.")).toBeInTheDocument();
    expect(screen.getByText("What is in passage two?")).toBeInTheDocument();
    expect(screen.getByLabelText("Question 14, current")).toBeInTheDocument();
  });

  it("switches local reading mock passages from the bottom question navigator", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-nav-switch-1",
            questions: [
              {
                answerRules: {},
                id: "reading-nav-p1-q1",
                part: "P1",
                passageId: "reading-nav-p1",
                passageText: "Navigator passage one text.",
                passageTitle: "Navigator Passage One",
                prompt: "What is in navigator passage one?",
                questionNumber: 1,
                questionType: "fill_blank"
              },
              {
                answerRules: {},
                id: "reading-nav-p2-q14",
                part: "P2",
                passageId: "reading-nav-p2",
                passageText: "Navigator passage two text.",
                passageTitle: "Navigator Passage Two",
                prompt: "What is in navigator passage two?",
                questionNumber: 14,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));

    expect(await screen.findByText("Navigator passage one text.")).toBeInTheDocument();
    expect(screen.queryByText("Navigator passage two text.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Question 14, unanswered" }));

    expect(screen.getByText("Navigator passage two text.")).toBeInTheDocument();
    expect(screen.getByText("What is in navigator passage two?")).toBeInTheDocument();
    expect(screen.getByLabelText("Question 14, current")).toBeInTheDocument();
  });

  it("starts a local reading practice set without entering mock mode", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-practice-1",
            questions: [
              {
                answerRules: {},
                id: "practice-question-1",
                part: "P2",
                passageId: "practice-passage-1",
                passageTitle: "Focused Reading Practice",
                prompt: "Which detail should be reviewed?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.change(screen.getByLabelText("Practice part"), { target: { value: "P2" } });
    fireEvent.change(screen.getByLabelText("Practice frequency"), { target: { value: "high" } });
    fireEvent.change(screen.getByLabelText("Practice question type"), { target: { value: "single_choice" } });
    fireEvent.change(screen.getByLabelText("Practice mistake label"), { target: { value: "定位失败" } });
    fireEvent.click(screen.getByRole("button", { name: "Start reading practice" }));

    expect(await screen.findByText("Loaded local reading practice")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Loaded local practice set" })).toBeInTheDocument();
    expect(screen.getByLabelText("Time elapsed")).toHaveTextContent("00:00");
    expect(screen.getByRole("button", { name: "Submit practice" })).toBeInTheDocument();
    expect(screen.getAllByText("Focused Reading Practice").length).toBeGreaterThan(0);
    expect(screen.getByText("Which detail should be reviewed?")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/practice/start",
      expect.objectContaining({
        body: JSON.stringify({
          frequencyClass: "high",
          mistakeLabel: "定位失败",
          mode: "practice",
          part: "P2",
          questionType: "single_choice",
          subject: "reading"
        }),
        method: "POST"
      })
    );
  });

  it("saves elapsed practice time with local answers", async () => {
    vi.useRealTimers();
    let nowMs = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-practice-timed",
            questions: [
              {
                answerRules: {},
                id: "practice-timed-question-1",
                part: "P2",
                passageId: "practice-timed-passage-1",
                passageTitle: "Timed Reading Practice",
                prompt: "Which detail should be timed?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      if (path === "/api/practice/attempt-reading-practice-timed/answer") {
        return {
          ok: true,
          json: async () => ({})
        };
      }
      if (path === "/api/practice/attempt-reading-practice-timed/submit") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-practice-timed",
            estimatedBand: 4,
            rawScore: 1,
            submittedAt: "2026-06-04T09:00:00.000Z"
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading practice" }));
    const answer = await screen.findByRole("textbox", { name: "Answer for question practice-timed-question-1" });
    fireEvent.change(answer, { target: { value: "routes" } });
    nowMs = 4_200;
    fireEvent.click(screen.getByRole("button", { name: "Submit local practice" }));

    expect(await screen.findByRole("region", { name: "Score report" })).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("Practice accuracy")).toBeInTheDocument();
    expect(screen.queryByText("Estimated band")).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/practice/attempt-reading-practice-timed/answer",
      expect.objectContaining({
        body: JSON.stringify({
          markedForReview: false,
          questionId: "practice-timed-question-1",
          rawAnswer: "routes",
          timeSpentSeconds: 3
        }),
        method: "POST"
      })
    );
  });

  it("shows local listening audio metadata returned by the practice API", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-listening-mock-1",
            questions: [
              {
                answerRules: {},
                assetPaths: [],
                audioDurationSeconds: 320,
                audioPath: "/Users/musheng/Desktop/IELTS/listening/asset-p1.mp3",
                id: "listening-question-1",
                part: "P1",
                passageId: "listening-passage-1",
                passageText: null,
                passageTitle: "Live Listening P1 High",
                prompt: "Which number did the speaker mention?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start listening mock" }));

    expect(await screen.findByText("Loaded local listening mock")).toBeInTheDocument();
    expect(screen.getByText("/Users/musheng/Desktop/IELTS/listening/asset-p1.mp3")).toBeInTheDocument();
    expect(screen.getByText("Duration: 05:20")).toBeInTheDocument();
  });

  it("enables free playback controls for local listening practice", async () => {
    vi.useRealTimers();
    const audioPath = "/Users/musheng/Desktop/IELTS/listening/practice-p1.mp3";
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-listening-practice-1",
            questions: [
              {
                answerRules: {},
                assetPaths: [],
                audioDurationSeconds: 180,
                audioPath,
                id: "listening-practice-q1",
                part: "P1",
                passageId: "listening-practice-p1",
                passageText: null,
                passageTitle: "Free Listening Practice",
                prompt: "Which number is repeated?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start listening practice" }));

    expect(await screen.findByText("Loaded local listening practice")).toBeInTheDocument();
    const audio = container.querySelector("audio");
    expect(audio).toHaveAttribute("controls");
    expect(audio).toHaveAttribute("src", `/api/assets/local?path=${encodeURIComponent(audioPath)}`);
    expect(screen.getByRole("button", { name: "Pause" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Seek" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Speed" })).not.toBeDisabled();
  });

  it("keeps local listening mock sections separated with their own audio metadata", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-listening-multi-section-1",
            questions: [
              {
                answerRules: {},
                assetPaths: [],
                audioDurationSeconds: 120,
                audioPath: "/Users/musheng/Desktop/IELTS/listening/p1.mp3",
                id: "listening-p1-q1",
                part: "P1",
                passageId: "listening-p1",
                passageText: null,
                passageTitle: "Listening Section One",
                prompt: "What is in section one?",
                questionNumber: 1,
                questionType: "fill_blank"
              },
              {
                answerRules: {},
                assetPaths: [],
                audioDurationSeconds: 240,
                audioPath: "/Users/musheng/Desktop/IELTS/listening/p2.mp3",
                id: "listening-p2-q1",
                part: "P2",
                passageId: "listening-p2",
                passageText: null,
                passageTitle: "Listening Section Two",
                prompt: "What is in section two?",
                questionNumber: 11,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start listening mock" }));

    expect(await screen.findByRole("heading", { name: "Listening Section One" })).toBeInTheDocument();
    const listeningView = screen.getByLabelText("Listening mock view");
    expect(screen.getByText("Duration: 02:00")).toBeInTheDocument();
    expect(within(listeningView).queryByText("What is in section two?")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "P2 Listening Section Two" }));

    expect(screen.getByRole("heading", { name: "Listening Section Two" })).toBeInTheDocument();
    expect(screen.getByText("Duration: 04:00")).toBeInTheDocument();
    expect(within(listeningView).getByText(/What is in section two/)).toBeInTheDocument();
    expect(screen.getByLabelText("Question 11, current")).toBeInTheDocument();
  });

  it("switches local listening mock sections from the bottom question navigator", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-listening-nav-switch-1",
            questions: [
              {
                answerRules: {},
                assetPaths: [],
                audioDurationSeconds: 130,
                audioPath: "/Users/musheng/Desktop/IELTS/listening/nav-p1.mp3",
                id: "listening-nav-p1-q1",
                part: "P1",
                passageId: "listening-nav-p1",
                passageText: null,
                passageTitle: "Navigator Listening One",
                prompt: "What is in listening section one?",
                questionNumber: 1,
                questionType: "fill_blank"
              },
              {
                answerRules: {},
                assetPaths: [],
                audioDurationSeconds: 260,
                audioPath: "/Users/musheng/Desktop/IELTS/listening/nav-p2.mp3",
                id: "listening-nav-p2-q11",
                part: "P2",
                passageId: "listening-nav-p2",
                passageText: null,
                passageTitle: "Navigator Listening Two",
                prompt: "What is in listening section two?",
                questionNumber: 11,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start listening mock" }));

    expect(await screen.findByRole("heading", { name: "Navigator Listening One" })).toBeInTheDocument();
    const listeningView = screen.getByLabelText("Listening mock view");
    expect(screen.getByText("Duration: 02:10")).toBeInTheDocument();
    expect(within(listeningView).queryByText(/listening section two/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Question 11, unanswered" }));

    expect(screen.getByRole("heading", { name: "Navigator Listening Two" })).toBeInTheDocument();
    expect(screen.getByText("Duration: 04:20")).toBeInTheDocument();
    expect(within(listeningView).getByText(/listening section two/)).toBeInTheDocument();
    expect(screen.getByLabelText("Question 11, current")).toBeInTheDocument();
  });

  it("renders a real local audio element while keeping mock controls strict", () => {
    const audioPath = "/Users/musheng/Desktop/IELTS/listening/asset-p1.mp3";
    const { container } = render(
      <ListeningExamView
        mode="mock"
        audioTitle="Section 1 audio"
        audioPath={audioPath}
        audioDurationSeconds={320}
        sections={[{ id: "s1", title: "Section 1", questions: <p>Questions 1-10</p> }]}
        finalReviewSeconds={120}
      />
    );

    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute("src", `/api/assets/local?path=${encodeURIComponent(audioPath)}`);
    expect(audio).toHaveAttribute("preload", "metadata");
    expect(audio).not.toHaveAttribute("controls");
    expect(screen.getByRole("button", { name: "Pause disabled in mock mode" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Seek disabled in mock mode" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Speed disabled in mock mode" })).toBeDisabled();
  });

  it("saves current local mock answers before submitting for an estimated band report", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-mock-2",
            questions: [
              {
                answerRules: {},
                id: "question-2",
                part: "P1",
                passageId: "passage-2",
                passageTitle: "Live Reading Submit Set",
                prompt: "Which word completes the sentence?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      if (path === "/api/practice/attempt-reading-mock-2/answer") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-mock-2",
            id: "answer-1",
            isCorrect: true,
            markedForReview: false,
            normalizedAnswer: "routes",
            questionId: "question-2",
            rawAnswer: "routes",
            timeSpentSeconds: 0
          })
        };
      }
      if (path === "/api/practice/attempt-reading-mock-2/submit") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-mock-2",
            estimatedBand: 4,
            rawScore: 1,
            submittedAt: "2026-06-04T09:00:00.000Z"
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));
    const answer = await screen.findByRole("textbox", { name: "Answer for question question-2" });
    fireEvent.change(answer, { target: { value: "routes" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit local mock" }));

    expect(await screen.findByRole("region", { name: "Score report" })).toBeInTheDocument();
    expect(screen.getByText("1/40")).toBeInTheDocument();
    expect(screen.getByText("4.0")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/practice/attempt-reading-mock-2/answer",
      expect.objectContaining({
        body: JSON.stringify({
          markedForReview: false,
          questionId: "question-2",
          rawAnswer: "routes",
          timeSpentSeconds: 0
        }),
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/practice/attempt-reading-mock-2/submit",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("persists marked-for-review state for local mock questions before submission", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-marked-1",
            questions: [
              {
                answerRules: {},
                id: "question-marked-1",
                part: "P1",
                passageId: "passage-marked-1",
                passageTitle: "Marked Review Set",
                prompt: "Which answer should be checked later?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      if (path === "/api/practice/attempt-reading-marked-1/answer") {
        return {
          ok: true,
          json: async () => ({})
        };
      }
      if (path === "/api/practice/attempt-reading-marked-1/submit") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-marked-1",
            estimatedBand: 4,
            rawScore: 0,
            submittedAt: "2026-06-04T09:00:00.000Z"
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));
    const answer = await screen.findByRole("textbox", { name: "Answer for question question-marked-1" });
    fireEvent.change(answer, { target: { value: "check later" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark question 1 for review" }));

    expect(screen.getByLabelText("Question 1, marked")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Submit test" })[0]);
    expect(screen.getByText("0 unanswered questions and 1 marked question remain.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit anyway" }));

    expect(await screen.findByRole("region", { name: "Score report" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/practice/attempt-reading-marked-1/answer",
      expect.objectContaining({
        body: JSON.stringify({
          markedForReview: true,
          questionId: "question-marked-1",
          rawAnswer: "check later",
          timeSpentSeconds: 0
        }),
        method: "POST"
      })
    );
  });

  it("marks the active local mock question from the exam topbar", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-topbar-mark-1",
            questions: [
              {
                answerRules: {},
                id: "question-topbar-mark-1",
                part: "P1",
                passageId: "passage-topbar-mark-1",
                passageTitle: "Topbar Mark Set",
                prompt: "Which question is marked from the topbar?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));
    expect(await screen.findByLabelText("Question 1, current")).toBeInTheDocument();
    const activeShell = screen.getByLabelText("Reading Local Mock Test");

    fireEvent.click(within(activeShell).getByRole("button", { name: "Mark for review" }));

    expect(screen.getByLabelText("Question 1, marked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmark question 1" })).toBeInTheDocument();
  });

  it("does not submit a local mock when saving current answers fails", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-save-fails",
            questions: [
              {
                answerRules: {},
                id: "question-save-fails",
                part: "P1",
                passageId: "passage-save-fails",
                passageTitle: "Save Failure Set",
                prompt: "Which word completes the sentence?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      if (path === "/api/practice/attempt-reading-save-fails/answer") {
        return {
          ok: false,
          json: async () => ({ message: "save failed" })
        };
      }
      if (path === "/api/practice/attempt-reading-save-fails/submit") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-save-fails",
            estimatedBand: 4,
            rawScore: 1,
            submittedAt: "2026-06-04T09:00:00.000Z"
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));
    const answer = await screen.findByRole("textbox", { name: "Answer for question question-save-fails" });
    fireEvent.change(answer, { target: { value: "routes" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit local mock" }));

    expect(await screen.findByText("Could not submit the local mock attempt.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/practice/attempt-reading-save-fails/submit",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows practice-specific copy when saving current practice answers fails", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-practice-save-fails",
            questions: [
              {
                answerRules: {},
                id: "question-practice-save-fails",
                part: "P1",
                passageId: "passage-practice-save-fails",
                passageTitle: "Practice Save Failure Set",
                prompt: "Which word completes the practice sentence?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      if (path === "/api/practice/attempt-reading-practice-save-fails/answer") {
        return {
          ok: false,
          json: async () => ({ message: "save failed" })
        };
      }
      if (path === "/api/practice/attempt-reading-practice-save-fails/submit") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-practice-save-fails",
            estimatedBand: null,
            rawScore: 0,
            submittedAt: "2026-06-04T09:00:00.000Z"
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading practice" }));
    const answer = await screen.findByRole("textbox", { name: "Answer for question question-practice-save-fails" });
    fireEvent.change(answer, { target: { value: "routes" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit local practice" }));

    expect(await screen.findByText("Could not submit the local practice attempt.")).toBeInTheDocument();
    expect(screen.queryByText("Could not submit the local mock attempt.")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/practice/attempt-reading-practice-save-fails/submit",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("loads detailed review evidence after submitting a local mock", async () => {
    vi.useRealTimers();
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-review-1",
            questions: [
              {
                answerRules: {},
                id: "question-review-1",
                part: "P1",
                passageId: "passage-review-1",
                passageTitle: "Review Evidence Passage",
                prompt: "What was the key route?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      if (path === "/api/practice/attempt-reading-review-1/answer") {
        return {
          ok: true,
          json: async () => ({})
        };
      }
      if (path === "/api/practice/attempt-reading-review-1/submit") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-reading-review-1",
            estimatedBand: 4,
            rawScore: 0,
            submittedAt: "2026-06-04T10:00:00.000Z"
          })
        };
      }
      if (path === "/api/practice/attempt-reading-review-1/review") {
        return {
          ok: true,
          json: async () => ({
            conflicts: [
              {
                id: "conflict-1",
                questionId: "question-review-1",
                remoteCreatedAt: "2026-06-04T10:02:00.000Z",
                remoteDeviceId: "windows-pc",
                remoteIsCorrect: true,
                remoteRawAnswer: "trade routes",
                status: "conflict"
              }
            ],
            id: "attempt-reading-review-1",
            reviewItems: [
              {
                acceptedAnswers: ["trade routes"],
                answerSentence: "Tea moved through early trade routes.",
                explanation: "The evidence sentence names the route directly.",
                isCorrect: false,
                markedForReview: false,
                part: "P1",
                passageTitle: "Review Evidence Passage",
                prompt: "What was the key route?",
                questionId: "question-review-1",
                questionNumber: 1,
                questionType: "fill_blank",
                rawAnswer: "ships",
                synonyms: ["moved through = travelled via"]
              }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExamPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));
    const answer = await screen.findByRole("textbox", { name: "Answer for question question-review-1" });
    fireEvent.change(answer, { target: { value: "ships" } });
    fireEvent.blur(answer);
    fireEvent.click(screen.getByRole("button", { name: "Submit local mock" }));

    expect(await screen.findByRole("region", { name: "Mock review details" })).toBeInTheDocument();
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(screen.getByText("Your answer: ships")).toBeInTheDocument();
    expect(screen.getByText("Accepted: trade routes")).toBeInTheDocument();
    expect(screen.getByText("Tea moved through early trade routes.")).toHaveClass("ielts-highlight");
    expect(screen.getByText("The evidence sentence names the route directly.")).toBeInTheDocument();
    expect(screen.getByText("moved through = travelled via")).toBeInTheDocument();
    expect(screen.getByText("Sync conflict")).toBeInTheDocument();
    expect(screen.getByText("Remote answer from windows-pc: trade routes")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/practice/attempt-reading-review-1/review",
      expect.objectContaining({ method: "GET" })
    );
  });
});
