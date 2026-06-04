import { useState } from "react";

export interface HistoryAttemptView {
  durationSeconds: number | null;
  estimatedBand: number | null;
  id: string;
  mode: string;
  rawScore: number | null;
  startedAt: string;
  subject: string;
  submittedAt: string;
}

export interface AccuracyRowView {
  accuracy: number;
  correct: number;
  label: string;
  total: number;
}

export interface PredictionCardView {
  basisAttempts: number | null;
  confidence: "low" | "medium" | "high" | null;
  detail: string | null;
  value: string;
}

export type PredictionCardData = PredictionCardView | string;

export interface ReportsAnalyticsView {
  frequencyRows: AccuracyRowView[];
  mistakeLabels: Array<{ count: number; label: string }>;
  partRows: AccuracyRowView[];
  questionTypeRows: AccuracyRowView[];
}

export interface DashboardReportView {
  latestMockScore: string;
  predictedListening: PredictionCardData;
  predictedReading: PredictionCardData;
  recommendedNextPractice: string;
  weakestQuestionType: string;
}

interface HistoryReviewItem {
  acceptedAnswers: string[];
  answerSentence: string | null;
  explanation: string | null;
  isAnswered?: boolean;
  isCorrect: boolean;
  part: string | null;
  passageTitle: string | null;
  prompt: string | null;
  questionId: string;
  questionNumber: number | null;
  rawAnswer: string;
  synonyms: string[];
}

interface HistoryReviewConflict {
  id: string;
  questionId: string;
  remoteCreatedAt: string;
  remoteDeviceId: string;
  remoteIsCorrect: boolean;
  remoteRawAnswer: string;
  status: "conflict" | "resolved";
}

interface HistoryReview {
  conflicts?: HistoryReviewConflict[];
  id: string;
  reviewItems: HistoryReviewItem[];
}

export interface HistoryReportsPreviewProps {
  analytics: ReportsAnalyticsView;
  dashboard: DashboardReportView;
  history: HistoryAttemptView[];
}

interface ExportedReportFiles {
  mistakesCsv: string;
  mockCsv: string;
  mockJson: string;
}

