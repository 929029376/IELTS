import { useState } from "react";
import { CloseReadingView } from "./CloseReadingView";
import { CueEditor, type CueDraft } from "./CueEditor";
import { IntensiveListeningPlayer } from "./IntensiveListeningPlayer";

export interface IntensiveStudyPreviewView {
  listening: {
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
    answerSentence: string | null;
    explanation: string | null;
    keywords: string[];
    passageText: string;
    passageTitle: string;
    questionPrompt: string;
    synonyms: string[];
  } | null;
}

const sampleCues = [
  {
    id: "sample-cue-1",
    startSeconds: 12.5,
    endSeconds: 16.2,
    label: "Sentence 1",
    transcript: "The booking is under Green Park."
  }
];

const sampleReading = {
  attemptAnswerId: null,
  answerSentence: "answer sentence",
  explanation: "The sentence directly supports the answer.",
  keywords: ["trade routes"],
  passageText: "Tea travelled along trade routes. The answer sentence identifies the key evidence.",
  passageTitle: "Reading intensive review",
  questionPrompt: "Question 1: Choose the best evidence.",
  synonyms: ["evidence", "proof"]
};

function normalizeCues(cues: NonNullable<IntensiveStudyPreviewView["listening"]>["cues"]) {
  return cues.map((cue, index) => ({
    ...cue,
    label: cue.label?.trim() || `Sentence ${index + 1}`
  }));
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
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
  const [savedCues, setSavedCues] = useState<NonNullable<IntensiveStudyPreviewView["listening"]>["cues"]>([]);

  const listening = preview?.listening
    ? {
        audioTitle: preview.listening.audioTitle,
        cues: normalizeCues([...preview.listening.cues, ...savedCues]),
        passageId: preview.listening.passageId
      }
    : {
        audioTitle: "Listening Part 1 Review",
        cues: normalizeCues([...sampleCues, ...savedCues]),
        passageId: undefined
      };
  const reading = preview?.reading ?? sampleReading;

  async function saveCue(cue: CueDraft) {
    if (!listening.passageId) {
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
    if (!reading.attemptAnswerId) {
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

  return (
    <section className="intensive-preview-band" aria-label="Intensive practice preview">
      <div className="intensive-preview-grid">
        <div className="intensive-preview-column">
          <IntensiveListeningPlayer
            audioTitle={listening.audioTitle}
            cues={listening.cues}
            onDictationSubmit={(input) => {
              void submitDictation(input);
            }}
          />
          {dictationStatus ? <p className="import-status">{dictationStatus}</p> : null}
          <CueEditor
            onSave={(cue) => {
              void saveCue(cue);
            }}
          />
          {cueStatus ? <p className="import-status">{cueStatus}</p> : null}
        </div>
        <CloseReadingView
          passageText={reading.passageText}
          answerSentence={reading.answerSentence ?? ""}
          keywords={reading.keywords}
          synonyms={reading.synonyms}
          explanation={reading.explanation ?? "No explanation recorded yet."}
          question={<p>{reading.questionPrompt}</p>}
          isWrongAnswer
          onSelectAnswerSentence={() => undefined}
          onMistakeLabel={(label) => {
            void saveMistakeLabel(label);
          }}
        />
        {mistakeStatus ? <p className="import-status">{mistakeStatus}</p> : null}
      </div>
    </section>
  );
}
