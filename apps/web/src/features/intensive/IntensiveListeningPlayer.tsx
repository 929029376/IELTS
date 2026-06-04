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

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

function formatPlaybackRate(rate: number): string {
  return rate.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
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
  const [playbackRate, setPlaybackRate] = useState(1);
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

  function setAPointAtCurrentTime() {
    const nextPoint = audioRef.current?.currentTime ?? 0;
    setAPoint(nextPoint);
    setLoopRange(null);
  }

  function clearLoop() {
    setAPoint(null);
    setLoopRange(null);
  }

  function toggleSpeed() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const nextRate = audio.playbackRate === 1 ? 0.85 : 1;
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }

  function submitDictation() {
    if (!activeCue) {
      return;
    }

    onDictationSubmit({ cueId: activeCue.id, userText: dictationText });
    setDictationText("");
  }

  const loopStatus = loopRange
    ? `A-B loop: ${formatSeconds(loopRange.startSeconds)} to ${formatSeconds(loopRange.endSeconds)}`
    : aPoint !== null
      ? `A point set at ${formatSeconds(aPoint)}`
      : null;

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
        <button type="button" onClick={toggleSpeed}>
          Speed: {formatPlaybackRate(playbackRate)}x
        </button>
        <button type="button" onClick={setAPointAtCurrentTime}>
          Set A point
        </button>
        <button type="button" onClick={setBPoint}>
          Set B point
        </button>
        {loopRange || aPoint !== null ? (
          <button type="button" onClick={clearLoop}>
            Clear loop
          </button>
        ) : null}
      </div>
      {loopStatus ? <p className="loop-status">{loopStatus}</p> : null}

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
        onClick={submitDictation}
      >
        Submit dictation
      </button>
      {activeCue?.transcript ? <p className="transcript-preview">{activeCue.transcript}</p> : null}
    </section>
  );
}
