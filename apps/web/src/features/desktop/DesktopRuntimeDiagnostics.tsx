import { HardDrive, MonitorCheck } from "lucide-react";

export interface DesktopRuntimeStatus {
  appDataDir: string;
  audioMode: string;
  databasePath: string;
  filePickerMode: string;
  isDesktop: boolean;
  pdfMode: string;
  platform: string;
  syncPath: string;
}

export interface DesktopRuntimeDiagnosticsProps {
  status: DesktopRuntimeStatus | null;
}

function displayRuntimeValue(value: string, fallback: string) {
  return value.trim() || fallback;
}

function RuntimeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="runtime-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function DesktopRuntimeDiagnostics({ status }: DesktopRuntimeDiagnosticsProps) {
  return (
    <section className="desktop-runtime-panel" aria-label="Desktop runtime diagnostics">
      <div className="hardening-panel-title">
        <MonitorCheck size={18} aria-hidden="true" />
        <h3>{status?.isDesktop ? "Packaged desktop runtime" : "Browser/local web runtime"}</h3>
      </div>

      {status ? (
        <dl className="runtime-diagnostics-grid">
          <RuntimeRow label="Platform" value={displayRuntimeValue(status.platform, "Unknown platform")} />
          <RuntimeRow label="App data" value={displayRuntimeValue(status.appDataDir, "App data path unavailable")} />
          <RuntimeRow label="SQLite" value={displayRuntimeValue(status.databasePath, "SQLite path unavailable")} />
          <RuntimeRow label="Sync folder" value={displayRuntimeValue(status.syncPath, "Sync folder not configured")} />
          <RuntimeRow label="File picker" value={displayRuntimeValue(status.filePickerMode, "Unknown file picker mode")} />
          <RuntimeRow label="Audio" value={displayRuntimeValue(status.audioMode, "Unknown audio mode")} />
          <RuntimeRow label="PDF" value={displayRuntimeValue(status.pdfMode, "Unknown PDF mode")} />
        </dl>
      ) : (
        <div className="desktop-runtime-empty">
          <HardDrive size={18} aria-hidden="true" />
          <p>Desktop diagnostics appear inside the packaged app.</p>
        </div>
      )}
    </section>
  );
}
