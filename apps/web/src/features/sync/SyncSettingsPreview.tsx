import { useState } from "react";
import { FolderSync, RefreshCw } from "lucide-react";
import { DesktopAssetVerifier } from "../desktop/DesktopAssetVerifier";
import { DesktopRuntimeDiagnostics, type DesktopRuntimeStatus } from "../desktop/DesktopRuntimeDiagnostics";

export interface SyncSettingsPreviewProps {
  deviceName: string;
  lastSyncAt: string | null;
  runtimeStatus?: DesktopRuntimeStatus | null;
  syncFiles: string[];
  syncPath: string;
}

interface ManualSyncResult {
  conflicts: number;
  imported: number;
  skipped: number;
}

export function SyncSettingsPreview({
  deviceName,
  lastSyncAt,
  runtimeStatus = null,
  syncFiles,
  syncPath
}: SyncSettingsPreviewProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<ManualSyncResult | null>(null);

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
      <DesktopRuntimeDiagnostics status={runtimeStatus} />
      <DesktopAssetVerifier />
    </section>
  );
}
