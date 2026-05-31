import { FolderSync, RefreshCw } from "lucide-react";

export interface SyncSettingsPreviewProps {
  deviceName: string;
  lastSyncAt: string | null;
  syncFiles: string[];
  syncPath: string;
}

export function SyncSettingsPreview({
  deviceName,
  lastSyncAt,
  syncFiles,
  syncPath
}: SyncSettingsPreviewProps) {
  return (
    <section className="sync-settings-band" aria-label="Sync settings">
      <div className="reports-header">
        <div>
          <p className="eyebrow">Cross-device records</p>
          <h2>Baidu Cloud JSONL sync</h2>
        </div>
        <button className="icon-command" type="button">
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
    </section>
  );
}
