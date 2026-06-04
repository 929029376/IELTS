import { AlertTriangle, DatabaseZap, ShieldCheck } from "lucide-react";

type IssueCounts = {
  missingAnswerKey: number;
  missingAnswerSentence: number;
  missingAudio: number;
  missingExplanation: number;
  missingFrequencyEntry: number;
  missingListeningCues: number;
  missingTranscript: number;
};

export interface HardeningStatusView {
  backupReminder: {
    latestBackupAt: string | null;
    reason: string | null;
    shouldRemind: boolean;
    submittedAttemptCount: number;
  };
  importFailures: {
    byStatus: Record<string, number>;
    sources: Array<{
      assetCount: number;
      createdAt: string;
      id: string;
      importStatus: string;
      originalPath: string;
      sourceType: string;
      version: number;
    }>;
    totalUnresolved: number;
  };
  questionBankCompleteness: {
    issueCounts: IssueCounts;
    passages: Array<{
      frequencyClass: string;
      id: string;
      issueLabels: string[];
      part: string;
      questionCount: number;
      sourceStatus: string;
      subject: string;
      title: string;
    }>;
    totalPassages: number;
  };
}

export interface HardeningCenterProps {
  status: HardeningStatusView;
}

const issueLabels: Record<keyof IssueCounts, string> = {
  missingAnswerKey: "Answer key",
  missingAnswerSentence: "Answer sentence",
  missingAudio: "Audio",
  missingExplanation: "Explanation",
  missingFrequencyEntry: "Frequency",
  missingListeningCues: "Listening cues",
  missingTranscript: "Transcript"
};

function formatBackupDate(value: string | null) {
  return value ? value.slice(0, 10) : "No backup yet";
}

function sourcePathLabel(value: string) {
  return value.trim() || "Unknown source path";
}

function passageTitleLabel(value: string) {
  return value.trim() || "Untitled passage";
}

export function HardeningCenter({ status }: HardeningCenterProps) {
  const issueEntries = Object.entries(status.questionBankCompleteness.issueCounts) as Array<
    [keyof IssueCounts, number]
  >;
  const incompletePassages = status.questionBankCompleteness.passages.filter(
    (passage) => passage.issueLabels.length > 0
  );

  return (
    <section className="hardening-band" aria-label="V1 hardening center">
      <div className="reports-header">
        <div>
          <p className="eyebrow">V1 hardening</p>
          <h2>Readiness Checks</h2>
        </div>
      </div>

      <div className="hardening-grid">
        <section className="hardening-panel" aria-label="Import failure report">
          <div className="hardening-panel-title">
            <AlertTriangle size={18} aria-hidden="true" />
            <h3>Import failure report</h3>
          </div>
          <strong className="readiness-number">{status.importFailures.totalUnresolved}</strong>
          <p className="readiness-caption">unresolved imports</p>
          {status.importFailures.sources.length > 0 ? (
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Assets</th>
                </tr>
              </thead>
              <tbody>
                {status.importFailures.sources.map((source) => (
                  <tr key={source.id}>
                    <td>{sourcePathLabel(source.originalPath)}</td>
                    <td>{source.importStatus}</td>
                    <td>v{source.version}</td>
                    <td>{source.assetCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No import issues yet</p>
          )}
        </section>

        <section className="hardening-panel" aria-label="Question-bank completeness">
          <div className="hardening-panel-title">
            <DatabaseZap size={18} aria-hidden="true" />
            <h3>Question-bank completeness</h3>
          </div>
          <div className="issue-meter-list">
            {issueEntries.map(([issue, count]) => (
              <div className="issue-meter" key={issue}>
                <span>{issueLabels[issue]}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          {status.questionBankCompleteness.totalPassages === 0 ? (
            <p className="empty-state">No question bank data imported yet</p>
          ) : incompletePassages.length > 0 ? (
            <div className="passage-gap-list">
              {incompletePassages.map((passage) => (
                <article className="passage-gap-row" key={passage.id}>
                  <div>
                    <strong>{passageTitleLabel(passage.title)}</strong>
                    <span>
                      {passage.subject} {passage.part} · {passage.sourceStatus}
                    </span>
                  </div>
                  <p>{passage.issueLabels.join(", ")}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No completeness gaps found</p>
          )}
        </section>

        <section className="hardening-panel" aria-label="Backup reminder">
          <div className="hardening-panel-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <h3>Backup reminder</h3>
          </div>
          <strong className={status.backupReminder.shouldRemind ? "backup-warning" : "backup-ok"}>
            {status.backupReminder.submittedAttemptCount} submitted attempts
          </strong>
          <p className="readiness-caption">latest backup: {formatBackupDate(status.backupReminder.latestBackupAt)}</p>
          <p className="backup-message">
            {status.backupReminder.reason ?? "Backup status is acceptable for the current history size."}
          </p>
        </section>
      </div>
    </section>
  );
}
