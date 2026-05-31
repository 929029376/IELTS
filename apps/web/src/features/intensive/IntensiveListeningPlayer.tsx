import { useState } from "react";

export interface ListeningCue {
  id: string;
  startSeconds: number;
  endSeconds: number;
  label: string;
  transcript?: string | null;
}

export interface IntensiveListeningPlayerProps {
  audioTitle: string;
  cues: ListeningCue[];
  onDictationSubmit: (input: { cueId: string; userText: string }) => void;
}

export function IntensiveListeningPlayer({
  audioTitle,
  cues,
  onDictationSubmit
}: IntensiveListeningPlayerProps) {
  const [activeCueId, setActiveCueId] = useState(cues[0]?.id ?? "");
  const [dictationText, setDictationText] = useState("");
  const activeCue = cues.find((cue) => cue.id === activeCueId) ?? cues[0];

  return (
    <section className="intensive-listening-player" aria-label="Intensive listening player">
      <header>
        <p className="player-label">Intensive listening</p>
        <h3>{audioTitle}</h3>
      </header>
      <div className="practice-audio-controls">
        <button type="button">Play/Pause</button>
        <button type="button">Seek</button>
        <button type="button">Speed</button>
        <button type="button">Set A point</button>
        <button type="button">Set B point</button>
      </div>

      {cues.length > 0 ? (
        <div className="cue-repeat-list" aria-label="Sentence repeat controls">
          {cues.map((cue) => (
            <button key={cue.id} type="button" onClick={() => setActiveCueId(cue.id)}>
              Repeat {cue.label}
            </button>
          ))}
        </div>
      ) : (
        <p>No sentence cues yet. Use A-B repeat or create a cue.</p>
      )}

      <label className="dictation-label">
        Dictation
        <textarea
          aria-label="Dictation input"
          rows={4}
          value={dictationText}
          onChange={(event) => setDictationText(event.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={!activeCue}
        onClick={() => activeCue && onDictationSubmit({ cueId: activeCue.id, userText: dictationText })}
      >
        Submit dictation
      </button>
      {activeCue?.transcript ? <p className="transcript-preview">{activeCue.transcript}</p> : null}
    </section>
  );
}
