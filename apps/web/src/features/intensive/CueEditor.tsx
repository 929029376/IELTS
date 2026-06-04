import { useEffect, useState } from "react";

export interface CueDraft {
  startSeconds: number;
  endSeconds: number;
  label: string;
  transcript: string;
}

type CueInitialValue = Omit<CueDraft, "transcript"> & { transcript?: string | null };

export interface CueEditorProps {
  initialCue?: CueInitialValue | null;
  onSave: (cue: CueDraft) => void;
  submitLabel?: string;
}

export function CueEditor({ initialCue = null, onSave, submitLabel = "Save cue" }: CueEditorProps) {
  const [label, setLabel] = useState(initialCue?.label ?? "");
  const [startSeconds, setStartSeconds] = useState(String(initialCue?.startSeconds ?? 0));
  const [endSeconds, setEndSeconds] = useState(String(initialCue?.endSeconds ?? 0));
  const [transcript, setTranscript] = useState(initialCue?.transcript ?? "");

  useEffect(() => {
    setLabel(initialCue?.label ?? "");
    setStartSeconds(String(initialCue?.startSeconds ?? 0));
    setEndSeconds(String(initialCue?.endSeconds ?? 0));
    setTranscript(initialCue?.transcript ?? "");
  }, [initialCue]);

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
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