function formatAccuracy(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "-";
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function formatHistorySubject(subject: string) {
  return subject.trim() || "Unknown subject";
}

function formatHistoryMode(mode: string) {
  return mode.trim() || "Unknown mode";
}

function formatHistoryDate(submittedAt: string) {
  return submittedAt.trim().slice(0, 10) || "Date unavailable";
}

function formatUserAnswer(rawAnswer: string) {
  return rawAnswer.trim() || "No answer";
}

function formatReviewStatus(item: HistoryReviewItem) {
  if (item.isAnswered === false) {
    return "Unanswered";
  }

  return item.isCorrect ? "Correct" : "Incorrect";
}

function formatConflictAnswer(rawAnswer: string) {
  return rawAnswer.trim() || "No answer";
}

function formatConflictDeviceId(deviceId: string) {
  return deviceId.trim() || "Unknown device";
}

function formatAcceptedAnswers(acceptedAnswers: string[]) {
  const answers = acceptedAnswers.map((answer) => answer.trim()).filter(Boolean);
  return answers.length > 0 ? answers.join(", ") : "Not configured";
}

function formatReviewPrompt(prompt: string | null) {
  return prompt?.trim() || "Review question";
}

function renderAnswerSentence(item: HistoryReviewItem) {
  const answerSentence = item.answerSentence?.trim();
  if (!answerSentence) {
    return <p className="empty-state">No answer sentence recorded for this question.</p>;
  }

  return <mark className="ielts-highlight">{answerSentence}</mark>;
}

function renderExplanation(item: HistoryReviewItem) {
  const explanation = item.explanation?.trim();
  if (!explanation) {
    return <p className="empty-state">No explanation recorded for this question.</p>;
  }

  return <p>{explanation}</p>;
}

function renderSynonymNotes(item: HistoryReviewItem) {
  const synonyms = item.synonyms.map((synonym) => synonym.trim()).filter(Boolean);
  if (synonyms.length === 0) {
    return <p className="empty-state">No synonym notes recorded for this question.</p>;
  }

  return (
    <ul className="mock-review-synonyms">
      {synonyms.map((synonym) => (
        <li key={synonym}>{synonym}</li>
      ))}
    </ul>
  );
}

function formatAccuracyLabel(label: string) {
  return label.trim() || "Unknown accuracy group";
}

function formatMistakeLabel(label: string) {
  return label.trim() || "Unlabeled mistake";
}

function formatWeakestQuestionType(value: string) {
  return value.trim() || "No data";
}

function formatExportedReportFiles(files: ExportedReportFiles): ExportedReportFiles {
  return {
    mistakesCsv: files.mistakesCsv.trim() || "Mistakes CSV path unavailable",
    mockCsv: files.mockCsv.trim() || "Mock CSV path unavailable",
    mockJson: files.mockJson.trim() || "Mock JSON path unavailable"
  };
}

function conflictsForQuestion(review: HistoryReview, questionId: string): HistoryReviewConflict[] {
  return review.conflicts?.filter((conflict) => conflict.questionId === questionId && conflict.status === "conflict") ?? [];
}

function renderAccuracyRows(rows: AccuracyRowView[]) {
  return rows.map((row, index) => (
    <div className="accuracy-row" key={`${formatAccuracyLabel(row.label)}-${index}`}>
      <span>{formatAccuracyLabel(row.label)}</span>
      <strong>{formatAccuracy(row.accuracy)}</strong>
      <small>
        {row.correct}/{row.total}
      </small>
    </div>
  ));
}

function formatConfidence(confidence: PredictionCardView["confidence"]) {
  return confidence ? `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence` : null;
}

function renderPredictionCard(prediction: PredictionCardData) {
  if (typeof prediction === "string") {
    return <strong>{prediction}</strong>;
  }

  const confidence = formatConfidence(prediction.confidence);
  const basis =
    prediction.basisAttempts === null
      ? null
      : `${prediction.basisAttempts} ${prediction.basisAttempts === 1 ? "attempt" : "attempts"}`;
  const meta = [confidence, basis].filter(Boolean).join(" - ");

  return (
    <>
      <strong>{prediction.value}</strong>
      {prediction.detail ? <small className="prediction-detail">{prediction.detail}</small> : null}
      {meta ? <small className="prediction-detail">{meta}</small> : null}
    </>
  );
}

export function HistoryReportsPreview({ analytics, dashboard, history }: HistoryReportsPreviewProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [exportedFiles, setExportedFiles] = useState<ExportedReportFiles | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [historyReview, setHistoryReview] = useState<HistoryReview | null>(null);
  const [historyReviewError, setHistoryReviewError] = useState<string | null>(null);
  const [loadingReviewAttemptId, setLoadingReviewAttemptId] = useState<string | null>(null);

  async function exportReports() {
    setIsExporting(true);
    setCopyStatus(null);
    setExportError(null);
    setExportedFiles(null);
    try {
      const response = await fetch("/api/reports/export", { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not export reports");
      }
      setExportedFiles((await response.json()) as ExportedReportFiles);
    } catch {
      setExportError("Could not export local reports.");
    } finally {
      setIsExporting(false);
    }
  }

  async function copyReportPaths() {
    if (!exportedFiles) {
      return;
    }

    setCopyStatus(null);
    setExportError(null);
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      const files = formatExportedReportFiles(exportedFiles);
      await navigator.clipboard.writeText([files.mockJson, files.mockCsv, files.mistakesCsv].join("\n"));
      setCopyStatus("Report paths copied.");
    } catch {
      setExportError("Could not copy report paths.");
    }
  }

  async function openHistoryReview(attemptId: string) {
    setLoadingReviewAttemptId(attemptId);
    setHistoryReview(null);
    setHistoryReviewError(null);
    try {
      const response = await fetch(`/api/practice/${attemptId}/review`, { method: "GET" });
      if (!response.ok) {
        throw new Error("Could not load review");
      }
      setHistoryReview((await response.json()) as HistoryReview);
    } catch {
      setHistoryReviewError("Could not load this attempt review.");
    } finally {
      setLoadingReviewAttemptId(null);
    }
  }

  return (
    <section className="history-reports-band" aria-label="History and reports preview">
      <div className="reports-header">
        <div>
          <p className="eyebrow">History and prediction</p>
          <h2>Reports</h2>
        </div>
        <div className="report-actions">
          <button disabled={isExporting} onClick={() => void exportReports()} type="button">
            Export mock report
          </button>
          <button disabled={isExporting} onClick={() => void exportReports()} type="button">
            Export mistakes
          </button>
        </div>
      </div>
      {exportedFiles ? (
        <section className="report-export-status" role="status">
          <h3>Reports exported</h3>
          <ul>
            <li>{formatExportedReportFiles(exportedFiles).mockJson}</li>
            <li>{formatExportedReportFiles(exportedFiles).mockCsv}</li>
            <li>{formatExportedReportFiles(exportedFiles).mistakesCsv}</li>
          </ul>
          <div className="report-export-actions">
            <button onClick={() => void copyReportPaths()} type="button">
              Copy report paths
            </button>
            {copyStatus ? <span>{copyStatus}</span> : null}
          </div>
        </section>
      ) : null}
      {exportError ? <p className="mock-start-error">{exportError}</p> : null}

      <div className="report-metrics" aria-label="Score prediction cards">
        <div>
          <span>Latest mock</span>
          <strong>{dashboard.latestMockScore}</strong>
        </div>
        <div>
          <span>Listening prediction</span>
          {renderPredictionCard(dashboard.predictedListening)}
        </div>
        <div>
          <span>Reading prediction</span>
          {renderPredictionCard(dashboard.predictedReading)}
        </div>
        <div>
          <span>Next practice</span>
          <strong>{dashboard.recommendedNextPractice}</strong>
        </div>
      </div>
      <p className="score-estimate-note">
        Predicted bands are estimates from local history; official IELTS raw-score cutoffs can vary by test.
      </p>
      {historyReviewError ? <p className="mock-start-error">{historyReviewError}</p> : null}
      {historyReview ? (
        <section className="mock-review-panel" aria-label="History review details">
          <div>
            <p className="eyebrow">History review</p>
            <h3>Answer evidence and explanations</h3>
          </div>
          {historyReview.reviewItems.length > 0 ? (
            <ol className="mock-review-list">
              {historyReview.reviewItems.map((item) => (
                <li key={item.questionId}>
                  <div className="mock-review-heading">
                    <span>{formatReviewStatus(item)}</span>
                    <strong>
                      {item.questionNumber ?? "Question"} {formatReviewPrompt(item.prompt)}
                    </strong>
                  </div>
                  <p>Your answer: {formatUserAnswer(item.rawAnswer)}</p>
                  <p>Accepted: {formatAcceptedAnswers(item.acceptedAnswers)}</p>
                  <div className="answer-sentence-preview">{renderAnswerSentence(item)}</div>
                  {renderExplanation(item)}
                  {renderSynonymNotes(item)}
                  {conflictsForQuestion(historyReview, item.questionId).length > 0 ? (
                    <div className="sync-conflict-review" aria-label={`Sync conflicts for question ${item.questionId}`}>
                      <strong>Sync conflict</strong>
                      <ul>
                        {conflictsForQuestion(historyReview, item.questionId).map((conflict) => (
                          <li key={conflict.id}>
                            Remote answer from {formatConflictDeviceId(conflict.remoteDeviceId)}:{" "}
                            {formatConflictAnswer(conflict.remoteRawAnswer)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-state">No detailed review items were saved for this attempt</p>
          )}
        </section>
      ) : null}

      <div className="reports-grid">
        <section className="history-table-wrap" aria-label="Attempt history">
          <h3>History</h3>
          <table className="history-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Score</th>
                <th>Band</th>
                <th>Time</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{formatHistorySubject(attempt.subject)}</td>
                    <td>{formatHistoryMode(attempt.mode)}</td>
                    <td>{formatHistoryDate(attempt.submittedAt)}</td>
                    <td>{attempt.rawScore ?? "-"}</td>
                    <td>{attempt.estimatedBand ?? "-"}</td>
                    <td>{formatDuration(attempt.durationSeconds)}</td>
                    <td>
                      <button
                        aria-label={`Review attempt ${attempt.id}`}
                        disabled={loadingReviewAttemptId === attempt.id}
                        onClick={() => void openHistoryReview(attempt.id)}
                        type="button"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <p className="empty-state">No completed attempts yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="analytics-list" aria-label="Accuracy analytics">
          <h3>Accuracy</h3>
          {[...analytics.partRows, ...analytics.frequencyRows, ...analytics.questionTypeRows].length > 0 ? (
            <>
              {analytics.partRows.length > 0 ? (
                <>
                  <h4>Part accuracy</h4>
                  {renderAccuracyRows(analytics.partRows)}
                </>
              ) : null}
              {analytics.frequencyRows.length > 0 ? (
                <>
                  <h4>Frequency accuracy</h4>
                  {renderAccuracyRows(analytics.frequencyRows)}
                </>
              ) : null}
              {analytics.questionTypeRows.length > 0 ? (
                <>
                  <h4>Question type accuracy</h4>
                  {renderAccuracyRows(analytics.questionTypeRows)}
                </>
              ) : null}
            </>
          ) : (
            <p className="empty-state">Accuracy appears after submitted answers</p>
          )}
          <h4>Weakest type</h4>
          <p>{formatWeakestQuestionType(dashboard.weakestQuestionType)}</p>
          <h4>Mistake labels</h4>
          {analytics.mistakeLabels.length > 0 ? (
            <div className="mistake-chip-list">
              {analytics.mistakeLabels.map((label, index) => (
                <span className="mistake-chip" key={`${formatMistakeLabel(label.label)}-${index}`}>
                  <span>{formatMistakeLabel(label.label)}</span>
                  <strong>{label.count}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-state">Mistake labels appear after review</p>
          )}
        </section>
      </div>
    </section>
  );
}
