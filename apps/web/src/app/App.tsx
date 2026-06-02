import { Activity, BookOpenCheck, Database, Headphones, LineChart, Timer } from "lucide-react";
import { ExamPreview } from "../features/exam/ExamPreview";
import { HardeningCenter } from "../features/hardening/HardeningCenter";
import { IntensivePracticePreview } from "../features/intensive/IntensivePracticePreview";
import { HistoryReportsPreview } from "../features/reports/HistoryReportsPreview";
import { SyncSettingsPreview } from "../features/sync/SyncSettingsPreview";
import { useDesktopRuntimeStatus } from "../features/desktop/desktopRuntime";
import "./app.css";

const cards = [
  {
    title: "Mock Exam Center",
    description: "Strict IELTS-style listening and reading tests with timer and score estimate.",
    Icon: Timer
  },
  {
    title: "Intensive Practice Center",
    description: "Focused listening repeat, reading review, answer evidence, and mistake labels.",
    Icon: Headphones
  },
  {
    title: "Question Bank",
    description: "Import local listening ZIPs, reading PDFs, and frequency tables.",
    Icon: Database
  },
  {
    title: "Progress Analytics",
    description: "Track history, accuracy, weak question types, and predicted score ranges.",
    Icon: LineChart
  }
];

const sampleHistory = [
  {
    durationSeconds: 3600,
    estimatedBand: 7,
    id: "sample-history-1",
    mode: "mock",
    rawScore: 31,
    startedAt: "2026-05-30T10:00:00.000Z",
    subject: "listening",
    submittedAt: "2026-05-30T11:00:00.000Z"
  }
];

const sampleAnalytics = {
  mistakeLabels: [{ count: 3, label: "定位失败" }],
  partRows: [
    { accuracy: 0.75, correct: 3, label: "Listening P1", total: 4 },
    { accuracy: 0.5, correct: 2, label: "Reading P2", total: 4 }
  ],
  questionTypeRows: [{ accuracy: 0.4, correct: 2, label: "matching", total: 5 }]
};

const sampleDashboardReport = {
  latestMockScore: "Listening 31/40, Band 7",
  predictedListening: "6.5-7.5",
  predictedReading: "6.0-7.0",
  recommendedNextPractice: "Review matching questions",
  weakestQuestionType: "matching"
};

const sampleHardeningStatus = {
  backupReminder: {
    latestBackupAt: null,
    reason: "You have 12 submitted attempts and no recent backup.",
    shouldRemind: true,
    submittedAttemptCount: 12
  },
  importFailures: {
    byStatus: { failed: 1, needs_review: 1 },
    sources: [
      {
        assetCount: 1,
        createdAt: "2026-06-01T00:00:00.000Z",
        id: "source-1",
        importStatus: "failed",
        originalPath: "reading/broken.pdf",
        sourceType: "reading_pdf",
        version: 1
      }
    ],
    totalUnresolved: 2
  },
  questionBankCompleteness: {
    issueCounts: {
      missingAnswerKey: 1,
      missingAudio: 1,
      missingExplanation: 1,
      missingFrequencyEntry: 1,
      missingListeningCues: 1,
      missingTranscript: 1
    },
    passages: [
      {
        frequencyClass: "unknown",
        id: "passage-1",
        issueLabels: ["missing answer key", "missing audio", "missing frequency entry"],
        part: "P1",
        questionCount: 2,
        sourceStatus: "needs_review",
        subject: "listening",
        title: "Airport Enquiry"
      }
    ],
    totalPassages: 1
  }
};

export function App() {
  const desktopRuntimeStatus = useDesktopRuntimeStatus();

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-mark">
          <BookOpenCheck size={24} aria-hidden="true" />
          <span>IELTS</span>
        </div>
        <nav className="nav-list">
          <a className="nav-item active" href="#dashboard">
            Dashboard
          </a>
          <a className="nav-item" href="#mock">
            Mock Exams
          </a>
          <a className="nav-item" href="#practice">
            Practice
          </a>
          <a className="nav-item" href="#bank">
            Question Bank
          </a>
          <a className="nav-item" href="#reports">
            Reports
          </a>
          <a className="nav-item" href="#sync">
            Sync
          </a>
        </nav>
      </aside>

      <section id="dashboard" className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Local-first IELTS preparation</p>
            <h1>IELTS Local Practice</h1>
          </div>
          <div className="status-pill">
            <Activity size={16} aria-hidden="true" />
            Phase 6 intensive study
          </div>
        </header>

        <section className="summary-grid" aria-label="Preparation modules">
          {cards.map(({ title, description, Icon }) => (
            <article className="module-card" key={title}>
              <div className="module-icon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>

        <ExamPreview />
        <IntensivePracticePreview />
        <HistoryReportsPreview
          analytics={sampleAnalytics}
          dashboard={sampleDashboardReport}
          history={sampleHistory}
        />
        <HardeningCenter status={sampleHardeningStatus} />
        <SyncSettingsPreview
          deviceName="Mac local device"
          lastSyncAt={null}
          runtimeStatus={desktopRuntimeStatus}
          syncFiles={[
            "attempts.jsonl",
            "answers.jsonl",
            "mistakes.jsonl",
            "stats.jsonl",
            "frequency.jsonl",
            "imports.jsonl",
            "devices.json"
          ]}
          syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
        />
      </section>
    </main>
  );
}
