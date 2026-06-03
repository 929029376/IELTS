import { useEffect, useState } from "react";
import { Activity, BookOpenCheck, Database, Headphones, LineChart, Timer } from "lucide-react";
import { ExamPreview } from "../features/exam/ExamPreview";
import { HardeningCenter, type HardeningStatusView } from "../features/hardening/HardeningCenter";
import { QuestionBankImportPanel } from "../features/import/QuestionBankImportPanel";
import { IntensivePracticePreview } from "../features/intensive/IntensivePracticePreview";
import {
  HistoryReportsPreview,
  type DashboardReportView,
  type HistoryAttemptView,
  type ReportsAnalyticsView
} from "../features/reports/HistoryReportsPreview";
import { StudyOverviewPanel, type StudyOverviewView } from "../features/study/StudyOverviewPanel";
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

const emptyHistory: HistoryAttemptView[] = [];

const emptyAnalytics: ReportsAnalyticsView = {
  mistakeLabels: [],
  partRows: [],
  questionTypeRows: []
};

const emptyDashboardReport: DashboardReportView = {
  latestMockScore: "No mock submitted",
  predictedListening: "Need history",
  predictedReading: "Need history",
  recommendedNextPractice: "Import a set to begin",
  weakestQuestionType: "No data"
};

const emptyHardeningStatus: HardeningStatusView = {
  backupReminder: {
    latestBackupAt: null,
    reason: null,
    shouldRemind: false,
    submittedAttemptCount: 0
  },
  importFailures: {
    byStatus: {},
    sources: [],
    totalUnresolved: 0
  },
  questionBankCompleteness: {
    issueCounts: {
      missingAnswerKey: 0,
      missingAudio: 0,
      missingExplanation: 0,
      missingFrequencyEntry: 0,
      missingListeningCues: 0,
      missingTranscript: 0
    },
    passages: [],
    totalPassages: 0
  }
};

const emptyStudyOverview: StudyOverviewView = {
  readiness: {
    listeningFullMockReady: false,
    readingFullMockReady: false
  },
  recommendedMockSets: {
    listening: null,
    reading: null
  },
  subjects: {
    listening: {
      cueCount: 0,
      frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
      passageCount: 0,
      questionCount: 0
    },
    reading: {
      cueCount: 0,
      frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
      passageCount: 0,
      questionCount: 0
    }
  }
};

interface DashboardData {
  analytics: ReportsAnalyticsView;
  dashboard: DashboardReportView;
  hardening: HardeningStatusView;
  history: HistoryAttemptView[];
  status: "loading" | "live" | "fallback";
}

interface AccuracyBucket {
  accuracy: number;
  correct: number;
  total: number;
}

interface ServerAnalytics {
  byFrequencyClass?: Record<string, AccuracyBucket>;
  byPart?: Record<string, Record<string, AccuracyBucket>>;
  byQuestionType?: Record<string, AccuracyBucket>;
  mistakeLabels?: Array<{ count: number; label: string }>;
  partRows?: ReportsAnalyticsView["partRows"];
  questionTypeRows?: ReportsAnalyticsView["questionTypeRows"];
}

interface ServerBandPrediction {
  basisAttempts: number;
  confidence: "low" | "medium" | "high";
  predictedBand: number | null;
  range: { max: number; min: number } | null;
  subject: string;
}

interface ServerDashboardReport {
  latestMockScore: HistoryAttemptView | string | null;
  predictedListening: ServerBandPrediction | string;
  predictedReading: ServerBandPrediction | string;
  recommendedNextPractice: string | null;
  weakestQuestionType: string | null;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return (await response.json()) as T;
}

function bucketRows(prefix: string, buckets: Record<string, AccuracyBucket> | undefined) {
  return Object.entries(buckets ?? {}).map(([label, bucket]) => ({
    accuracy: bucket.accuracy,
    correct: bucket.correct,
    label: prefix ? `${prefix} ${label}` : label,
    total: bucket.total
  }));
}

