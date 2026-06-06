import { useEffect, useState } from "react";
import { Activity, BookOpenCheck, Database, Headphones, LineChart, Timer } from "lucide-react";
import { ExamPreview } from "../features/exam/ExamPreview";
import { HardeningCenter, type HardeningStatusView } from "../features/hardening/HardeningCenter";
import { QuestionBankImportPanel } from "../features/import/QuestionBankImportPanel";
import { IntensivePracticePreview, type IntensiveStudyPreviewView } from "../features/intensive/IntensivePracticePreview";
import {
  HistoryReportsPreview,
  type DashboardReportView,
  type HistoryAttemptView,
  type PredictionCardData,
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
  frequencyRows: [],
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
      missingAnswerSentence: 0,
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

const defaultSyncConfig: SyncConfigView = {
  deviceId: "local-mac-device",
  deviceName: "Mac local device",
  platform: "darwin",
  syncFolderPath: "/Users/musheng/Desktop/同步空间/IELTS-Sync"
};

interface DashboardData {
  analytics: ReportsAnalyticsView;
  dashboard: DashboardReportView;
  hardening: HardeningStatusView;
  history: HistoryAttemptView[];
  status: "loading" | "live" | "fallback";
}

interface SyncConfigView {
  deviceId: string;
  deviceName: string;
  platform: string;
  syncFolderPath: string;
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
  frequencyRows?: ReportsAnalyticsView["frequencyRows"];
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

function frequencyLabel(label: string) {
  const normalized = label.charAt(0).toUpperCase() + label.slice(1);
  return `${normalized} frequency`;
}

function frequencyBucketRows(buckets: Record<string, AccuracyBucket> | undefined) {
  return Object.entries(buckets ?? {}).map(([label, bucket]) => ({
    accuracy: bucket.accuracy,
    correct: bucket.correct,
    label: frequencyLabel(label),
    total: bucket.total
  }));
}

function fallbackText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function toAnalyticsView(analytics: ServerAnalytics): ReportsAnalyticsView {
  if (analytics.partRows && analytics.questionTypeRows) {
    return {
      frequencyRows: analytics.frequencyRows ?? [],
      mistakeLabels: analytics.mistakeLabels ?? [],
      partRows: analytics.partRows,
      questionTypeRows: analytics.questionTypeRows
    };
  }

  return {
    frequencyRows: frequencyBucketRows(analytics.byFrequencyClass),
    mistakeLabels: analytics.mistakeLabels ?? [],
    partRows: [
      ...bucketRows("Listening", analytics.byPart?.listening),
      ...bucketRows("Reading", analytics.byPart?.reading)
    ],
    questionTypeRows: bucketRows("", analytics.byQuestionType)
  };
}

function formatPrediction(value: ServerBandPrediction | string): PredictionCardData {
  if (typeof value === "string") {
    return fallbackText(value, "Need history");
  }
  if (!value.range || value.predictedBand === null) {
    return "Need history";
  }
  return {
    basisAttempts: value.basisAttempts,
    confidence: value.confidence,
    detail: `Range ${value.range.min}-${value.range.max}`,
    value: `Band ${value.predictedBand}`
  };
}

function formatLatestMock(value: HistoryAttemptView | string | null): string {
  if (typeof value === "string") {
    return fallbackText(value, "No mock submitted");
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
    recommendedNextPractice: fallbackText(report.recommendedNextPractice, "Import a set to begin"),
    weakestQuestionType: fallbackText(report.weakestQuestionType, "No data")
  };
}

function useDashboardData(refreshVersion: number): DashboardData {
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
  }, [refreshVersion]);

  return data;
}

function useStudyOverview(refreshVersion: number): StudyOverviewView {
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
  }, [refreshVersion]);

  return overview;
}

