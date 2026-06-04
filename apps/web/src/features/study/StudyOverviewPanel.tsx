export interface StudyPassageView {
  frequencyClass: string;
  id: string;
  part: string;
  subject: "listening" | "reading";
  title: string;
}

export interface StudySubjectOverviewView {
  cueCount: number;
  frequency: Record<"high" | "low" | "medium" | "unknown", number>;
  passageCount: number;
  questionCount: number;
}

export interface StudyOverviewView {
  readiness: {
    listeningFullMockReady: boolean;
    readingFullMockReady: boolean;
  };
  recommendedMockSets: {
    listening: { passages: StudyPassageView[]; subject: "listening" } | null;
    reading: { passages: StudyPassageView[]; subject: "reading" } | null;
  };
  subjects: {
    listening: StudySubjectOverviewView;
    reading: StudySubjectOverviewView;
  };
}

export interface StudyOverviewPanelProps {
  overview: StudyOverviewView;
}

function readinessLabel(subject: "listening" | "reading", ready: boolean) {
  const label = subject === "listening" ? "Listening" : "Reading";
  return ready ? `${label} mock ready` : `${label} mock needs more passages`;
}

function subjectMetric(subject: StudySubjectOverviewView) {
  return `${subject.passageCount} passages / ${subject.questionCount} questions / ${subject.cueCount} cues`;
}

function passageTitle(title: string) {
  return title.trim() || "Untitled passage";
}

function FrequencyStrip({ subject }: { subject: StudySubjectOverviewView }) {
  return (
    <div className="study-frequency-strip" aria-label="Frequency distribution">
      <span>High {subject.frequency.high}</span>
      <span>Medium {subject.frequency.medium}</span>
      <span>Low {subject.frequency.low}</span>
      <span>Unknown {subject.frequency.unknown}</span>
    </div>
  );
}

function MockSetList({ passages }: { passages: StudyPassageView[] }) {
  if (passages.length === 0) {
    return <p className="empty-state">Import enough passages to build a full mock set</p>;
  }

  return (
    <ol className="study-set-list">
      {passages.map((passage) => (
        <li key={passage.id}>
          <span>{passage.part}</span>
          <strong>{passageTitle(passage.title)}</strong>
          <small>{passage.frequencyClass}</small>
        </li>
      ))}
    </ol>
  );
}

export function StudyOverviewPanel({ overview }: StudyOverviewPanelProps) {
  return (
    <section className="study-overview-band" aria-label="Local study queue">
      <div className="reports-header">
        <div>
          <p className="eyebrow">Question-bank readiness</p>
          <h2>Local study queue</h2>
        </div>
      </div>

      <div className="study-overview-grid">
        <section className="study-overview-panel" aria-label="Listening study readiness">
          <h3>{readinessLabel("listening", overview.readiness.listeningFullMockReady)}</h3>
          <p>{subjectMetric(overview.subjects.listening)}</p>
          <FrequencyStrip subject={overview.subjects.listening} />
          <MockSetList passages={overview.recommendedMockSets.listening?.passages ?? []} />
        </section>

        <section className="study-overview-panel" aria-label="Reading study readiness">
          <h3>{readinessLabel("reading", overview.readiness.readingFullMockReady)}</h3>
          <p>{subjectMetric(overview.subjects.reading)}</p>
          <FrequencyStrip subject={overview.subjects.reading} />
          <MockSetList passages={overview.recommendedMockSets.reading?.passages ?? []} />
        </section>
      </div>
    </section>
  );
}
