import { useState } from "react";
import { Flag } from "lucide-react";
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
  mode: "mock" | "practice";
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

interface MockReviewConflict {
  id: string;
  questionId: string;
  remoteCreatedAt: string;
  remoteDeviceId: string;
  remoteIsCorrect: boolean;
  remoteRawAnswer: string;
  status: "conflict" | "resolved";
}

interface MockReview {
  conflicts?: MockReviewConflict[];
  id: string;
  reviewItems: MockReviewItem[];
}

interface MockQuestionGroup {
  id: string;
  part: string;
  title: string;
  questions: StartedMockQuestion[];
}

interface ExamPreviewProps {
  onMockSubmitted?: () => void;
}

interface PracticeFilters {
  frequencyClass: "all" | "high" | "medium" | "low" | "unknown";
  mistakeLabel: string;
  part: "all" | "P1" | "P2" | "P3" | "P4";
  questionType: "all" | QuestionType;
}

const defaultPracticeFilters: PracticeFilters = {
  frequencyClass: "all",
  mistakeLabel: "",
  part: "all",
  questionType: "all"
};

function buildStartPayload(
  mode: "mock" | "practice",
  subject: "listening" | "reading",
  filters: PracticeFilters
) {
  if (mode === "mock") {
    return { mode, subject };
  }

  const payload: Record<string, string> = {};
  if (filters.frequencyClass !== "all") {
    payload.frequencyClass = filters.frequencyClass;
  }
  if (filters.mistakeLabel.trim()) {
    payload.mistakeLabel = filters.mistakeLabel.trim();
  }
  payload.mode = mode;
  if (filters.part !== "all") {
    payload.part = filters.part;
  }
  if (filters.questionType !== "all") {
    payload.questionType = filters.questionType;
  }
  payload.subject = subject;
  return payload;
}

