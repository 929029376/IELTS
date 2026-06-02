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
          <RuntimeRow label="Platform" value={status.platform} />
          <RuntimeRow label="App data" value={status.appDataDir} />
          <RuntimeRow label="SQLite" value={status.databasePath} />
          <RuntimeRow label="Sync folder" value={status.syncPath} />
          <RuntimeRow label="File picker" value={status.filePickerMode} />
          <RuntimeRow label="Audio" value={status.audioMode} />
          <RuntimeRow label="PDF" value={status.pdfMode} />
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
