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

function getLocalFilePath(file: File | null) {
  if (!file) {
    return "";
  }

  const fileWithLocalPath = file as File & { path?: string; webkitRelativePath?: string };
  return fileWithLocalPath.path?.trim() || fileWithLocalPath.webkitRelativePath?.trim() || "";
}

function selectedFileName(file: File, label: string) {
  return file.name.trim() || `Unknown ${label}`;
}

export function QuestionBankImportPanel({ onImportComplete }: { onImportComplete?: () => void }) {
  const [listeningDir, setListeningDir] = useState("/Users/musheng/Desktop/IELTS/listening");
  const [listeningZipPath, setListeningZipPath] = useState("");
  const [readingDir, setReadingDir] = useState("/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF");
  const [readingPdfPath, setReadingPdfPath] = useState("");
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
      onImportComplete?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Importing ${label} failed.`);
    } finally {
      setIsImporting(false);
    }
  }

  function fillPathFromSelectedFile(label: string, file: File | null, onPathChange: (path: string) => void) {
    const localPath = getLocalFilePath(file);
    if (localPath.length > 0) {
      onPathChange(localPath);
      setStatus(`Selected ${label}: ${localPath}`);
      return;
    }

    if (file) {
      setStatus(`${selectedFileName(file, label)} selected, but the local path was not exposed. Paste the full path before importing.`);
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
            void runImport("listening ZIP", "/api/import/listening-zip", { zipPath: listeningZipPath });
          }}
        >
          <div className="import-panel-title">
            <FolderInput size={18} aria-hidden="true" />
            <h3>Single listening ZIP</h3>
          </div>
          <label>
            Listening ZIP path
            <input
              placeholder="/Users/musheng/Desktop/IELTS/listening/P1/高频/1. P1 Enquiry.zip"
              value={listeningZipPath}
              onChange={(event) => setListeningZipPath(event.target.value)}
            />
          </label>
          <label className="import-file-picker">
            Choose listening ZIP file
            <input
              accept=".zip,application/zip"
              aria-label="Choose listening ZIP file"
              type="file"
              onChange={(event) =>
                fillPathFromSelectedFile("listening ZIP", event.currentTarget.files?.[0] ?? null, setListeningZipPath)
              }
            />
          </label>
          <button type="submit" disabled={isImporting || listeningZipPath.trim().length === 0}>
            Import listening ZIP
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
            void runImport("reading PDF", "/api/import/reading-pdf", { pdfPath: readingPdfPath });
          }}
        >
          <div className="import-panel-title">
            <FolderInput size={18} aria-hidden="true" />
            <h3>Single reading PDF</h3>
          </div>
          <label>
            Reading PDF path
            <input
              placeholder="/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/18. P1 - Tea.pdf"
              value={readingPdfPath}
              onChange={(event) => setReadingPdfPath(event.target.value)}
            />
          </label>
          <label className="import-file-picker">
            Choose reading PDF file
            <input
              accept="application/pdf,.pdf"
              aria-label="Choose reading PDF file"
              type="file"
              onChange={(event) =>
                fillPathFromSelectedFile("reading PDF", event.currentTarget.files?.[0] ?? null, setReadingPdfPath)
              }
            />
          </label>
          <button type="submit" disabled={isImporting || readingPdfPath.trim().length === 0}>
            Import reading PDF
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
          <label className="import-file-picker">
            Choose frequency CSV or XLSX file
            <input
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              aria-label="Choose frequency CSV or XLSX file"
              type="file"
              onChange={(event) =>
                fillPathFromSelectedFile(
                  "frequency file",
                  event.currentTarget.files?.[0] ?? null,
                  setFrequencyFilePath
                )
              }
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
