import { useState } from "react";

export interface CueDraft {
  startSeconds: number;
  endSeconds: number;
  label: string;
  transcript: string;
}

export interface CueEditorProps {
  onSave: (cue: CueDraft) => void;
}

export function CueEditor({ onSave }: CueEditorProps) {
  const [label, setLabel] = useState("");
  const [startSeconds, setStartSeconds] = useState("0");
  const [endSeconds, setEndSeconds] = useState("0");
  const [transcript, setTranscript] = useState("");

  return (
    <form
      className="cue-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          label,
          startSeconds: Number.parseFloat(startSeconds),
          endSeconds: Number.parseFloat(endSeconds),
          transcript
        });
      }}
    >
      <label>
        Cue label
        <input aria-label="Cue label" value={label} onChange={(event) => setLabel(event.target.value)} />
      </label>
      <label>
        Start time
        <input
          aria-label="Start time"
          inputMode="decimal"
          value={startSeconds}
          onChange={(event) => setStartSeconds(event.target.value)}
        />
      </label>
      <label>
        End time
        <input
          aria-label="End time"
          inputMode="decimal"
          value={endSeconds}
          onChange={(event) => setEndSeconds(event.target.value)}
        />
      </label>
      <label>
        Transcript
        <textarea
          aria-label="Transcript"
          rows={3}
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
        />
      </label>
      <button type="submit">Save cue</button>
    </form>
  );
}
