import type { ReactNode } from "react";
import { useState } from "react";
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
  const [internalActiveSectionId, setInternalActiveSectionId] = useState(sections[0]?.id);
  const selectedSectionId = activeSectionId ?? internalActiveSectionId;
  const activeSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0];
  const isMock = mode === "mock";
  const activeAudioTitle = activeSection?.audioTitle ?? audioTitle;
  const activeAudioPath = activeSection?.audioPath ?? audioPath;
  const activeAudioDurationSeconds = activeSection?.audioDurationSeconds ?? audioDurationSeconds;

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
              aria-label="Local listening audio"
              autoPlay={isMock}
              controls={!isMock}
              preload="metadata"
              src={localAssetUrl(activeAudioPath)}
            />
          ) : null}
        </div>
        <div className="strict-controls">
          <button type="button" disabled={isMock} aria-label={isMock ? "Pause disabled in mock mode" : "Pause"}>
            Pause
          </button>
          <button type="button" disabled={isMock} aria-label={isMock ? "Seek disabled in mock mode" : "Seek"}>
            Seek
          </button>
          <button type="button" disabled={isMock} aria-label={isMock ? "Speed disabled in mock mode" : "Speed"}>
            Speed
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
