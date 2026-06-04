export interface ScoreReportProps {
  subject: "listening" | "reading";
  rawScore: number;
  estimatedBand: number;
  mode?: "mock" | "practice";
  totalQuestions?: number;
}

export function ScoreReport({ subject, rawScore, estimatedBand, mode = "mock", totalQuestions = 40 }: ScoreReportProps) {
  const practiceAccuracy = totalQuestions > 0 ? Math.round((rawScore / totalQuestions) * 100) : 0;

  return (
    <section className="score-report" aria-label="Score report">
      <h3>Score report</h3>
      <dl>
        <div>
          <dt>Subject</dt>
          <dd>{subject === "reading" ? "Reading" : "Listening"}</dd>
        </div>
        <div>
          <dt>Raw score</dt>
          <dd>
            {rawScore}/{totalQuestions}
          </dd>
        </div>
        {mode === "practice" ? (
          <div>
            <dt>Practice accuracy</dt>
            <dd>{practiceAccuracy}%</dd>
          </div>
        ) : (
          <div>
            <dt>Estimated band</dt>
            <dd>{estimatedBand.toFixed(1)}</dd>
          </div>
        )}
      </dl>
      {mode === "practice" ? (
        <p className="score-estimate-note">
          Practice accuracy is based on this local set; use full mock tests for IELTS band estimates.
        </p>
      ) : (
        <p className="score-estimate-note">
          IELTS band scores are estimates because official raw-score cutoffs can vary by test.
        </p>
      )}
    </section>
  );
}
