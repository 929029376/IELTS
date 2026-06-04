import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
                missingAnswerSentence: 0,
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
    expect(screen.getByText("Band 8")).toBeInTheDocument();
    expect(screen.getByText("Range 7.5-8.5")).toBeInTheDocument();
    expect(screen.getByText("Medium confidence - 2 attempts")).toBeInTheDocument();
    expect(screen.getByText("Review summary completion")).toBeInTheDocument();
    expect(screen.getByText("Frequency accuracy")).toBeInTheDocument();
    expect(screen.getByText("High frequency")).toBeInTheDocument();
    expect(screen.getByText("live/import.zip")).toBeInTheDocument();
    expect(screen.getByText("Live Airport Enquiry")).toBeInTheDocument();
    expect(screen.queryByText("reading/broken.pdf")).not.toBeInTheDocument();
  });

  it("normalizes blank dashboard report strings from the local API", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/reports/history") {
        return { ok: true, json: async () => [] };
      }
      if (url === "/api/reports/analytics") {
        return { ok: true, json: async () => ({ byPart: {}, byQuestionType: {}, mistakeLabels: [] }) };
      }
      if (url === "/api/reports/dashboard") {
        return {
          ok: true,
          json: async () => ({
            latestMockScore: "   ",
            predictedListening: "   ",
            predictedReading: "   ",
            recommendedNextPractice: "   ",
            weakestQuestionType: "   "
          })
        };
      }
      if (url === "/api/hardening/status") {
        return {
          ok: true,
          json: async () => ({
            backupReminder: { latestBackupAt: null, reason: null, shouldRemind: false, submittedAttemptCount: 0 },
            importFailures: {
              byStatus: { needs_review: 1 },
              sources: [
                {
                  assetCount: 1,
                  createdAt: "2026-06-04T00:00:00.000Z",
                  id: "blank-dashboard-source",
                  importStatus: "needs_review",
                  originalPath: "blank-dashboard-source.zip",
                  sourceType: "listening_zip",
                  version: 1
                }
              ],
              totalUnresolved: 1
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
          })
        };
      }
      return { ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("blank-dashboard-source.zip")).toBeInTheDocument();
    expect(screen.getByText("No mock submitted")).toBeInTheDocument();
    expect(screen.getAllByText("Need history")).toHaveLength(2);
    expect(screen.getByText("Import a set to begin")).toBeInTheDocument();
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("loads local study overview and recommended mock sets from the local API", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/study/overview") {
        return {
          ok: true,
          json: async () => ({
            readiness: {
              listeningFullMockReady: true,
              readingFullMockReady: true
            },
            recommendedMockSets: {
              listening: {
                passages: [
                  { frequencyClass: "high", id: "l-p1", part: "P1", selectionWeight: 5, subject: "listening", title: "Live Listening P1 High" },
                  { frequencyClass: "high", id: "l-p2", part: "P2", selectionWeight: 5, subject: "listening", title: "Live Listening P2 High" }
                ],
                subject: "listening"
              },
              reading: {
                passages: [
                  { frequencyClass: "high", id: "r-p1", part: "P1", selectionWeight: 5, subject: "reading", title: "Live Reading P1 High" }
                ],
                subject: "reading"
              }
            },
            subjects: {
              listening: {
                cueCount: 1,
                frequency: { high: 3, low: 1, medium: 1, unknown: 0 },
                passageCount: 5,
                questionCount: 5
              },
              reading: {
                cueCount: 0,
                frequency: { high: 1, low: 1, medium: 1, unknown: 0 },
                passageCount: 3,
                questionCount: 3
              }
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

    expect(await screen.findByText("Local study queue")).toBeInTheDocument();
    expect(await screen.findByText("Listening mock ready")).toBeInTheDocument();
    expect(screen.getByText("5 passages / 5 questions / 1 cues")).toBeInTheDocument();
    expect(screen.getByText("Live Listening P1 High")).toBeInTheDocument();
    expect(screen.getByText("Live Reading P1 High")).toBeInTheDocument();
  });

  it("loads sync device and folder configuration from the local API", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/sync/config") {
        return {
          ok: true,
          json: async () => ({
            deviceId: "device-live-sync-1",
            deviceName: "MacBook IELTS Live",
            platform: "darwin",
            syncFolderPath: "/Users/musheng/Desktop/同步空间/IELTS-Live-Sync"
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

    expect(await screen.findByText("/Users/musheng/Desktop/同步空间/IELTS-Live-Sync")).toBeInTheDocument();
    expect(screen.getByText("MacBook IELTS Live")).toBeInTheDocument();
    expect(screen.queryByText("Mac local device")).not.toBeInTheDocument();
  });

  it("loads live intensive listening and reading data from the local API", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/study/intensive") {
        return {
          ok: true,
          json: async () => ({
            listening: {
              audioTitle: "Live Listening Intensive",
              cues: [
                {
                  endSeconds: 9.4,
                  id: "cue-live-1",
                  label: "Sentence 2",
                  startSeconds: 5.2,
                  transcript: "The appointment is at nine thirty."
                }
              ]
            },
            reading: {
              answerSentence: "key answer sentence",
              explanation: "This sentence directly proves the claim.",
              keywords: ["claim"],
              passageText: "The key answer sentence proves the claim. The distractor sentence is nearby.",
              passageTitle: "Live Reading Intensive",
              questionPrompt: "Find the evidence sentence.",
              synonyms: ["prove = support"]
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

    expect(await screen.findByText("Live Listening Intensive")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Repeat Sentence 2" })).toBeInTheDocument();
    expect(screen.getByText("The appointment is at nine thirty.")).toBeInTheDocument();
    expect(screen.getByText("Find the evidence sentence.")).toBeInTheDocument();
    expect(screen.getByText("key answer sentence")).toHaveClass("ielts-highlight");
    expect(screen.getByText("prove = support")).toBeInTheDocument();
    expect(screen.getByText("This sentence directly proves the claim.")).toBeInTheDocument();
  });

  it("refreshes local study overview and intensive preview after importing question-bank material", async () => {
    let imported = false;
    let overviewCalls = 0;
    let intensiveCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/reports/history") {
        return { ok: true, json: async () => [] };
      }
      if (url === "/api/reports/analytics") {
        return { ok: true, json: async () => ({ byPart: {}, byQuestionType: {}, mistakeLabels: [] }) };
      }
      if (url === "/api/reports/dashboard") {
        return {
          ok: true,
          json: async () => ({
            latestMockScore: null,
            predictedListening: "Need history",
            predictedReading: "Need history",
            recommendedNextPractice: "Import a set to begin",
            weakestQuestionType: null
          })
        };
      }
      if (url === "/api/hardening/status") {
        return {
          ok: true,
          json: async () => ({
            backupReminder: { latestBackupAt: null, reason: null, shouldRemind: false, submittedAttemptCount: 0 },
            importFailures: { byStatus: {}, sources: [], totalUnresolved: 0 },
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
          })
        };
      }
      if (url === "/api/study/overview") {
        overviewCalls += 1;
        return {
          ok: true,
          json: async () => ({
            readiness: { listeningFullMockReady: false, readingFullMockReady: imported },
            recommendedMockSets: {
              listening: null,
              reading: imported
                ? {
                    passages: [
                      {
                        frequencyClass: "high",
                        id: "reading-imported-1",
                        part: "P2",
                        selectionWeight: 5,
                        subject: "reading",
                        title: "Imported Reading Refresh"
                      }
                    ],
                    subject: "reading"
                  }
                : null
            },
            subjects: {
              listening: {
                cueCount: 0,
                frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
                passageCount: 0,
                questionCount: 0
              },
              reading: {
                cueCount: 0,
                frequency: { high: imported ? 1 : 0, low: 0, medium: 0, unknown: 0 },
                passageCount: imported ? 1 : 0,
                questionCount: imported ? 1 : 0
              }
            }
          })
        };
      }
      if (url === "/api/study/intensive") {
        intensiveCalls += 1;
        return {
          ok: true,
          json: async () =>
            imported
              ? {
                  listening: null,
                  reading: {
                    answerSentence: "Imported Evidence Sentence",
                    explanation: "Imported evidence supports the answer.",
                    keywords: ["evidence"],
                    passageText: "Imported Evidence Sentence supports the answer.",
                    passageTitle: "Imported Reading Refresh",
                    questionPrompt: "Find the imported evidence.",
                    synonyms: ["supports = proves"]
                  }
                }
              : { listening: null, reading: null }
        };
      }
      if (url === "/api/import/reading-directory") {
        imported = true;
        return {
          ok: true,
          json: async () => ({ importedCount: 1 })
        };
      }
      return { ok: false, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("No local reading passage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import reading directory" }));

    expect(await screen.findByText("Imported 1 item into the local question bank.")).toBeInTheDocument();
    await waitFor(() => {
      expect(overviewCalls).toBe(2);
      expect(intensiveCalls).toBe(2);
    });
    expect(screen.getByText("Imported Reading Refresh")).toBeInTheDocument();
    expect(screen.getByText("Find the imported evidence.")).toBeInTheDocument();
    expect(screen.getByText("Imported Evidence Sentence")).toHaveClass("ielts-highlight");
  });

  it("refreshes dashboard history and prediction after submitting a local mock", async () => {
    let dashboardCalls = 0;
    let mockSubmitted = false;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/reports/history") {
        return {
          ok: true,
          json: async () =>
            mockSubmitted
              ? [
                  {
                    durationSeconds: 900,
                    estimatedBand: 4,
                    id: "attempt-refresh-1",
                    mode: "mock",
                    rawScore: 1,
                    startedAt: "2026-06-04T08:00:00.000Z",
                    subject: "reading",
                    submittedAt: "2026-06-04T08:15:00.000Z"
                  }
                ]
              : []
        };
      }
      if (url === "/api/reports/analytics") {
        return {
          ok: true,
          json: async () => ({ byPart: {}, byQuestionType: {}, mistakeLabels: [] })
        };
      }
      if (url === "/api/reports/dashboard") {
        dashboardCalls += 1;
        return {
          ok: true,
          json: async () => ({
            latestMockScore:
              dashboardCalls > 1
                ? {
                    durationSeconds: 900,
                    estimatedBand: 4,
                    id: "attempt-refresh-1",
                    mode: "mock",
                    rawScore: 1,
                    startedAt: "2026-06-04T08:00:00.000Z",
                    subject: "reading",
                    submittedAt: "2026-06-04T08:15:00.000Z"
                  }
                : null,
            predictedListening: "Need history",
            predictedReading:
              dashboardCalls > 1
                ? {
                    basisAttempts: 1,
                    confidence: "low",
                    predictedBand: 4,
                    range: { max: 4.5, min: 3.5 },
                    subject: "reading"
                  }
                : "Need history",
            recommendedNextPractice: dashboardCalls > 1 ? "Review fill blank" : "Import a set to begin",
            weakestQuestionType: dashboardCalls > 1 ? "fill blank" : null
          })
        };
      }
      if (url === "/api/hardening/status") {
        return {
          ok: true,
          json: async () => ({
            backupReminder: { latestBackupAt: null, reason: null, shouldRemind: false, submittedAttemptCount: 0 },
            importFailures: { byStatus: {}, sources: [], totalUnresolved: 0 },
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
          })
        };
      }
      if (url === "/api/study/overview") {
        return {
          ok: true,
          json: async () => ({
            readiness: { listeningFullMockReady: false, readingFullMockReady: false },
            recommendedMockSets: { listening: null, reading: null },
            subjects: {
              listening: {
                cueCount: 0,
                frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
                passageCount: 0,
                questionCount: 0
              },
              reading: {
                cueCount: 0,
                frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
                passageCount: 0,
                questionCount: 0
              }
            }
          })
        };
      }
      if (url === "/api/study/intensive") {
        return {
          ok: true,
          json: async () => ({})
        };
      }
      if (url === "/api/practice/start") {
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-refresh-1",
            questions: [
              {
                answerRules: {},
                id: "question-refresh-1",
                part: "P1",
                passageId: "passage-refresh-1",
                passageTitle: "Refresh Reading",
                prompt: "Which word completes the sentence?",
                questionNumber: 1,
                questionType: "fill_blank"
              }
            ]
          })
        };
      }
      if (url === "/api/practice/attempt-refresh-1/answer") {
        return {
          ok: true,
          json: async () => ({})
        };
      }
      if (url === "/api/practice/attempt-refresh-1/submit") {
        mockSubmitted = true;
        return {
          ok: true,
          json: async () => ({
            attemptId: "attempt-refresh-1",
            estimatedBand: 4,
            rawScore: 1,
            submittedAt: "2026-06-04T08:15:00.000Z"
          })
        };
      }
      if (url === "/api/practice/attempt-refresh-1/review") {
        return {
          ok: true,
          json: async () => ({ id: "attempt-refresh-1", reviewItems: [] })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("No mock submitted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start reading mock" }));
    const answer = await screen.findByRole("textbox", { name: "Answer for question question-refresh-1" });
    fireEvent.change(answer, { target: { value: "routes" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit local mock" }));

    await waitFor(() => {
      expect(dashboardCalls).toBe(2);
    });
    expect(screen.getByText("Reading 1/40, Band 4")).toBeInTheDocument();
    expect(screen.getByText("Review fill blank")).toBeInTheDocument();
    expect(screen.getByText("2026-06-04")).toBeInTheDocument();
  });

  it("refreshes the backup reminder after exporting a manual backup", async () => {
    let hardeningCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/reports/history") {
        return {
          ok: true,
          json: async () => []
        };
      }
      if (url === "/api/reports/analytics") {
        return {
          ok: true,
          json: async () => ({ byPart: {}, byQuestionType: {}, mistakeLabels: [] })
        };
      }
      if (url === "/api/reports/dashboard") {
        return {
          ok: true,
          json: async () => ({
            latestMockScore: null,
            predictedListening: "Need history",
            predictedReading: "Need history",
            recommendedNextPractice: "Import a set to begin",
            weakestQuestionType: null
          })
        };
      }
      if (url === "/api/hardening/status") {
        hardeningCalls += 1;
        return {
          ok: true,
          json: async () => ({
            backupReminder:
              hardeningCalls > 1
                ? {
                    latestBackupAt: "2026-06-04T11:00:00.000Z",
                    reason: null,
                    shouldRemind: false,
                    submittedAttemptCount: 12
                  }
                : {
                    latestBackupAt: null,
                    reason: "You have 12 submitted attempts and no recent backup.",
                    shouldRemind: true,
                    submittedAttemptCount: 12
                  },
            importFailures: { byStatus: {}, sources: [], totalUnresolved: 0 },
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
          })
        };
      }
      if (url === "/api/study/overview") {
        return {
          ok: true,
          json: async () => ({
            readiness: { listeningFullMockReady: false, readingFullMockReady: false },
            recommendedMockSets: { listening: null, reading: null },
            subjects: {
              listening: {
                cueCount: 0,
                frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
                passageCount: 0,
                questionCount: 0
              },
              reading: {
                cueCount: 0,
                frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
                passageCount: 0,
                questionCount: 0
              }
            }
          })
        };
      }
      if (url === "/api/study/intensive") {
        return {
          ok: true,
          json: async () => ({})
        };
      }
      if (url === "/api/backups/export") {
        return {
          ok: true,
          json: async () => ({
            filePath: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json",
            rowCounts: { attempt_answers: 12, attempts: 12, dictation_attempts: 0, listening_cues: 0 }
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

    expect(await screen.findByText("You have 12 submitted attempts and no recent backup.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));

    await waitFor(() => {
      expect(hardeningCalls).toBe(2);
    });
    expect(screen.getByText("latest backup: 2026-06-04")).toBeInTheDocument();
    expect(screen.getByText("Backup status is acceptable for the current history size.")).toBeInTheDocument();
  });

  it("refreshes dashboard history and predictions after manual sync imports remote records", async () => {
    let dashboardCalls = 0;
    let syncImported = false;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/reports/history") {
        return {
          ok: true,
          json: async () =>
            syncImported
              ? [
                  {
                    durationSeconds: 2400,
                    estimatedBand: 6.5,
                    id: "attempt-remote-sync-1",
                    mode: "mock",
                    rawScore: 28,
                    startedAt: "2026-06-04T07:00:00.000Z",
                    subject: "listening",
                    submittedAt: "2026-06-04T07:40:00.000Z"
                  }
                ]
              : []
        };
      }
      if (url === "/api/reports/analytics") {
        return {
          ok: true,
          json: async () => ({ byPart: {}, byQuestionType: {}, mistakeLabels: [] })
        };
      }
      if (url === "/api/reports/dashboard") {
        dashboardCalls += 1;
        return {
          ok: true,
          json: async () => ({
            latestMockScore: syncImported
              ? {
                  durationSeconds: 2400,
                  estimatedBand: 6.5,
                  id: "attempt-remote-sync-1",
                  mode: "mock",
                  rawScore: 28,
                  startedAt: "2026-06-04T07:00:00.000Z",
                  subject: "listening",
                  submittedAt: "2026-06-04T07:40:00.000Z"
                }
              : null,
            predictedListening: syncImported
              ? {
                  basisAttempts: 1,
                  confidence: "low",
                  predictedBand: 6.5,
                  range: { max: 7, min: 6 },
                  subject: "listening"
                }
              : "Need history",
            predictedReading: "Need history",
            recommendedNextPractice: syncImported ? "Review listening P3" : "Import a set to begin",
            weakestQuestionType: syncImported ? "map label" : null
          })
        };
      }
      if (url === "/api/hardening/status") {
        return {
          ok: true,
          json: async () => ({
            backupReminder: { latestBackupAt: null, reason: null, shouldRemind: false, submittedAttemptCount: 0 },
            importFailures: { byStatus: {}, sources: [], totalUnresolved: 0 },
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
          })
        };
      }
      if (url === "/api/study/overview") {
        return {
          ok: true,
          json: async () => ({
            readiness: { listeningFullMockReady: false, readingFullMockReady: false },
            recommendedMockSets: { listening: null, reading: null },
            subjects: {
              listening: {
                cueCount: 0,
                frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
                passageCount: 0,
                questionCount: 0
              },
              reading: {
                cueCount: 0,
                frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
                passageCount: 0,
                questionCount: 0
              }
            }
          })
        };
      }
      if (url === "/api/study/intensive") {
        return {
          ok: true,
          json: async () => ({})
        };
      }
      if (url === "/api/sync/import") {
        syncImported = true;
        return {
          ok: true,
          json: async () => ({
            conflicts: 0,
            imported: 3,
            skipped: 0
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

    expect(await screen.findByText("No mock submitted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manual sync" }));

    expect(await screen.findByText("Manual sync complete")).toBeInTheDocument();
    await waitFor(() => {
      expect(dashboardCalls).toBe(2);
    });
    expect(screen.getByText("Listening 28/40, Band 6.5")).toBeInTheDocument();
    expect(screen.getByText("Review listening P3")).toBeInTheDocument();
  });
});
