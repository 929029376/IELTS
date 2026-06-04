import { useState } from "react";
import { Download, FolderSync, RefreshCw, Upload } from "lucide-react";
import { DesktopAssetVerifier } from "../desktop/DesktopAssetVerifier";
import { DesktopRuntimeDiagnostics, type DesktopRuntimeStatus } from "../desktop/DesktopRuntimeDiagnostics";

export interface SyncSettingsPreviewProps {
  deviceName: string;
  lastSyncAt: string | null;
  onBackupChanged?: () => void;
  runtimeStatus?: DesktopRuntimeStatus | null;
  syncFiles: string[];
  syncPath: string;
}

interface ManualSyncResult {
  conflicts: number;
  imported: number;
  skipped: number;
}

interface BackupResult {
  filePath?: string;
  importedTables?: number;
  rowCounts: Record<string, number>;
}

function backupCount(result: BackupResult | null, key: string) {
  return result?.rowCounts[key] ?? 0;
}

export function SyncSettingsPreview({
  deviceName,
  lastSyncAt,
  onBackupChanged,
  runtimeStatus = null,
  syncFiles,
  syncPath
}: SyncSettingsPreviewProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<ManualSyncResult | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupFilePath, setBackupFilePath] = useState("");
  const [backupImportResult, setBackupImportResult] = useState<BackupResult | null>(null);
  const [backupExportResult, setBackupExportResult] = useState<BackupResult | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  async function runManualSync() {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/sync/import", { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not import sync events");
      }
      setSyncResult((await response.json()) as ManualSyncResult);
    } catch {
      setSyncError("Could not complete manual sync.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function exportBackup() {
    setIsBackingUp(true);
    setBackupError(null);
    try {
      const response = await fetch("/api/backups/export", { method: "POST" });
      if (!response.ok) {
        throw new Error("Could not export backup");
      }
      const result = (await response.json()) as BackupResult;
      setBackupExportResult(result);
      setBackupFilePath(result.filePath ?? "");
      onBackupChanged?.();
    } catch {
      setBackupError("Could not export local backup.");
    } finally {
      setIsBackingUp(false);
    }
  }

  async function importBackup() {
    if (!backupFilePath.trim()) {
      setBackupError("Enter a backup file path before importing.");
      return;
    }

    setIsBackingUp(true);
    setBackupError(null);
    try {
      const response = await fetch("/api/backups/import", {
        body: JSON.stringify({ filePath: backupFilePath.trim() }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Could not import backup");
      }
      setBackupImportResult((await response.json()) as BackupResult);
      onBackupChanged?.();
    } catch {
      setBackupError("Could not import local backup.");
    } finally {
      setIsBackingUp(false);
    }
  }

  return (
    <section className="sync-settings-band" aria-label="Sync settings">
      <div className="reports-header">
        <div>
          <p className="eyebrow">Cross-device records</p>
          <h2>Baidu Cloud JSONL sync</h2>
        </div>
        <button className="icon-command" disabled={isSyncing} onClick={() => void runManualSync()} type="button">
          <RefreshCw size={16} aria-hidden="true" />
          Manual sync
        </button>
      </div>

      <div className="sync-settings-grid">
        <div className="sync-path-panel">
          <div className="hardening-panel-title">
            <FolderSync size={18} aria-hidden="true" />
            <h3>Sync folder</h3>
          </div>
          <p>{syncPath}</p>
          <dl>
            <div>
              <dt>Device</dt>
              <dd>{deviceName}</dd>
            </div>
            <div>
              <dt>Last sync</dt>
              <dd>{lastSyncAt ? lastSyncAt.slice(0, 16).replace("T", " ") : "Not synced yet"}</dd>
            </div>
          </dl>
        </div>

        <div className="sync-files-panel">
          <h3>Append-only files</h3>
          <div className="sync-file-list">
            {syncFiles.map((fileName) => (
              <span key={fileName}>{fileName}</span>
            ))}
          </div>
        </div>
      </div>
      {syncResult ? (
        <section className="sync-status-panel" role="status">
          <h3>Manual sync complete</h3>
          <div>
            <span>{syncResult.imported} imported</span>
            <span>{syncResult.skipped} skipped</span>
            <span>{syncResult.conflicts} conflicts</span>
          </div>
        </section>
      ) : null}
      {syncError ? <p className="mock-start-error">{syncError}</p> : null}
      <section className="backup-tools-panel" aria-label="Manual backup">
        <div className="backup-tools-header">
          <div>
            <p className="eyebrow">Local safety copy</p>
            <h3>Manual backup</h3>
          </div>
          <button className="icon-command" disabled={isBackingUp} onClick={() => void exportBackup()} type="button">
            <Download size={16} aria-hidden="true" />
            Export backup
          </button>
        </div>
        <label className="backup-path-control">
          <span>Backup file path</span>
          <input
            aria-label="Backup file path"
            onChange={(event) => setBackupFilePath(event.target.value)}
            placeholder="/Users/musheng/Desktop/IELTS/data/backups/ielts-backup.json"
            value={backupFilePath}
          />
        </label>
        <button
          className="icon-command"
          disabled={isBackingUp || !backupFilePath.trim()}
          onClick={() => void importBackup()}
          type="button"
        >
          <Upload size={16} aria-hidden="true" />
          Import backup
        </button>
        {backupExportResult ? (
          <section className="sync-status-panel" role="status">
            <h3>Backup exported</h3>
            {backupExportResult.filePath ? <p className="backup-file-path">{backupExportResult.filePath}</p> : null}
            <div>
              <span>{backupCount(backupExportResult, "attempts")} attempts</span>
              <span>{backupCount(backupExportResult, "attempt_answers")} answers</span>
              <span>{backupCount(backupExportResult, "listening_cues")} cues</span>
              <span>{backupCount(backupExportResult, "dictation_attempts")} dictations</span>
            </div>
          </section>
        ) : null}
        {backupImportResult ? (
          <section className="sync-status-panel" role="status">
            <h3>Backup imported</h3>
            <div>
              <span>{backupImportResult.importedTables ?? 0} tables</span>
              <span>{backupCount(backupImportResult, "attempts")} attempts</span>
              <span>{backupCount(backupImportResult, "attempt_answers")} answers</span>
            </div>
          </section>
        ) : null}
        {backupError ? <p className="mock-start-error">{backupError}</p> : null}
      </section>
      <DesktopRuntimeDiagnostics status={runtimeStatus} />
      <DesktopAssetVerifier />
    </section>
  );
}