async function startAttempt(
  mode: "mock" | "practice",
  subject: "listening" | "reading",
  filters: PracticeFilters
): Promise<StartedMock> {
  const response = await fetch("/api/practice/start", {
    body: JSON.stringify(buildStartPayload(mode, subject, filters)),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Could not start ${subject} ${mode}`);
  }

  const started = (await response.json()) as Omit<StartedMock, "mode" | "subject">;
  return { ...started, mode, subject };
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

function findPdfAssetPath(question?: StartedMockQuestion): string | null {
  return question?.assetPaths?.find((path) => path.toLowerCase().endsWith(".pdf")) ?? null;
}

function conflictsForQuestion(review: MockReview, questionId: string): MockReviewConflict[] {
  return review.conflicts?.filter((conflict) => conflict.questionId === questionId && conflict.status === "conflict") ?? [];
}

function groupQuestionsByPassage(questions: StartedMockQuestion[]): MockQuestionGroup[] {
  return questions.reduce<MockQuestionGroup[]>((groups, question) => {
    const existing = groups.find((group) => group.id === question.passageId);
    if (existing) {
      existing.questions.push(question);
      return groups;
    }

    groups.push({
      id: question.passageId,
      part: question.part,
      questions: [question],
      title: question.passageTitle
    });
    return groups;
  }, []);
}

function groupLabel(group: MockQuestionGroup): string {
  return `${group.part} ${group.title}`;
}

export function ExamPreview({ onMockSubmitted }: ExamPreviewProps) {
  const [activeMock, setActiveMock] = useState<StartedMock | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<string, boolean>>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [practiceFilters, setPracticeFilters] = useState<PracticeFilters>(defaultPracticeFilters);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mockReview, setMockReview] = useState<MockReview | null>(null);
  const [scoreReport, setScoreReport] = useState<MockSubmitResult | null>(null);
  const [submittedReason, setSubmittedReason] = useState<string | null>(null);

  async function handleStartAttempt(mode: "mock" | "practice", subject: "listening" | "reading") {
    setIsStarting(true);
    setStartError(null);
    setSubmitError(null);
    setMockReview(null);
    setScoreReport(null);
    setAnswers({});
    setMarkedQuestions({});
    setActiveGroupId(null);
    setActiveQuestionId(null);
    try {
      const started = await startAttempt(mode, subject, practiceFilters);
      setActiveMock(started);
      setActiveGroupId(started.questions[0]?.passageId ?? null);
      setActiveQuestionId(started.questions[0]?.id ?? null);
    } catch {
      setStartError(`Could not start ${subjectLabel(subject)} ${mode} from the local question bank.`);
    } finally {
      setIsStarting(false);
    }
  }

  async function saveMockAnswer(questionId: string) {
    if (!activeMock) {
      return;
    }

    const rawAnswer = answers[questionId] ?? "";
    const response = await fetch(`/api/practice/${activeMock.attemptId}/answer`, {
      body: JSON.stringify({
        markedForReview: Boolean(markedQuestions[questionId]),
        questionId,
        rawAnswer,
        timeSpentSeconds: 0
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    if (!response.ok) {
      throw new Error("Could not save mock answer");
    }
  }

  async function submitActiveMock() {
    if (!activeMock || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await Promise.all(activeQuestions.map((question) => saveMockAnswer(question.id)));
      const response = await fetch(`/api/practice/${activeMock.attemptId}/submit`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Could not submit mock");
      }
      setScoreReport((await response.json()) as MockSubmitResult);
      onMockSubmitted?.();
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

  function selectQuestion(questionNumber: number) {
    const question = activeQuestions.find((candidate) => candidate.questionNumber === questionNumber);
    if (!question) {
      return;
    }

    setActiveGroupId(question.passageId);
    setActiveQuestionId(question.id);
  }

  function selectGroup(group: MockQuestionGroup) {
    setActiveGroupId(group.id);
    setActiveQuestionId(group.questions[0]?.id ?? null);
  }

  const activeQuestions = activeMock?.questions ?? [];
  const questionGroups = groupQuestionsByPassage(activeQuestions);
  const activeGroup = questionGroups.find((group) => group.id === activeGroupId) ?? questionGroups[0];
  const activeGroupQuestions = activeGroup?.questions ?? [];
  const currentQuestionId = activeQuestionId ?? activeGroupQuestions[0]?.id;
  const mockQuestionStates = activeQuestions.map((question, index) => ({
    questionNumber: question.questionNumber,
    answered: Boolean((answers[question.id] ?? "").trim()),
    markedForReview: Boolean(markedQuestions[question.id]),
    current:
      (currentQuestionId ? question.id === currentQuestionId : index === 0) &&
      !markedQuestions[question.id]
  }));
  const renderMockQuestionList = (questions: StartedMockQuestion[]) => (
    <div className="local-mock-questions">
      {questions.map((question) => (
        <div className="local-mock-question-card" key={question.id}>
          <span>{question.part}</span>
          <strong>
            {question.questionNumber}. {question.prompt}
          </strong>
          <AnswerInput
            questionId={question.id}
            questionType={question.questionType as QuestionType}
            value={answers[question.id] ?? ""}
            onBlur={() => {
              void saveMockAnswer(question.id).catch(() => {
                setSubmitError("Could not save the local mock answer.");
              });
            }}
            onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
          />
          <button
            aria-pressed={Boolean(markedQuestions[question.id])}
            className="question-mark-button"
            onClick={() =>
              setMarkedQuestions((current) => ({
                ...current,
                [question.id]: !current[question.id]
              }))
            }
            type="button"
          >
            <Flag size={15} aria-hidden="true" />
            {markedQuestions[question.id]
              ? `Unmark question ${question.questionNumber}`
              : `Mark question ${question.questionNumber} for review`}
          </button>
        </div>
      ))}
    </div>
  );
  const activeReadingQuestion = activeGroupQuestions[0] ?? activeQuestions[0];

  return (
    <section className="exam-preview-band" aria-label="IELTS-style exam preview">
      <div className="mock-start-panel" aria-label="Mock exam starter">
        <div>
          <p className="eyebrow">Mock exam center</p>
          <h2>Start from local question bank</h2>
        </div>
        <div className="practice-filter-grid" aria-label="Practice filters">
          <label>
            <span>Practice part</span>
            <select
              aria-label="Practice part"
              onChange={(event) =>
                setPracticeFilters((current) => ({ ...current, part: event.target.value as PracticeFilters["part"] }))
              }
              value={practiceFilters.part}
            >
              <option value="all">All parts</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
          </label>
          <label>
            <span>Practice frequency</span>
            <select
              aria-label="Practice frequency"
              onChange={(event) =>
                setPracticeFilters((current) => ({
                  ...current,
                  frequencyClass: event.target.value as PracticeFilters["frequencyClass"]
                }))
              }
              value={practiceFilters.frequencyClass}
            >
              <option value="all">All frequencies</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            <span>Practice question type</span>
            <select
              aria-label="Practice question type"
              onChange={(event) =>
                setPracticeFilters((current) => ({
                  ...current,
                  questionType: event.target.value as PracticeFilters["questionType"]
                }))
              }
              value={practiceFilters.questionType}
            >
              <option value="all">All question types</option>
              <option value="fill_blank">Fill blank</option>
              <option value="single_choice">Single choice</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="matching">Matching</option>
              <option value="true_false_not_given">True/false/not given</option>
              <option value="yes_no_not_given">Yes/no/not given</option>
              <option value="short_answer">Short answer</option>
              <option value="table_completion">Table completion</option>
              <option value="form_completion">Form completion</option>
              <option value="flow_completion">Flow completion</option>
              <option value="map_label">Map label</option>
            </select>
          </label>
          <label>
            <span>Practice mistake label</span>
            <input
              aria-label="Practice mistake label"
              onChange={(event) =>
                setPracticeFilters((current) => ({ ...current, mistakeLabel: event.target.value }))
              }
              placeholder="定位失败"
              value={practiceFilters.mistakeLabel}
            />
          </label>
        </div>
        <div className="mock-start-actions">
          <button disabled={isStarting} onClick={() => void handleStartAttempt("mock", "reading")} type="button">
            Start reading mock
          </button>
          <button disabled={isStarting} onClick={() => void handleStartAttempt("mock", "listening")} type="button">
            Start listening mock
          </button>
          <button disabled={isStarting} onClick={() => void handleStartAttempt("practice", "reading")} type="button">
            Start reading practice
          </button>
          <button disabled={isStarting} onClick={() => void handleStartAttempt("practice", "listening")} type="button">
            Start listening practice
          </button>
        </div>
      </div>
      {activeMock ? (
        <section className="loaded-mock-panel" aria-label={`Loaded local ${activeMock.mode} set`}>
          <div>
            <p className="eyebrow">Attempt {activeMock.attemptId}</p>
            <h3>
              Loaded local {activeMock.subject} {activeMock.mode}
            </h3>
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
            Submit local {activeMock.mode}
          </button>
        </section>
      ) : null}
      {startError ? <p className="mock-start-error">{startError}</p> : null}
      {submitError ? <p className="mock-start-error">{submitError}</p> : null}
      {activeMock && activeQuestions.length > 0 ? (
        <ExamShell
          title={`${activeMock.subject === "reading" ? "Reading" : "Listening"} Local ${
            activeMock.mode === "mock" ? "Mock Test" : "Practice"
          }`}
          durationSeconds={activeMock.subject === "reading" ? 3600 : 2400}
          questions={mockQuestionStates}
          onSubmit={() => void submitActiveMock()}
          onSelectQuestion={selectQuestion}
          submitLabel={activeMock.mode === "mock" ? "Submit test" : "Submit practice"}
        >
          {activeMock.subject === "reading" ? (
            <>
              {questionGroups.length > 1 ? (
                <div className="section-tabs reading-part-tabs" role="tablist" aria-label="Reading passages">
                  {questionGroups.map((group) => (
                    <button
                      aria-selected={group.id === activeGroup?.id}
                      key={group.id}
                      onClick={() => selectGroup(group)}
                      role="tab"
                      type="button"
                    >
                      {groupLabel(group)}
                    </button>
                  ))}
                </div>
              ) : null}
              <ReadingExamView
                passageTitle={activeReadingQuestion?.passageTitle ?? "Reading passage"}
                passageText={
                  activeReadingQuestion?.passageText ??
                  "Use the imported local passage asset for close reading. Structured passage text will appear here when the source provides it."
                }
                pdfPath={findPdfAssetPath(activeReadingQuestion)}
                highlightedText={activeReadingQuestion?.passageText ? undefined : "Structured passage text"}
                questions={renderMockQuestionList(activeGroupQuestions)}
              />
            </>
          ) : (
            <ListeningExamView
              mode="mock"
              audioDurationSeconds={activeGroupQuestions[0]?.audioDurationSeconds}
              audioPath={activeGroupQuestions[0]?.audioPath}
              audioTitle={activeGroupQuestions[0]?.passageTitle ?? "Listening section audio"}
              sections={questionGroups.map((group) => ({
                audioDurationSeconds: group.questions[0]?.audioDurationSeconds,
                audioPath: group.questions[0]?.audioPath,
                audioTitle: group.questions[0]?.passageTitle,
                id: group.id,
                questions: renderMockQuestionList(group.questions),
                title: groupLabel(group)
              }))}
              finalReviewSeconds={120}
              onActiveSectionChange={(sectionId) => {
                const group = questionGroups.find((candidate) => candidate.id === sectionId);
                if (group) {
                  selectGroup(group);
                }
              }}
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
                {conflictsForQuestion(mockReview, item.questionId).length > 0 ? (
                  <div className="sync-conflict-review" aria-label={`Sync conflicts for question ${item.questionId}`}>
                    <strong>Sync conflict</strong>
                    <ul>
                      {conflictsForQuestion(mockReview, item.questionId).map((conflict) => (
                        <li key={conflict.id}>
                          Remote answer from {conflict.remoteDeviceId}: {conflict.remoteRawAnswer}
                        </li>
                      ))}
                    </ul>
                  </div>
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
