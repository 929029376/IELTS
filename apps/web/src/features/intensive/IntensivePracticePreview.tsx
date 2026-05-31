import { CloseReadingView } from "./CloseReadingView";
import { CueEditor } from "./CueEditor";
import { IntensiveListeningPlayer } from "./IntensiveListeningPlayer";

const sampleCues = [
  {
    id: "sample-cue-1",
    startSeconds: 12.5,
    endSeconds: 16.2,
    label: "Sentence 1",
    transcript: "The booking is under Green Park."
  }
];

export function IntensivePracticePreview() {
  return (
    <section className="intensive-preview-band" aria-label="Intensive practice preview">
      <div className="intensive-preview-grid">
        <div className="intensive-preview-column">
          <IntensiveListeningPlayer
            audioTitle="Listening Part 1 Review"
            cues={sampleCues}
            onDictationSubmit={() => undefined}
          />
          <CueEditor onSave={() => undefined} />
        </div>
        <CloseReadingView
          passageText="Tea travelled along trade routes. The answer sentence identifies the key evidence."
          answerSentence="answer sentence"
          keywords={["trade routes"]}
          synonyms={["evidence", "proof"]}
          explanation="The sentence directly supports the answer."
          question={<p>Question 1: Choose the best evidence.</p>}
          isWrongAnswer
          onSelectAnswerSentence={() => undefined}
          onMistakeLabel={() => undefined}
        />
      </div>
    </section>
  );
}
