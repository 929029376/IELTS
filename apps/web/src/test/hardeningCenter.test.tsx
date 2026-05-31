import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HardeningCenter } from "../features/hardening/HardeningCenter";
import { HistoryReportsPreview } from "../features/reports/HistoryReportsPreview";

describe("V1 hardening center", () => {
  it("renders import failure, question-bank completeness, backup reminder, and empty states", () => {
    render(
      <HardeningCenter
        status={{
          backupReminder: {
            latestBackupAt: null,
            reason: "You have 12 submitted attempts and no recent backup.",
            shouldRemind: true,
            submittedAttemptCount: 12
          },
          importFailures: {
            byStatus: { failed: 1, needs_review: 1 },
            sources: [
              {
                assetCount: 1,
                createdAt: "2026-06-01T00:00:00.000Z",
                id: "source-1",
                importStatus: "failed",
                originalPath: "reading/broken.pdf",
                sourceType: "reading_pdf",
                version: 1
              }
            ],
            totalUnresolved: 2
          },
          questionBankCompleteness: {
            issueCounts: {
              missingAnswerKey: 1,
              missingAudio: 1,
              missingExplanation: 1,
              missingFrequencyEntry: 1,
              missingListeningCues: 1,
              missingTranscript: 1
            },
            passages: [
              {
                frequencyClass: "unknown",
                id: "passage-1",
                issueLabels: ["missing answer key", "missing audio", "missing frequency entry"],
                part: "P1",
                questionCount: 2,
                sourceStatus: "needs_review",
                subject: "listening",
                title: "Airport Enquiry"
              }
            ],
            totalPassages: 1
          }
        }}
      />
    );

    expect(screen.getByRole("region", { name: "V1 hardening center" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Import failure report" })).toHaveTextContent(
      "reading/broken.pdf"
    );
    expect(screen.getByRole("region", { name: "Question-bank completeness" })).toHaveTextContent(
      "Airport Enquiry"
    );
    expect(screen.getByRole("region", { name: "Backup reminder" })).toHaveTextContent("12 submitted attempts");
  });

  it("shows empty states for a fresh local installation", () => {
    render(
      <HardeningCenter
        status={{
          backupReminder: {
            latestBackupAt: null,
            reason: null,
            shouldRemind: false,
            submittedAttemptCount: 0
          },
          importFailures: {
            byStatus: {},
            sources: [],
            totalUnresolved: 0
          },
          questionBankCompleteness: {
            issueCounts: {
              missingAnswerKey: 0,
              missingAudio: 0,
              missingExplanation: 0,
              missingFrequencyEntry: 0,
              missingListeningCues: 0,
              missingTranscript: 0
            },
            passages: [],
            totalPassages: 0
          }
        }}
      />
    );

    expect(screen.getByText("No import issues yet")).toBeInTheDocument();
    expect(screen.getByText("No question bank data imported yet")).toBeInTheDocument();
  });

  it("shows no-history empty states in reports", () => {
    render(
      <HistoryReportsPreview
        analytics={{ mistakeLabels: [], partRows: [], questionTypeRows: [] }}
        dashboard={{
          latestMockScore: "No mock submitted",
          predictedListening: "Need history",
          predictedReading: "Need history",
          recommendedNextPractice: "Import a set to begin",
          weakestQuestionType: "No data"
        }}
        history={[]}
      />
    );

    expect(screen.getByText("No completed attempts yet")).toBeInTheDocument();
    expect(screen.getByText("Accuracy appears after submitted answers")).toBeInTheDocument();
    expect(screen.getByText("Mistake labels appear after review")).toBeInTheDocument();
  });
});