function useSyncConfig(refreshVersion: number): SyncConfigView {
  const [syncConfig, setSyncConfig] = useState<SyncConfigView>(defaultSyncConfig);

  useEffect(() => {
    let mounted = true;

    if (typeof fetch === "undefined") {
      return;
    }

    void fetchJson<SyncConfigView>("/api/sync/config")
      .then((config) => {
        if (mounted) {
          setSyncConfig(config);
        }
      })
      .catch(() => {
        if (mounted) {
          setSyncConfig(defaultSyncConfig);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refreshVersion]);

  return syncConfig;
}

function useIntensiveStudyPreview(refreshVersion: number): IntensiveStudyPreviewView | undefined {
  const [preview, setPreview] = useState<IntensiveStudyPreviewView | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    if (typeof fetch === "undefined") {
      return;
    }

    void fetchJson<IntensiveStudyPreviewView>("/api/study/intensive")
      .then((studyPreview) => {
        if (mounted) {
          setPreview(studyPreview);
        }
      })
      .catch(() => {
        if (mounted) {
          setPreview(undefined);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refreshVersion]);

  return preview;
}

export function App() {
  const [dataRefreshVersion, setDataRefreshVersion] = useState(0);
  const dashboardData = useDashboardData(dataRefreshVersion);
  const intensiveStudyPreview = useIntensiveStudyPreview(dataRefreshVersion);
  const studyOverview = useStudyOverview(dataRefreshVersion);
  const syncConfig = useSyncConfig(dataRefreshVersion);
  const desktopRuntimeStatus = useDesktopRuntimeStatus();

  return (
    <main className="app-shell">
      <section id="dashboard" className="dashboard study-desk" aria-label="IELTS local study desk">
        <header className="study-desk-header">
          <div className="study-title-block">
            <p className="breadcrumb">首页 &gt; IELTS 本地刷题</p>
            <div className="brand-line">
              <BookOpenCheck size={22} aria-hidden="true" />
              <span>Mac local-first IELTS preparation</span>
            </div>
            <h1>IELTS Local Practice</h1>
          </div>
          <div className="status-pill">
            <Activity size={16} aria-hidden="true" />
            {dashboardData.status === "live" ? "Live local data" : "Local data ready"}
          </div>
        </header>

        <section className="practice-filter-card" aria-label="Practice filters">
          <div className="filter-row">
            <strong>Part</strong>
            <button type="button" className="filter-chip active">
              全部
            </button>
            <button type="button" className="filter-chip">
              Part 1
            </button>
            <button type="button" className="filter-chip">
              Part 2
            </button>
            <button type="button" className="filter-chip">
              Part 3
            </button>
            <button type="button" className="filter-chip">
              Part 4
            </button>
          </div>
          <div className="filter-row">
            <strong>题型</strong>
            <button type="button" className="filter-chip active">
              全部
            </button>
            <button type="button" className="filter-chip">
              填空
            </button>
            <button type="button" className="filter-chip">
              判断
            </button>
            <button type="button" className="filter-chip">
              单选
            </button>
            <button type="button" className="filter-chip">
              配对
            </button>
            <button type="button" className="filter-chip">
              小标题
            </button>
            <button type="button" className="filter-chip">
              多选
            </button>
          </div>
          <div className="filter-row">
            <strong>场景</strong>
            <button type="button" className="filter-chip active">
              全部
            </button>
            <button type="button" className="filter-chip">
              高频
            </button>
            <button type="button" className="filter-chip">
              中频
            </button>
            <button type="button" className="filter-chip">
              低频
            </button>
            <button type="button" className="filter-chip">
              错题
            </button>
            <button type="button" className="filter-chip">
              待补证据
            </button>
          </div>
        </section>

        <section className="study-toolbar" aria-label="Study toolbar">
          <select aria-label="Sort practice sets" defaultValue="frequency">
            <option value="frequency">按命中次数从高到低</option>
            <option value="recent">按最近练习时间</option>
            <option value="accuracy">按正确率从低到高</option>
          </select>
          <label className="high-frequency-toggle">
            <input type="checkbox" />
            <span>只看高频待补强</span>
          </label>
          <a className="primary-study-action" href="#mock">
            套题模考
          </a>
          <a className="primary-study-action secondary" href="#practice">
            考场练习
          </a>
          <input aria-label="Search practice sets" placeholder="输入试题名称" type="search" />
        </section>

        <div className="study-desk-grid">
          <section className="study-workspace" aria-label="Study workspace">
            <section className="practice-card-grid" aria-label="Preparation modules">
              {cards.map(({ title, description, Icon }) => (
                <article className="module-card" key={title}>
                  <div className="module-card-topline">
                    <span className="status-badge">未开始</span>
                    <span className="must-do-badge">自学营必修</span>
                  </div>
                  <div className="module-icon">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </article>
              ))}
            </section>

            <StudyOverviewPanel overview={studyOverview} />
            <ExamPreview onMockSubmitted={() => setDataRefreshVersion((version) => version + 1)} />
            <IntensivePracticePreview preview={intensiveStudyPreview} />
            <QuestionBankImportPanel onImportComplete={() => setDataRefreshVersion((version) => version + 1)} />
            <HistoryReportsPreview
              analytics={dashboardData.analytics}
              dashboard={dashboardData.dashboard}
              history={dashboardData.history}
            />
          </section>

          <aside className="prep-support" aria-label="Local prep support">
            <section className="prep-support-panel">
              <h2>新手小贴士</h2>
              <a href="#bank">先导入题库和频率表</a>
              <a href="#mock">用套题模考确认当前分数</a>
              <a href="#practice">用精听精读修正错题原因</a>
            </section>
            <section className="prep-support-panel">
              <h2>常见问题</h2>
              <a href="#sync">百度云同步文件夹是否正常？</a>
              <a href="#reports">怎么看真实成绩预测？</a>
              <a href="#bank">频率表更新后怎么生效？</a>
            </section>
            <HardeningCenter status={dashboardData.hardening} />
            <SyncSettingsPreview
              deviceName={syncConfig.deviceName}
              lastSyncAt={null}
              onBackupChanged={() => setDataRefreshVersion((version) => version + 1)}
              onSyncComplete={() => setDataRefreshVersion((version) => version + 1)}
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
              syncPath={syncConfig.syncFolderPath}
            />
          </aside>
        </div>
      </section>
    </main>
  );
}
