import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HardeningCenter } from "../features/hardening/HardeningCenter";
import { HistoryReportsPreview } from "../features/reports/HistoryReportsPreview";

describe("V1 hardening center", () => {
  afterEach(() => {
    cleanup();
  });

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
              missingAnswerSentence: 1,
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
                issueLabels: [
                  "missing answer key",
                  "missing answer sentence",
                  "missing audio",
                  "missing frequency entry"
                ],
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
    expect(screen.getByRole("region", { name: "Question-bank completeness" })).toHaveTextContent(
      "Answer sentence"
    );
    expect(screen.getByRole("region", { name: "Question-bank completeness" })).toHaveTextContent(
      "missing answer sentence"
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
              missingAnswerSentence: 0,
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

  it("shows readable fallbacks for blank hardening source paths and passage titles", () => {
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
            byStatus: { needs_review: 1 },
            sources: [
              {
                assetCount: 0,
                createdAt: "2026-06-04T00:00:00.000Z",
                id: "blank-source",
                importStatus: "needs_review",
                originalPath: "   ",
                sourceType: "reading_pdf",
                version: 1
              }
            ],
            totalUnresolved: 1
          },
          questionBankCompleteness: {
            issueCounts: {
              missingAnswerKey: 1,
              missingAnswerSentence: 0,
              missingAudio: 0,
              missingExplanation: 0,
              missingFrequencyEntry: 1,
              missingListeningCues: 0,
              missingTranscript: 0
            },
            passages: [
              {
                frequencyClass: "unknown",
                id: "blank-passage",
                issueLabels: ["missing answer key", "missing frequency entry"],
                part: "P1",
                questionCount: 0,
                sourceStatus: "needs_review",
                subject: "reading",
                title: "   "
              }
            ],
            totalPassages: 1
          }
        }}
      />
    );

    expect(screen.getByText("Unknown source path")).toBeInTheDocument();
    expect(screen.getByText("Untitled passage")).toBeInTheDocument();
    expect(screen.queryAllByText("   ")).toHaveLength(0);
  });

  it("shows no-history empty states in reports", () => {
    render(
      <HistoryReportsPreview
        analytics={{ frequencyRows: [], mistakeLabels: [], partRows: [], questionTypeRows: [] }}
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
