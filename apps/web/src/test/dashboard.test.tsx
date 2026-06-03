import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";

describe("dashboard shell", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the local IELTS app shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "IELTS Local Practice" })).toBeInTheDocument();
    expect(screen.getByText("Mock Exam Center")).toBeInTheDocument();
    expect(screen.getByText("Intensive Practice Center")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Intensive practice preview" })).toBeInTheDocument();
  });

  it("loads reports and hardening status from the local API instead of sample dashboard data", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/reports/history") {
        return {
          ok: true,
          json: async () => [
            {
              durationSeconds: 4200,
              estimatedBand: 8,
              id: "attempt-live-1",
              mode: "mock",
              rawScore: 36,
              startedAt: "2026-06-03T08:00:00.000Z",
              subject: "reading",
              submittedAt: "2026-06-03T09:10:00.000Z"
            }
          ]
        };
      }
      if (url === "/api/reports/analytics") {
        return {
          ok: true,
          json: async () => ({
            byFrequencyClass: { high: { accuracy: 0.9, correct: 9, total: 10 } },
            byPart: { reading: { P1: { accuracy: 0.9, correct: 9, total: 10 } } },
            byQuestionType: { "summary completion": { accuracy: 0.6, correct: 3, total: 5 } },
            mistakeLabels: [{ count: 2, label: "paragraph matching" }]
          })
        };
      }
      if (url === "/api/reports/dashboard") {
        return {
          ok: true,
          json: async () => ({
            latestMockScore: {
              durationSeconds: 4200,
              estimatedBand: 8,
              id: "attempt-live-1",
              mode: "mock",
              rawScore: 36,
              startedAt: "2026-06-03T08:00:00.000Z",
              subject: "reading",
              submittedAt: "2026-06-03T09:10:00.000Z"
            },
            predictedListening: {
              basisAttempts: 0,
              confidence: "low",
              predictedBand: null,
              range: null,
              subject: "listening"
            },
            predictedReading: {
              basisAttempts: 2,
              confidence: "medium",
              predictedBand: 8,
              range: { max: 8.5, min: 7.5 },
              subject: "reading"
            },
            recommendedNextPractice: "Review summary completion",
            weakestQuestionType: "summary completion"
          })
        };
      }
      if (url === "/api/hardening/status") {
        return {
          ok: true,
          json: async () => ({
            backupReminder: {
              latestBackupAt: "2026-06-03T00:00:00.000Z",
              reason: null,
              shouldRemind: false,
              submittedAttemptCount: 1
            },
            importFailures: {
              byStatus: { needs_review: 1 },
              sources: [
                {
                  assetCount: 3,
                  createdAt: "2026-06-03T00:00:00.000Z",
                  id: "source-live-1",
                  importStatus: "needs_review",
                  originalPath: "live/import.zip",
                  sourceType: "listening_zip",
                  version: 1
                }
              ],
              totalUnresolved: 1
            },
            questionBankCompleteness: {
              issueCounts: {
                missingAnswerKey: 1,
                missingAudio: 0,
                missingExplanation: 1,
                missingFrequencyEntry: 0,
                missingListeningCues: 1,
                missingTranscript: 1
              },
              passages: [
                {
                  frequencyClass: "high",
                  id: "passage-live-1",
                  issueLabels: ["missing answer key"],
                  part: "P1",
                  questionCount: 10,
                  sourceStatus: "needs_review",
                  subject: "listening",
                  title: "Live Airport Enquiry"
                }
              ],
              totalPassages: 1
            }
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/reports/history");
      expect(fetchMock).toHaveBeenCalledWith("/api/reports/analytics");
      expect(fetchMock).toHaveBeenCalledWith("/api/reports/dashboard");
      expect(fetchMock).toHaveBeenCalledWith("/api/hardening/status");
    });
    expect(await screen.findByText("Reading 36/40, Band 8")).toBeInTheDocument();
    expect(screen.getByText("Review summary completion")).toBeInTheDocument();
    expect(screen.getByText("live/import.zip")).toBeInTheDocument();
    expect(screen.getByText("Live Airport Enquiry")).toBeInTheDocument();
    expect(screen.queryByText("reading/broken.pdf")).not.toBeInTheDocument();
  });
});
