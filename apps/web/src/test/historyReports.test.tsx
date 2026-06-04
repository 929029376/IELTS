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
          mistakeLabels: [{ count: 3, label: "定位失败" }],
          partRows: [
            { accuracy: 0.75, correct: 3, label: "Listening P1", total: 4 },
            { accuracy: 0.5, correct: 2, label: "Reading P2", total: 4 }
          ],
          questionTypeRows: [{ accuracy: 0.4, correct: 2, label: "matching", total: 5 }]
        }}
        dashboard={{
          latestMockScore: "Listening 31/40, Band 7",
          predictedListening: "6.5-7.5",
          predictedReading: "6.0-7.0",
          recommendedNextPractice: "Review matching questions",
          weakestQuestionType: "matching"
        }}
      />
    );

    expect(screen.getByRole("region", { name: "History and reports preview" })).toBeInTheDocument();
    expect(screen.getByText("Listening 31/40, Band 7")).toBeInTheDocument();
    expect(screen.getByText("6.5-7.5")).toBeInTheDocument();
    expect(screen.getByText(/predicted bands are estimates/i)).toBeInTheDocument();
    expect(screen.getAllByText("matching")).toHaveLength(2);
    expect(screen.getByText("定位失败")).toBeInTheDocument();
    expect(screen.getByText("Export mock report")).toBeInTheDocument();
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
        analytics={{ mistakeLabels: [], partRows: [], questionTypeRows: [] }}
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
});