function toAnalyticsView(analytics: ServerAnalytics): ReportsAnalyticsView {
  if (analytics.partRows && analytics.questionTypeRows) {
    return {
      mistakeLabels: analytics.mistakeLabels ?? [],
      partRows: analytics.partRows,
      questionTypeRows: analytics.questionTypeRows
    };
  }

  return {
    mistakeLabels: analytics.mistakeLabels ?? [],
    partRows: [
      ...bucketRows("Listening", analytics.byPart?.listening),
      ...bucketRows("Reading", analytics.byPart?.reading),
      ...bucketRows("Frequency", analytics.byFrequencyClass)
    ],
    questionTypeRows: bucketRows("", analytics.byQuestionType)
  };
}

function formatPrediction(value: ServerBandPrediction | string): string {
  if (typeof value === "string") {
    return value;
  }
  if (!value.range || value.predictedBand === null) {
    return "Need history";
  }
  return `${value.range.min}-${value.range.max}`;
}

function formatLatestMock(value: HistoryAttemptView | string | null): string {
  if (typeof value === "string") {
    return value;
  }
  if (!value) {
    return "No mock submitted";
  }
  const band = value.estimatedBand === null ? "Band pending" : `Band ${value.estimatedBand}`;
  const rawScore = value.rawScore === null ? "score pending" : `${value.rawScore}/40`;
  const subject = value.subject.charAt(0).toUpperCase() + value.subject.slice(1);
  return `${subject} ${rawScore}, ${band}`;
}

function toDashboardView(report: ServerDashboardReport): DashboardReportView {
  return {
    latestMockScore: formatLatestMock(report.latestMockScore),
    predictedListening: formatPrediction(report.predictedListening),
    predictedReading: formatPrediction(report.predictedReading),
    recommendedNextPractice: report.recommendedNextPractice ?? "Import a set to begin",
    weakestQuestionType: report.weakestQuestionType ?? "No data"
  };
}

function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    analytics: emptyAnalytics,
    dashboard: emptyDashboardReport,
    hardening: emptyHardeningStatus,
    history: emptyHistory,
    status: "loading"
  });

  useEffect(() => {
    let mounted = true;

    if (typeof fetch === "undefined") {
      setData((current) => ({ ...current, status: "fallback" }));
      return;
    }

    void Promise.all([
      fetchJson<HistoryAttemptView[]>("/api/reports/history"),
      fetchJson<ServerAnalytics>("/api/reports/analytics"),
      fetchJson<ServerDashboardReport>("/api/reports/dashboard"),
      fetchJson<HardeningStatusView>("/api/hardening/status")
    ])
      .then(([history, analytics, dashboard, hardening]) => {
        if (mounted) {
          setData({
            analytics: toAnalyticsView(analytics),
            dashboard: toDashboardView(dashboard),
            hardening,
            history,
            status: "live"
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setData({
            analytics: emptyAnalytics,
            dashboard: emptyDashboardReport,
            hardening: emptyHardeningStatus,
            history: emptyHistory,
            status: "fallback"
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return data;
}

function useStudyOverview(): StudyOverviewView {
  const [overview, setOverview] = useState<StudyOverviewView>(emptyStudyOverview);

  useEffect(() => {
    let mounted = true;

    if (typeof fetch === "undefined") {
      return;
    }

    void fetchJson<StudyOverviewView>("/api/study/overview")
      .then((studyOverview) => {
        if (mounted) {
          setOverview(studyOverview);
        }
      })
      .catch(() => {
        if (mounted) {
          setOverview(emptyStudyOverview);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return overview;
}

export function App() {
  const dashboardData = useDashboardData();
  const studyOverview = useStudyOverview();
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
            {dashboardData.status === "live" ? "Live local data" : "Local data ready"}
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

        <StudyOverviewPanel overview={studyOverview} />
        <ExamPreview />
        <QuestionBankImportPanel />
        <IntensivePracticePreview />
        <HistoryReportsPreview
          analytics={dashboardData.analytics}
          dashboard={dashboardData.dashboard}
          history={dashboardData.history}
        />
        <HardeningCenter status={dashboardData.hardening} />
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
