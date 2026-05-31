import { useState } from "react";
import { AnswerInput } from "../questions/AnswerInput";
import { ExamShell } from "./ExamShell";
import { ReadingExamView } from "./ReadingExamView";
import { ScoreReport } from "./ScoreReport";

export function ExamPreview() {
  const [submittedReason, setSubmittedReason] = useState<string | null>(null);

  return (
    <section className="exam-preview-band" aria-label="IELTS-style exam preview">
      <ExamShell
        title="Reading Mock Test"
        durationSeconds={3600}
        questions={[
          { questionNumber: 1, answered: true, markedForReview: false, current: true },
          { questionNumber: 2, answered: false, markedForReview: false },
          { questionNumber: 3, answered: false, markedForReview: true }
        ]}
        onSubmit={(event) => setSubmittedReason(event.reason)}
      >
        <ReadingExamView
          passageTitle="The History of Tea"
          passageText="Tea became popular across trade routes. The answer sentence explains how tea moved between regions."
          highlightedText="answer sentence"
          questions={
            <div className="preview-question">
              <p>Questions 1-3</p>
              <label>
                1. Tea moved through early trade ____.
                <AnswerInput
                  questionId="1"
                  questionType="fill_blank"
                  value="routes"
                  onChange={() => undefined}
                />
              </label>
            </div>
          }
        />
      </ExamShell>
      {submittedReason ? (
        <div className="preview-submit-state">
          <p>Submitted: {submittedReason}</p>
          <ScoreReport subject="reading" rawScore={1} estimatedBand={4} />
        </div>
      ) : null}
    </section>
  );
}
