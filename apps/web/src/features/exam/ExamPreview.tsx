import { useState } from "react";
import type { QuestionType } from "@ielts/shared/questionTypes";
import { AnswerInput } from "../questions/AnswerInput";
import { ExamShell } from "./ExamShell";
import { ListeningExamView } from "./ListeningExamView";
import { ReadingExamView } from "./ReadingExamView";
import { ScoreReport } from "./ScoreReport";

interface StartedMockQuestion {
  answerRules: Record<string, unknown>;
  assetPaths?: string[];
  audioDurationSeconds?: number | null;
  audioPath?: string | null;
  id: string;
  part: string;
  passageId: string;
  passageText?: string | null;
  passageTitle: string;
  prompt: string;
  questionNumber: number;
  questionType: string;
}

interface StartedMock {
  attemptId: string;
  questions: StartedMockQuestion[];
  subject: "listening" | "reading";
}

interface MockSubmitResult {
  attemptId: string;
  estimatedBand: number;
  rawScore: number;
  submittedAt: string;
}

interface MockReviewItem {
  acceptedAnswers: string[];
  answerSentence: string | null;
  explanation: string | null;
  isCorrect: boolean;
  part: string | null;
  passageTitle: string | null;
  prompt: string | null;
  questionId: string;
  questionNumber: number | null;
  rawAnswer: string;
  synonyms: string[];
}

interface MockReview {
  id: string;
  reviewItems: MockReviewItem[];
}

