import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HistoryReportsPreview } from "../features/reports/HistoryReportsPreview";

describe("history and reports preview", () => {
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
    expect(screen.getAllByText("matching")).toHaveLength(2);
    expect(screen.getByText("定位失败")).toBeInTheDocument();
    expect(screen.getByText("Export mock report")).toBeInTheDocument();
  });
});
