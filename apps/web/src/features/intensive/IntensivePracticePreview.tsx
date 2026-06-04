import { useState } from "react";
import { CloseReadingView } from "./CloseReadingView";
import { CueEditor, type CueDraft } from "./CueEditor";
import { IntensiveListeningPlayer } from "./IntensiveListeningPlayer";

export interface IntensiveStudyPreviewView {
  listening: {
    audioPath?: string | null;
    audioTitle: string;
    cues: Array<{
      endSeconds: number;
      id: string;
      label: string | null;
      startSeconds: number;
      transcript: string | null;
    }>;
    passageId?: string;
  } | null;
  reading: {
    attemptAnswerId?: string | null;
    answerKeyId?: string | null;
    answerSentence: string | null;
    explanation: string | null;
    keywords: string[];
    passageText: string;
    passageTitle: string;
    questionPrompt: string;
    synonyms: string[];
  } | null;
}

function normalizeCues(cues: NonNullable<IntensiveStudyPreviewView["listening"]>["cues"]) {
  return cues.map((cue, index) => ({
    ...cue,
    label: cue.label?.trim() || `Sentence ${index + 1}`
  }));
}

function mergeCues(
  sourceCues: NonNullable<IntensiveStudyPreviewView["listening"]>["cues"],
  changedCues: NonNullable<IntensiveStudyPreviewView["listening"]>["cues"]
) {
  const merged = new Map(sourceCues.map((cue) => [cue.id, cue]));
  changedCues.forEach((cue) => merged.set(cue.id, cue));
  return [...merged.values()];
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  return writeJson(path, payload, "POST");
}

