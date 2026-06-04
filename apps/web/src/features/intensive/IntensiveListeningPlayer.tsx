import { useRef, useState } from "react";

export interface ListeningCue {
  id: string;
  startSeconds: number;
  endSeconds: number;
  label: string;
  transcript?: string | null;
}

export interface IntensiveListeningPlayerProps {
  audioPath?: string | null;
  audioTitle: string;
  cues: ListeningCue[];
  onDictationSubmit: (input: { cueId: string; userText: string }) => void;
}

export function IntensiveListeningPlayer({
  audioPath,
  audioTitle,
  cues,
  onDictationSubmit
}: IntensiveListeningPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeCueId, setActiveCueId] = useState(cues[0]?.id ?? "");
  const [loopRange, setLoopRange] = useState<{ endSeconds: number; startSeconds: number } | null>(null);
  const [aPoint, setAPoint] = useState<number | null>(null);
  const [dictationText, setDictationText] = useState("");
  const activeCue = cues.find((cue) => cue.id === activeCueId) ?? cues[0];

  function localAssetUrl(path: string): string {
    return `/api/assets/local?path=${encodeURIComponent(path)}`;
  }

  function playAudio() {
    void audioRef.current?.play();
  }

  function playFrom(seconds: number) {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.currentTime = seconds;
    playAudio();
  }

  function repeatCue(cue: ListeningCue) {
    setActiveCueId(cue.id);
    setLoopRange({ endSeconds: cue.endSeconds, startSeconds: cue.startSeconds });
    playFrom(cue.startSeconds);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      playAudio();
    } else {
      audio.pause();
    }
  }

  function setBPoint() {
    const audio = audioRef.current;
    if (!audio || aPoint === null || audio.currentTime <= aPoint) {
      return;
    }

    setLoopRange({ endSeconds: audio.currentTime, startSeconds: aPoint });
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !loopRange || audio.currentTime < loopRange.endSeconds) {
      return;
    }

    audio.currentTime = loopRange.startSeconds;
    playAudio();
  }

  return (
    <section className="intensive-listening-player" aria-label="Intensive listening player">
      <header>
        <p className="player-label">Intensive listening</p>
        <h3>{audioTitle}</h3>
      </header>
      {audioPath ? (
        <audio
          aria-label="Intensive listening audio"
          controls
          onTimeUpdate={handleTimeUpdate}
          preload="metadata"
          ref={audioRef}
          src={localAssetUrl(audioPath)}
        />
      ) : null}
      <div className="practice-audio-controls">
        <button type="button" onClick={togglePlay}>
          Play/Pause
        </button>
        <button type="button" onClick={() => playFrom(activeCue?.startSeconds ?? 0)}>
          Seek
        </button>
        <button
          type="button"
          onClick={() => {
            const audio = audioRef.current;
            if (audio) {
              audio.playbackRate = audio.playbackRate === 1 ? 0.85 : 1;
            }
          }}
        >
          Speed
        </button>
        <button type="button" onClick={() => setAPoint(audioRef.current?.currentTime ?? 0)}>
          Set A point
        </button>
        <button type="button" onClick={setBPoint}>
          Set B point
        </button>
      </div>

      {cues.length > 0 ? (
        <div className="cue-repeat-list" aria-label="Sentence repeat controls">
          {cues.map((cue) => (
            <button key={cue.id} type="button" onClick={() => repeatCue(cue)}>
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
