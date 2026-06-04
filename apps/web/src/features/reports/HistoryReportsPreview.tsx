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

export interface ReportsAnalyticsView {
  mistakeLabels: Array<{ count: number; label: string }>;
  partRows: AccuracyRowView[];
  questionTypeRows: AccuracyRowView[];
}

export interface DashboardReportView {
  latestMockScore: string;
  predictedListening: string;
  predictedReading: string;
  recommendedNextPractice: string;
  weakestQuestionType: string;
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

export function HistoryReportsPreview({ analytics, dashboard, history }: HistoryReportsPreviewProps) {
  const [exportedFiles, setExportedFiles] = useState<ExportedReportFiles | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function exportReports() {
    setIsExporting(true);
    setExportError(null);
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
            <li>{exportedFiles.mockJson}</li>
            <li>{exportedFiles.mockCsv}</li>
            <li>{exportedFiles.mistakesCsv}</li>
          </ul>
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
          <strong>{dashboard.predictedListening}</strong>
        </div>
        <div>
          <span>Reading prediction</span>
          <strong>{dashboard.predictedReading}</strong>
        </div>
        <div>
          <span>Next practice</span>
          <strong>{dashboard.recommendedNextPractice}</strong>
        </div>
      </div>
      <p className="score-estimate-note">
        Predicted bands are estimates from local history; official IELTS raw-score cutoffs can vary by test.
      </p>

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
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.subject}</td>
                    <td>{attempt.mode}</td>
                    <td>{attempt.submittedAt.slice(0, 10)}</td>
                    <td>{attempt.rawScore ?? "-"}</td>
                    <td>{attempt.estimatedBand ?? "-"}</td>
                    <td>{formatDuration(attempt.durationSeconds)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <p className="empty-state">No completed attempts yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="analytics-list" aria-label="Accuracy analytics">
          <h3>Accuracy</h3>
          {[...analytics.partRows, ...analytics.questionTypeRows].length > 0 ? (
            [...analytics.partRows, ...analytics.questionTypeRows].map((row) => (
              <div className="accuracy-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{formatAccuracy(row.accuracy)}</strong>
                <small>
                  {row.correct}/{row.total}
                </small>
              </div>
            ))
          ) : (
            <p className="empty-state">Accuracy appears after submitted answers</p>
          )}
          <h4>Weakest type</h4>
          <p>{dashboard.weakestQuestionType}</p>
          <h4>Mistake labels</h4>
          {analytics.mistakeLabels.length > 0 ? (
            <div className="mistake-chip-list">
              {analytics.mistakeLabels.map((label) => (
                <span className="mistake-chip" key={label.label}>
                  <span>{label.label}</span>
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
