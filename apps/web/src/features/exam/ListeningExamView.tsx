import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { formatTimer } from "./questionNav";

export interface ListeningSection {
  audioDurationSeconds?: number | null;
  audioPath?: string | null;
  audioTitle?: string | null;
  id: string;
  title: string;
  questions: ReactNode;
}

export interface ListeningExamViewProps {
  audioDurationSeconds?: number | null;
  audioPath?: string | null;
  activeSectionId?: string | null;
  mode: "mock" | "practice";
  audioTitle: string;
  sections: ListeningSection[];
  finalReviewSeconds: number;
  onActiveSectionChange?: (sectionId: string) => void;
}

function localAssetUrl(path: string): string {
  return `/api/assets/local?path=${encodeURIComponent(path)}`;
}

function nextPlaybackRate(currentRate: number): number {
  if (currentRate < 1.25) {
    return 1.25;
  }
  if (currentRate < 1.5) {
    return 1.5;
  }
  return 1;
}

export function ListeningExamView({
  audioDurationSeconds,
  audioPath,
  activeSectionId,
  mode,
  audioTitle,
  sections,
  finalReviewSeconds,
  onActiveSectionChange
}: ListeningExamViewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [internalActiveSectionId, setInternalActiveSectionId] = useState(sections[0]?.id);
  const [playbackRate, setPlaybackRate] = useState(1);
  const selectedSectionId = activeSectionId ?? internalActiveSectionId;
  const activeSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0];
  const isMock = mode === "mock";
  const activeAudioTitle = activeSection?.audioTitle ?? audioTitle;
  const activeAudioPath = activeSection?.audioPath ?? audioPath;
  const activeAudioDurationSeconds = activeSection?.audioDurationSeconds ?? audioDurationSeconds;

  function togglePracticeAudio() {
    const audio = audioRef.current;
    if (isMock || !audio) {
      return;
    }
    if (audio.paused) {
      void audio.play();
      return;
    }
    audio.pause();
  }

  function seekPracticeAudio() {
    if (isMock || !audioRef.current) {
      return;
    }
    audioRef.current.currentTime += 10;
  }

  function changePracticeAudioSpeed() {
    if (isMock || !audioRef.current) {
      return;
    }

    const nextRate = nextPlaybackRate(audioRef.current.playbackRate || playbackRate);
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }

  return (
    <section className="listening-exam-view" aria-label="Listening mock view">
      <div className="listening-player" aria-label="Listening player">
        <div>
          <p className="player-label">Audio</p>
          <h3>{activeAudioTitle}</h3>
          {activeAudioPath ? <p className="audio-resource-path">{activeAudioPath}</p> : null}
          {activeAudioDurationSeconds ? <p>Duration: {formatTimer(activeAudioDurationSeconds)}</p> : null}
          <p>Final review time: {formatTimer(finalReviewSeconds)}</p>
          {activeAudioPath ? (
            <audio
              ref={audioRef}
              aria-label="Local listening audio"
              autoPlay={isMock}
              controls={!isMock}
              preload="metadata"
              src={localAssetUrl(activeAudioPath)}
            />
          ) : null}
        </div>
        <div className="strict-controls">
          <button
            type="button"
            disabled={isMock}
            aria-label={isMock ? "Pause disabled in mock mode" : "Pause"}
            onClick={togglePracticeAudio}
          >
            Pause
          </button>
          <button
            type="button"
            disabled={isMock}
            aria-label={isMock ? "Seek disabled in mock mode" : "Seek"}
            onClick={seekPracticeAudio}
          >
            Seek
          </button>
          <button
            type="button"
            disabled={isMock}
            aria-label={isMock ? "Speed disabled in mock mode" : "Speed"}
            onClick={changePracticeAudioSpeed}
          >
            Speed: {playbackRate.toFixed(2).replace(/\.00$/, "")}x
          </button>
        </div>
      </div>

      <div className="section-tabs" role="tablist" aria-label="Listening sections">
        {sections.map((section) => (
          <button
            aria-selected={section.id === selectedSectionId}
            key={section.id}
            onClick={() => {
              setInternalActiveSectionId(section.id);
              onActiveSectionChange?.(section.id);
            }}
            role="tab"
            type="button"
          >
            {section.title}
          </button>
        ))}
      </div>

      <div className="section-panel" role="tabpanel">
        {activeSection?.questions}
      </div>
    </section>
  );
}
