import { Database, FileSpreadsheet, FolderInput } from "lucide-react";
import { useState } from "react";
import { FrequencyCorrectionTable, type FrequencyCorrectionRow } from "./FrequencyCorrectionTable";

interface ImportResponse {
  importedCount: number;
}

const defaultFrequencyRow: FrequencyCorrectionRow = {
  subject: "reading",
  part: "P1",
  englishTitle: "The History of Tea",
  chineseTitle: "茶叶的历史",
  frequencyClass: "high",
  difficulty: "2.5",
  sourceMonth: "2026-06"
};

async function postImport(path: string, payload: Record<string, unknown>): Promise<ImportResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Import request failed with status ${response.status}`);
  }

  return (await response.json()) as ImportResponse;
}

function toFrequencyPayload(row: FrequencyCorrectionRow) {
  const trimmedDifficulty = row.difficulty.trim();
  return {
    ...row,
    chineseTitle: row.chineseTitle.trim().length > 0 ? row.chineseTitle : null,
    difficulty: trimmedDifficulty.length > 0 ? Number.parseFloat(trimmedDifficulty) : null
  };
}

export function QuestionBankImportPanel() {
  const [listeningDir, setListeningDir] = useState("/Users/musheng/Desktop/IELTS/listening");
  const [readingDir, setReadingDir] = useState("/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF");
  const [frequencyFilePath, setFrequencyFilePath] = useState("");
  const [frequencyRows, setFrequencyRows] = useState<FrequencyCorrectionRow[]>([defaultFrequencyRow]);
  const [status, setStatus] = useState("Ready for local question-bank imports.");
  const [isImporting, setIsImporting] = useState(false);

  async function runImport(label: string, endpoint: string, payload: Record<string, unknown>) {
    setIsImporting(true);
    setStatus(`Importing ${label}...`);
    try {
      const result = await postImport(endpoint, payload);
      setStatus(`Imported ${result.importedCount} item into the local question bank.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Importing ${label} failed.`);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section id="bank" className="question-bank-import-band" aria-label="Question bank import">
      <div className="reports-header">
        <div>
          <p className="eyebrow">Question Bank</p>
          <h2>Local import and frequency updates</h2>
        </div>
        <div className="status-pill">
          <Database size={16} aria-hidden="true" />
          Mac local paths
        </div>
      </div>

      <div className="question-bank-import-grid">
        <form
          className="import-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void runImport("listening directory", "/api/import/listening-directory", { rootDir: listeningDir });
          }}
        >
          <div className="import-panel-title">
            <FolderInput size={18} aria-hidden="true" />
            <h3>Listening ZIP directory</h3>
          </div>
          <label>
            Listening directory path
            <input value={listeningDir} onChange={(event) => setListeningDir(event.target.value)} />
          </label>
          <button type="submit" disabled={isImporting}>
            Import listening directory
          </button>
        </form>

        <form
          className="import-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void runImport("reading directory", "/api/import/reading-directory", { rootDir: readingDir });
          }}
        >
          <div className="import-panel-title">
            <FolderInput size={18} aria-hidden="true" />
            <h3>Reading PDF directory</h3>
          </div>
          <label>
            Reading PDF directory path
            <input value={readingDir} onChange={(event) => setReadingDir(event.target.value)} />
          </label>
          <button type="submit" disabled={isImporting}>
            Import reading directory
          </button>
        </form>

        <form
          className="import-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void runImport("frequency file", "/api/import/frequency-file", { filePath: frequencyFilePath });
          }}
        >
          <div className="import-panel-title">
            <FileSpreadsheet size={18} aria-hidden="true" />
            <h3>Frequency file</h3>
          </div>
          <label>
            Frequency CSV/XLSX path
            <input
              placeholder="/Users/musheng/Desktop/IELTS/reading/frequency.csv"
              value={frequencyFilePath}
              onChange={(event) => setFrequencyFilePath(event.target.value)}
            />
          </label>
          <button type="submit" disabled={isImporting || frequencyFilePath.trim().length === 0}>
            Import frequency file
          </button>
        </form>
      </div>

      <div className="frequency-manual-panel">
        <label className="frequency-month-field">
          Frequency source month
          <input
            value={frequencyRows[0]?.sourceMonth ?? ""}
            onChange={(event) =>
              setFrequencyRows((rows) =>
                rows.map((row, index) => (index === 0 ? { ...row, sourceMonth: event.target.value } : row))
              )
            }
          />
        </label>
        <FrequencyCorrectionTable
          rows={frequencyRows}
          onRowsChange={setFrequencyRows}
          onImport={(rows) =>
            void runImport("corrected frequency rows", "/api/import/frequency-rows", {
              rows: rows.map(toFrequencyPayload)
            })
          }
        />
      </div>

      <p className="import-status" role="status">
        {status}
      </p>
    </section>
  );
}
