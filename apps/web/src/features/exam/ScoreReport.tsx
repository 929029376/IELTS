export interface ScoreReportProps {
  subject: "listening" | "reading";
  rawScore: number;
  estimatedBand: number;
  totalQuestions?: number;
}

export function ScoreReport({ subject, rawScore, estimatedBand, totalQuestions = 40 }: ScoreReportProps) {
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
        <div>
          <dt>Estimated band</dt>
          <dd>{estimatedBand.toFixed(1)}</dd>
        </div>
      </dl>
      <p className="score-estimate-note">
        IELTS band scores are estimates because official raw-score cutoffs can vary by test.
      </p>
    </section>
  );
}
