import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryReportsPreview } from "../features/reports/HistoryReportsPreview";

describe("history and reports preview", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders history, accuracy analytics, predictions, and recommended practice", () => {
    render(
      <HistoryReportsPreview
        history={[
          {
            durationSeconds: 3600,
            estimatedBand: 7,
            id: "attempt-1",
            mode: "mock",
            rawScore: 31,
            startedAt: "2026-05-30T10:00:00.000Z",
            subject: "listening",
            submittedAt: "2026-05-30T11:00:00.000Z"
          }
        ]}
        analytics={{
          frequencyRows: [],
          mistakeLabels: [{ count: 3, label: "定位失败" }],
          partRows: [
            { accuracy: 0.75, correct: 3, label: "Listening P1", total: 4 },
            { accuracy: 0.5, correct: 2, label: "Reading P2", total: 4 }
          ],
          questionTypeRows: [{ accuracy: 0.4, correct: 2, label: "matching", total: 5 }]
        }}
        dashboard={{
          latestMockScore: "Listening 31/40, Band 7",
          predictedListening: {
            basisAttempts: 3,
            confidence: "medium",
            detail: "Range 6.5-7.5",
            value: "Band 7"
          },
          predictedReading: "6.0-7.0",
          recommendedNextPractice: "Review matching questions",
          weakestQuestionType: "matching"
        }}
      />
    );

    expect(screen.getByRole("region", { name: "History and reports preview" })).toBeInTheDocument();
    expect(screen.getByText("Listening 31/40, Band 7")).toBeInTheDocument();
    expect(screen.getByText("Band 7")).toBeInTheDocument();
    expect(screen.getByText("Range 6.5-7.5")).toBeInTheDocument();
    expect(screen.getByText("Medium confidence - 3 attempts")).toBeInTheDocument();
    expect(screen.getByText(/predicted bands are estimates/i)).toBeInTheDocument();
    expect(screen.getAllByText("matching")).toHaveLength(2);
    expect(screen.getByText("定位失败")).toBeInTheDocument();
    expect(screen.getByText("Export mock report")).toBeInTheDocument();
  });

  it("renders frequency class accuracy as its own analytics group", () => {
    render(
      <HistoryReportsPreview
        history={[]}
        analytics={{
          frequencyRows: [{ accuracy: 1 / 3, correct: 1, label: "High frequency", total: 3 }],
          mistakeLabels: [],
          partRows: [{ accuracy: 0.75, correct: 3, label: "Reading P1", total: 4 }],
          questionTypeRows: [{ accuracy: 0.5, correct: 2, label: "matching", total: 4 }]
        }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Review high-frequency reading",
          weakestQuestionType: "matching"
        }}
      />
    );

    expect(screen.getByText("Frequency accuracy")).toBeInTheDocument();
    expect(screen.getByText("High frequency")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("shows clear fallbacks for blank history attempt metadata", () => {
    render(
      <HistoryReportsPreview
        history={[
          {
            durationSeconds: null,
            estimatedBand: null,
            id: "attempt-blank-history-meta",
            mode: "   ",
            rawScore: null,
            startedAt: "2026-06-04T10:00:00.000Z",
            subject: "   ",
            submittedAt: "   "
          }
        ]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Import a set to begin",
          weakestQuestionType: "No data"
        }}
      />
    );

    expect(screen.getByText("Unknown subject")).toBeInTheDocument();
    expect(screen.getByText("Unknown mode")).toBeInTheDocument();
    expect(screen.getByText("Date unavailable")).toBeInTheDocument();
  });

  it("shows clear fallbacks for blank accuracy and mistake labels", () => {
    render(
      <HistoryReportsPreview
        history={[]}
        analytics={{
          frequencyRows: [{ accuracy: 0.5, correct: 1, label: "   ", total: 2 }],
          mistakeLabels: [{ count: 2, label: "   " }],
          partRows: [{ accuracy: 0.25, correct: 1, label: "   ", total: 4 }],
          questionTypeRows: [{ accuracy: 0.75, correct: 3, label: "   ", total: 4 }]
        }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Import a set to begin",
          weakestQuestionType: "   "
        }}
      />
    );

    expect(screen.getAllByText("Unknown accuracy group")).toHaveLength(3);
    expect(screen.getByText("Unlabeled mistake")).toBeInTheDocument();
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("exports local report files through the reports API", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        mistakesCsv: "/Users/musheng/Desktop/IELTS/data/exports/mistakes-2026-06-04.csv",
        mockCsv: "/Users/musheng/Desktop/IELTS/data/exports/mock-report-2026-06-04.csv",
        mockJson: "/Users/musheng/Desktop/IELTS/data/exports/mock-report-2026-06-04.json"
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <HistoryReportsPreview
        history={[]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Import a set to begin",
          weakestQuestionType: "No data"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mock report" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Reports exported");
    expect(screen.getByText("/Users/musheng/Desktop/IELTS/data/exports/mock-report-2026-06-04.json")).toBeInTheDocument();
    expect(screen.getByText("/Users/musheng/Desktop/IELTS/data/exports/mock-report-2026-06-04.csv")).toBeInTheDocument();
    expect(screen.getByText("/Users/musheng/Desktop/IELTS/data/exports/mistakes-2026-06-04.csv")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/reports/export", expect.objectContaining({ method: "POST" }));
  });

  it("copies exported report paths to the clipboard for local file lookup", async () => {
    const exportedFiles = {
      mistakesCsv: "/Users/musheng/Desktop/IELTS/data/exports/mistakes-2026-06-04.csv",
      mockCsv: "/Users/musheng/Desktop/IELTS/data/exports/mock-report-2026-06-04.csv",
      mockJson: "/Users/musheng/Desktop/IELTS/data/exports/mock-report-2026-06-04.json"
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => exportedFiles
    }));
    const writeTextMock = vi.fn(async () => undefined);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    render(
      <HistoryReportsPreview
        history={[]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Import a set to begin",
          weakestQuestionType: "No data"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mock report" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reports exported");

    fireEvent.click(screen.getByRole("button", { name: "Copy report paths" }));

    expect(writeTextMock).toHaveBeenCalledWith([exportedFiles.mockJson, exportedFiles.mockCsv, exportedFiles.mistakesCsv].join("\n"));
    expect(await screen.findByText("Report paths copied.")).toBeInTheDocument();
  });

  it("shows clear fallbacks when exported report paths are blank", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        mistakesCsv: "   ",
        mockCsv: "",
        mockJson: "   "
      })
    }));
    const writeTextMock = vi.fn(async () => undefined);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    render(
      <HistoryReportsPreview
        history={[]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Import a set to begin",
          weakestQuestionType: "No data"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mock report" }));

    expect(await screen.findByText("Mock JSON path unavailable")).toBeInTheDocument();
    expect(screen.getByText("Mock CSV path unavailable")).toBeInTheDocument();
    expect(screen.getByText("Mistakes CSV path unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy report paths" }));

    expect(writeTextMock).toHaveBeenCalledWith(
      ["Mock JSON path unavailable", "Mock CSV path unavailable", "Mistakes CSV path unavailable"].join("\n")
    );
  });

  it("clears stale exported report paths when a later export fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mistakesCsv: "/Users/musheng/Desktop/IELTS/data/exports/mistakes-old.csv",
          mockCsv: "/Users/musheng/Desktop/IELTS/data/exports/mock-report-old.csv",
          mockJson: "/Users/musheng/Desktop/IELTS/data/exports/mock-report-old.json"
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <HistoryReportsPreview
        history={[]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Import a set to begin",
          weakestQuestionType: "No data"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export mock report" }));

    expect(await screen.findByText("/Users/musheng/Desktop/IELTS/data/exports/mock-report-old.json")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export mock report" }));

    expect(await screen.findByText("Could not export local reports.")).toBeInTheDocument();
    expect(screen.queryByText("/Users/musheng/Desktop/IELTS/data/exports/mock-report-old.json")).not.toBeInTheDocument();
    expect(screen.queryByText("Reports exported")).not.toBeInTheDocument();
  });

  it("reopens a completed attempt from history and renders detailed review evidence", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/attempt-1/review") {
        return {
          ok: true,
          json: async () => ({
            id: "attempt-1",
            reviewItems: [
              {
                acceptedAnswers: ["trade routes"],
                answerSentence: "the answer sentence",
                explanation: "The passage says the answer directly in this sentence.",
                isCorrect: false,
                part: "P1",
                passageTitle: "Tea History",
                prompt: "Tea moved through early trade ____.",
                questionId: "q-1",
                questionNumber: 1,
                rawAnswer: "roads",
                synonyms: ["routes = roads in context only when configured"]
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

    render(
      <HistoryReportsPreview
        history={[
          {
            durationSeconds: 3600,
            estimatedBand: 7,
            id: "attempt-1",
            mode: "mock",
            rawScore: 31,
            startedAt: "2026-05-30T10:00:00.000Z",
            subject: "reading",
            submittedAt: "2026-05-30T11:00:00.000Z"
          }
        ]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "Reading 31/40, Band 7",
          predictedListening: "Need history",
          predictedReading: "6.5-7.5",
          recommendedNextPractice: "Review fill blank questions",
          weakestQuestionType: "fill_blank"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Review attempt attempt-1" }));

    const reviewRegion = await screen.findByRole("region", { name: "History review details" });
    expect(reviewRegion).toBeInTheDocument();
    expect(reviewRegion).toHaveTextContent("Tea moved through early trade ____.");
    expect(screen.getByText("Your answer: roads")).toBeInTheDocument();
    expect(screen.getByText("Accepted: trade routes")).toBeInTheDocument();
    expect(screen.getByText("the answer sentence")).toHaveClass("ielts-highlight");
    expect(screen.getByText("The passage says the answer directly in this sentence.")).toBeInTheDocument();
    expect(screen.getByText("routes = roads in context only when configured")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/practice/attempt-1/review", expect.objectContaining({ method: "GET" }));
  });

  it("clears stale history review details when loading another attempt fails", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/attempt-1/review") {
        return {
          ok: true,
          json: async () => ({
            id: "attempt-1",
            reviewItems: [
              {
                acceptedAnswers: ["trade routes"],
                answerSentence: "the answer sentence",
                explanation: "The passage says the answer directly in this sentence.",
                isCorrect: false,
                part: "P1",
                passageTitle: "Tea History",
                prompt: "Tea moved through early trade ____.",
                questionId: "q-1",
                questionNumber: 1,
                rawAnswer: "roads",
                synonyms: []
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

    render(
      <HistoryReportsPreview
        history={[
          {
            durationSeconds: 3600,
            estimatedBand: 7,
            id: "attempt-1",
            mode: "mock",
            rawScore: 31,
            startedAt: "2026-05-30T10:00:00.000Z",
            subject: "reading",
            submittedAt: "2026-05-30T11:00:00.000Z"
          },
          {
            durationSeconds: 3000,
            estimatedBand: 6,
            id: "attempt-stale",
            mode: "mock",
            rawScore: 24,
            startedAt: "2026-06-01T10:00:00.000Z",
            subject: "listening",
            submittedAt: "2026-06-01T10:50:00.000Z"
          }
        ]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "Reading 31/40, Band 7",
          predictedListening: "Need history",
          predictedReading: "6.5-7.5",
          recommendedNextPractice: "Review fill blank questions",
          weakestQuestionType: "fill_blank"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Review attempt attempt-1" }));
    expect(await screen.findByRole("region", { name: "History review details" })).toHaveTextContent(
      "Tea moved through early trade ____."
    );

    fireEvent.click(screen.getByRole("button", { name: "Review attempt attempt-stale" }));

    expect(await screen.findByText("Could not load this attempt review.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "History review details" })).not.toBeInTheDocument();
  });

  it("shows saved sync conflicts when reopening a history review", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/attempt-conflict/review") {
        return {
          ok: true,
          json: async () => ({
            conflicts: [
              {
                id: "conflict-1",
                questionId: "q-conflict",
                remoteCreatedAt: "2026-06-04T11:05:00.000Z",
                remoteDeviceId: "   ",
                remoteIsCorrect: true,
                remoteRawAnswer: "   ",
                status: "conflict"
              }
            ],
            id: "attempt-conflict",
            reviewItems: [
              {
                acceptedAnswers: ["central station"],
                answerSentence: "The route ended at central station.",
                explanation: "The answer sentence gives the station name.",
                isCorrect: false,
                part: "P2",
                passageTitle: "Transport",
                prompt: "Where did the route end?",
                questionId: "q-conflict",
                questionNumber: 12,
                rawAnswer: "city station",
                synonyms: []
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

    render(
      <HistoryReportsPreview
        history={[
          {
            durationSeconds: 2400,
            estimatedBand: 6.5,
            id: "attempt-conflict",
            mode: "mock",
            rawScore: 28,
            startedAt: "2026-06-04T10:00:00.000Z",
            subject: "listening",
            submittedAt: "2026-06-04T10:40:00.000Z"
          }
        ]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "Listening 28/40, Band 6.5",
          predictedListening: "6.0-7.0",
          predictedReading: "Need history",
          recommendedNextPractice: "Review listening P2",
          weakestQuestionType: "short_answer"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Review attempt attempt-conflict" }));

    expect(await screen.findByRole("region", { name: "History review details" })).toBeInTheDocument();
    expect(screen.getByText("Sync conflict")).toBeInTheDocument();
    expect(screen.getByText("Remote answer from Unknown device: No answer")).toBeInTheDocument();
  });

  it("shows empty states for missing history review explanations and synonym notes", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/attempt-missing-evidence/review") {
        return {
          ok: true,
          json: async () => ({
            id: "attempt-missing-evidence",
            reviewItems: [
              {
                acceptedAnswers: ["central station"],
                answerSentence: "The route ended at central station.",
                explanation: "   ",
                isCorrect: false,
                part: "P2",
                passageTitle: "Transport",
                prompt: "Where did the route end?",
                questionId: "q-missing-evidence",
                questionNumber: 12,
                rawAnswer: "city station",
                synonyms: ["   ", ""]
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

    render(
      <HistoryReportsPreview
        history={[
          {
            durationSeconds: 2400,
            estimatedBand: 6.5,
            id: "attempt-missing-evidence",
            mode: "mock",
            rawScore: 28,
            startedAt: "2026-06-04T10:00:00.000Z",
            subject: "listening",
            submittedAt: "2026-06-04T10:40:00.000Z"
          }
        ]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "Listening 28/40, Band 6.5",
          predictedListening: "6.0-7.0",
          predictedReading: "Need history",
          recommendedNextPractice: "Review listening P2",
          weakestQuestionType: "short_answer"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Review attempt attempt-missing-evidence" }));

    const reviewRegion = await screen.findByRole("region", { name: "History review details" });
    expect(reviewRegion).toBeInTheDocument();
    expect(screen.getByText("No explanation recorded for this question.")).toBeInTheDocument();
    expect(screen.getByText("No synonym notes recorded for this question.")).toBeInTheDocument();
    expect(reviewRegion.querySelectorAll(".mock-review-synonyms li")).toHaveLength(0);
  });

  it("shows empty states for blank history review answers and answer sentences", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/practice/attempt-blank-answers/review") {
        return {
          ok: true,
          json: async () => ({
            id: "attempt-blank-answers",
            reviewItems: [
              {
                acceptedAnswers: ["   ", ""],
                answerSentence: "   ",
                explanation: "Question was imported without answer evidence.",
                isAnswered: false,
                isCorrect: false,
                part: "P2",
                passageTitle: "Transport",
                prompt: "   ",
                questionId: "q-blank-answers",
                questionNumber: 12,
                rawAnswer: "   ",
                synonyms: ["station = stop"]
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

    render(
      <HistoryReportsPreview
        history={[
          {
            durationSeconds: 2400,
            estimatedBand: 6.5,
            id: "attempt-blank-answers",
            mode: "mock",
            rawScore: 28,
            startedAt: "2026-06-04T10:00:00.000Z",
            subject: "listening",
            submittedAt: "2026-06-04T10:40:00.000Z"
          }
        ]}
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "Listening 28/40, Band 6.5",
          predictedListening: "6.0-7.0",
          predictedReading: "Need history",
          recommendedNextPractice: "Review listening P2",
          weakestQuestionType: "short_answer"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Review attempt attempt-blank-answers" }));

    const reviewRegion = await screen.findByRole("region", { name: "History review details" });
    expect(reviewRegion).toBeInTheDocument();
    expect(screen.getByText("Unanswered")).toBeInTheDocument();
    expect(screen.getByText("12 Review question")).toBeInTheDocument();
    expect(screen.getByText("Your answer: No answer")).toBeInTheDocument();
    expect(screen.getByText("Accepted: Not configured")).toBeInTheDocument();
    expect(screen.getByText("No answer sentence recorded for this question.")).toBeInTheDocument();
  });
});