async function startMock(subject: "listening" | "reading"): Promise<StartedMock> {
  const response = await fetch("/api/practice/start", {
    body: JSON.stringify({ mode: "mock", subject }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Could not start ${subject} mock`);
  }

  const started = (await response.json()) as Omit<StartedMock, "subject">;
  return { ...started, subject };
}

function subjectLabel(subject: "listening" | "reading") {
  return subject === "listening" ? "listening" : "reading";
}

function renderReviewEvidence(item: MockReviewItem) {
  if (!item.answerSentence) {
    return <p className="empty-state">No answer sentence recorded for this question.</p>;
  }

  return <mark className="ielts-highlight">{item.answerSentence}</mark>;
}

export function ExamPreview() {
  const [activeMock, setActiveMock] = useState<StartedMock | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mockReview, setMockReview] = useState<MockReview | null>(null);
  const [scoreReport, setScoreReport] = useState<MockSubmitResult | null>(null);
  const [submittedReason, setSubmittedReason] = useState<string | null>(null);

  async function handleStartMock(subject: "listening" | "reading") {
    setIsStarting(true);
    setStartError(null);
    setSubmitError(null);
    setMockReview(null);
    setScoreReport(null);
    setAnswers({});
    try {
      setActiveMock(await startMock(subject));
    } catch {
      setStartError(`Could not start ${subjectLabel(subject)} mock from the local question bank.`);
    } finally {
      setIsStarting(false);
    }
  }

  async function saveMockAnswer(questionId: string) {
    if (!activeMock) {
      return;
    }

    const rawAnswer = answers[questionId] ?? "";
    await fetch(`/api/practice/${activeMock.attemptId}/answer`, {
      body: JSON.stringify({
        markedForReview: false,
        questionId,
        rawAnswer,
        timeSpentSeconds: 0
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  }

  async function submitActiveMock() {
    if (!activeMock || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/practice/${activeMock.attemptId}/submit`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Could not submit mock");
      }
      setScoreReport((await response.json()) as MockSubmitResult);
      const reviewResponse = await fetch(`/api/practice/${activeMock.attemptId}/review`, {
        method: "GET"
      });
      if (reviewResponse.ok) {
        setMockReview((await reviewResponse.json()) as MockReview);
      }
    } catch {
      setSubmitError("Could not submit the local mock attempt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeQuestions = activeMock?.questions ?? [];
  const mockQuestionStates = activeQuestions.map((question, index) => ({
    questionNumber: question.questionNumber,
    answered: Boolean((answers[question.id] ?? "").trim()),
    markedForReview: false,
    current: index === 0
  }));
  const mockQuestionList = (
    <div className="local-mock-questions">
      {activeQuestions.map((question) => (
        <label className="local-mock-question-card" key={question.id}>
          <span>{question.part}</span>
          <strong>
            {question.questionNumber}. {question.prompt}
          </strong>
          <AnswerInput
            questionId={question.id}
            questionType={question.questionType as QuestionType}
            value={answers[question.id] ?? ""}
            onBlur={() => void saveMockAnswer(question.id)}
            onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
          />
        </label>
      ))}
    </div>
  );

  return (
    <section className="exam-preview-band" aria-label="IELTS-style exam preview">
      <div className="mock-start-panel" aria-label="Mock exam starter">
        <div>
          <p className="eyebrow">Mock exam center</p>
          <h2>Start from local question bank</h2>
        </div>
        <div className="mock-start-actions">
          <button disabled={isStarting} onClick={() => void handleStartMock("reading")} type="button">
            Start reading mock
          </button>
          <button disabled={isStarting} onClick={() => void handleStartMock("listening")} type="button">
            Start listening mock
          </button>
        </div>
      </div>
      {activeMock ? (
        <section className="loaded-mock-panel" aria-label="Loaded local mock set">
          <div>
            <p className="eyebrow">Attempt {activeMock.attemptId}</p>
            <h3>Loaded local {activeMock.subject} mock</h3>
          </div>
          <ol className="loaded-mock-question-list">
            {activeMock.questions.map((question) => (
              <li key={question.id}>
                <span>{question.part}</span>
                <strong>{question.passageTitle}</strong>
                <p>{question.prompt}</p>
              </li>
            ))}
          </ol>
          <button disabled={isSubmitting || scoreReport !== null} onClick={() => void submitActiveMock()} type="button">
            Submit local mock
          </button>
        </section>
      ) : null}
      {startError ? <p className="mock-start-error">{startError}</p> : null}
      {submitError ? <p className="mock-start-error">{submitError}</p> : null}
      {activeMock && activeQuestions.length > 0 ? (
        <ExamShell
          title={`${activeMock.subject === "reading" ? "Reading" : "Listening"} Local Mock Test`}
          durationSeconds={activeMock.subject === "reading" ? 3600 : 2400}
          questions={mockQuestionStates}
          onSubmit={() => void submitActiveMock()}
        >
          {activeMock.subject === "reading" ? (
            <ReadingExamView
              passageTitle={activeQuestions[0]?.passageTitle ?? "Reading passage"}
              passageText={
                activeQuestions[0]?.passageText ??
                "Use the imported local passage asset for close reading. Structured passage text will appear here when the source provides it."
              }
              highlightedText={activeQuestions[0]?.passageText ? undefined : "Structured passage text"}
              questions={mockQuestionList}
            />
          ) : (
            <ListeningExamView
              mode="mock"
              audioDurationSeconds={activeQuestions[0]?.audioDurationSeconds}
              audioPath={activeQuestions[0]?.audioPath}
              audioTitle={activeQuestions[0]?.passageTitle ?? "Listening section audio"}
              sections={[
                {
                  id: "local-listening",
                  title: activeQuestions[0]?.part ?? "Section",
                  questions: mockQuestionList
                }
              ]}
              finalReviewSeconds={120}
            />
          )}
        </ExamShell>
      ) : null}
      {scoreReport && activeMock ? (
        <ScoreReport
          subject={activeMock.subject}
          rawScore={scoreReport.rawScore}
          estimatedBand={scoreReport.estimatedBand}
        />
      ) : null}
      {mockReview?.reviewItems.length ? (
        <section className="mock-review-panel" aria-label="Mock review details">
          <div>
            <p className="eyebrow">Review</p>
            <h3>Answer evidence and explanations</h3>
          </div>
          <ol className="mock-review-list">
            {mockReview.reviewItems.map((item) => (
              <li key={item.questionId}>
                <div className="mock-review-heading">
                  <span>{item.isCorrect ? "Correct" : "Incorrect"}</span>
                  <strong>
                    {item.questionNumber ?? "Question"} {item.prompt ?? "Review question"}
                  </strong>
                </div>
                <p>Your answer: {item.rawAnswer || "No answer"}</p>
                <p>Accepted: {item.acceptedAnswers.join(", ") || "Not configured"}</p>
                <div className="answer-sentence-preview">{renderReviewEvidence(item)}</div>
                {item.explanation ? <p>{item.explanation}</p> : null}
                {item.synonyms.length > 0 ? (
                  <ul className="mock-review-synonyms">
                    {item.synonyms.map((synonym) => (
                      <li key={synonym}>{synonym}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
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
