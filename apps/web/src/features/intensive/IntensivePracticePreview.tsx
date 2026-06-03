import { CloseReadingView } from "./CloseReadingView";
import { CueEditor } from "./CueEditor";
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
  } | null;
  reading: {
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

export function IntensivePracticePreview({ preview }: { preview?: IntensiveStudyPreviewView }) {
  const listening = preview?.listening
    ? {
        audioTitle: preview.listening.audioTitle,
        cues: normalizeCues(preview.listening.cues)
      }
    : {
        audioTitle: "Listening Part 1 Review",
        cues: sampleCues
      };
  const reading = preview?.reading ?? sampleReading;

  return (
    <section className="intensive-preview-band" aria-label="Intensive practice preview">
      <div className="intensive-preview-grid">
        <div className="intensive-preview-column">
          <IntensiveListeningPlayer
            audioTitle={listening.audioTitle}
            cues={listening.cues}
            onDictationSubmit={() => undefined}
          />
          <CueEditor onSave={() => undefined} />
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
          onMistakeLabel={() => undefined}
        />
      </div>
    </section>
  );
}
