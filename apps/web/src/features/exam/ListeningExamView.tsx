import type { ReactNode } from "react";
import { useState } from "react";
import { formatTimer } from "./questionNav";

export interface ListeningSection {
  id: string;
  title: string;
  questions: ReactNode;
}

export interface ListeningExamViewProps {
  mode: "mock" | "practice";
  audioTitle: string;
  sections: ListeningSection[];
  finalReviewSeconds: number;
}

export function ListeningExamView({
  mode,
  audioTitle,
  sections,
  finalReviewSeconds
}: ListeningExamViewProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const isMock = mode === "mock";

  return (
    <section className="listening-exam-view" aria-label="Listening mock view">
      <div className="listening-player" aria-label="Listening player">
        <div>
          <p className="player-label">Audio</p>
          <h3>{audioTitle}</h3>
          <p>Final review time: {formatTimer(finalReviewSeconds)}</p>
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
            aria-selected={section.id === activeSectionId}
            key={section.id}
            onClick={() => setActiveSectionId(section.id)}
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