async function writeJson<T>(path: string, payload: Record<string, unknown>, method: "POST" | "PUT"): Promise<T> {
  const response = await fetch(path, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

interface DictationAttemptView {
  isCorrect: boolean | null;
}

export function IntensivePracticePreview({ preview }: { preview?: IntensiveStudyPreviewView }) {
  const [cueStatus, setCueStatus] = useState<string | null>(null);
  const [dictationStatus, setDictationStatus] = useState<string | null>(null);
  const [mistakeStatus, setMistakeStatus] = useState<string | null>(null);
  const [answerSentenceStatus, setAnswerSentenceStatus] = useState<string | null>(null);
  const [savedAnswerSentence, setSavedAnswerSentence] = useState<string | null>(null);
  const [savedCues, setSavedCues] = useState<NonNullable<IntensiveStudyPreviewView["listening"]>["cues"]>([]);
  const [editingCue, setEditingCue] = useState<ReturnType<typeof normalizeCues>[number] | null>(null);

  const listening = preview?.listening
    ? {
        audioPath: preview.listening.audioPath ?? null,
        audioTitle: preview.listening.audioTitle,
        cues: normalizeCues(mergeCues(preview.listening.cues, savedCues)),
        passageId: preview.listening.passageId
      }
    : null;
  const reading = preview?.reading ?? null;
  const answerSentence = savedAnswerSentence ?? reading?.answerSentence ?? "";

  async function saveCue(cue: CueDraft) {
    if (!listening?.passageId) {
      setCueStatus("Load a local listening passage before saving cues.");
      return;
    }

    try {
      const savedCue = await postJson<NonNullable<IntensiveStudyPreviewView["listening"]>["cues"][number]>(
        "/api/study/listening-cues",
        {
          endSeconds: cue.endSeconds,
          label: cue.label,
          passageId: listening.passageId,
          startSeconds: cue.startSeconds,
          transcript: cue.transcript
        }
      );
      setSavedCues((cues) => [...cues, savedCue]);
      setCueStatus("Cue saved for sentence repeat.");
    } catch {
      setCueStatus("Could not save cue.");
    }
  }

  async function updateCue(cue: CueDraft) {
    if (!editingCue) {
      return;
    }

    try {
      const savedCue = await writeJson<NonNullable<IntensiveStudyPreviewView["listening"]>["cues"][number]>(
        `/api/study/listening-cues/${editingCue.id}`,
        {
          endSeconds: cue.endSeconds,
          label: cue.label,
          startSeconds: cue.startSeconds,
          transcript: cue.transcript
        },
        "PUT"
      );
      setSavedCues((cues) => mergeCues(cues, [savedCue]));
      setEditingCue(null);
      setCueStatus("Cue updated for sentence repeat.");
    } catch {
      setCueStatus("Could not update cue.");
    }
  }

  async function submitDictation(input: { cueId: string; userText: string }) {
    try {
      const attempt = await postJson<DictationAttemptView>("/api/study/dictation-attempts", input);
      if (attempt.isCorrect === null) {
        setDictationStatus("Dictation saved.");
      } else {
        setDictationStatus(attempt.isCorrect ? "Dictation correct." : "Dictation needs review.");
      }
    } catch {
      setDictationStatus("Could not save dictation.");
    }
  }

  async function saveMistakeLabel(label: string) {
    if (!reading?.attemptAnswerId) {
      setMistakeStatus("Load a wrong local answer before saving mistake labels.");
      return;
    }

    try {
      await postJson<{ label: string }>("/api/study/mistake-labels", {
        attemptAnswerId: reading.attemptAnswerId,
        label
      });
      setMistakeStatus(`Mistake label saved: ${label}.`);
    } catch {
      setMistakeStatus("Could not save mistake label.");
    }
  }

  async function saveSelectedAnswerSentence() {
    const selectedText = window.getSelection?.()?.toString().trim() ?? "";
    if (!selectedText) {
      setAnswerSentenceStatus("Select passage text before saving answer evidence.");
      return;
    }
    if (!reading?.answerKeyId) {
      setAnswerSentenceStatus("Load a local answer key before saving answer evidence.");
      return;
    }

    try {
      const saved = await postJson<{ answerKeyId: string; answerSentence: string }>("/api/study/answer-sentence", {
        answerKeyId: reading.answerKeyId,
        answerSentence: selectedText
      });
      setSavedAnswerSentence(saved.answerSentence);
      setAnswerSentenceStatus("Answer evidence saved.");
    } catch {
      setAnswerSentenceStatus("Could not save answer evidence.");
    }
  }

  return (
    <section className="intensive-preview-band" aria-label="Intensive practice preview">
      <div className="intensive-preview-grid">
        <div className="intensive-preview-column">
          {listening ? (
            <>
              <IntensiveListeningPlayer
                audioPath={listening.audioPath}
                audioTitle={listening.audioTitle}
                cues={listening.cues}
                onDictationSubmit={(input) => {
                  void submitDictation(input);
                }}
              />
              {listening.cues.length > 0 ? (
                <div className="cue-edit-list" aria-label="Cue edit controls">
                  {listening.cues.map((cue) => (
                    <button key={cue.id} type="button" onClick={() => setEditingCue(cue)}>
                      Edit {cue.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {dictationStatus ? <p className="import-status">{dictationStatus}</p> : null}
              <CueEditor
                initialCue={editingCue}
                onSave={(cue) => {
                  if (editingCue) {
                    void updateCue(cue);
                  } else {
                    void saveCue(cue);
                  }
                }}
                submitLabel={editingCue ? "Update cue" : "Save cue"}
              />
            </>
          ) : (
            <section className="empty-state" aria-label="No local listening passage">
              No local listening passage
            </section>
          )}
          {cueStatus ? <p className="import-status">{cueStatus}</p> : null}
        </div>
        {reading ? (
          <CloseReadingView
            passageText={reading.passageText}
            answerSentence={answerSentence}
            keywords={reading.keywords}
            synonyms={reading.synonyms}
            explanation={reading.explanation ?? "No explanation recorded yet."}
            question={<p>{reading.questionPrompt}</p>}
            isWrongAnswer
            onSelectAnswerSentence={() => {
              void saveSelectedAnswerSentence();
            }}
            onMistakeLabel={(label) => {
              void saveMistakeLabel(label);
            }}
          />
        ) : (
          <section className="empty-state" aria-label="No local reading passage">
            No local reading passage
          </section>
        )}
        {answerSentenceStatus ? <p className="import-status">{answerSentenceStatus}</p> : null}
        {mistakeStatus ? <p className="import-status">{mistakeStatus}</p> : null}
      </div>
    </section>
  );
}
