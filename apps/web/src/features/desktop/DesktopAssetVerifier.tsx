import { FileArchive, FileAudio, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface SelectedAsset {
  name: string;
  url: string | null;
}

function assetName(value: string | null, fallback: string) {
  return value?.trim() || fallback;
}

function useObjectUrl(file: File | null) {
  const [asset, setAsset] = useState<SelectedAsset | null>(null);

  useEffect(() => {
    if (!file) {
      setAsset(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setAsset({ name: file.name, url });

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return asset;
}

function AssetFileInput({
  accept,
  icon,
  label,
  onSelect,
  selectedFallback,
  selectedName
}: {
  accept: string;
  icon: ReactNode;
  label: string;
  onSelect: (file: File | null) => void;
  selectedFallback: string;
  selectedName: string | null;
}) {
  return (
    <label className="asset-input-card">
      <span className="asset-input-title">
        {icon}
        {label}
      </span>
      <input
        accept={accept}
        aria-label={label}
        type="file"
        onChange={(event) => onSelect(event.currentTarget.files?.[0] ?? null)}
      />
      <strong>{assetName(selectedName, selectedFallback)}</strong>
    </label>
  );
}

export function DesktopAssetVerifier() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const audioAsset = useObjectUrl(audioFile);
  const pdfAsset = useObjectUrl(pdfFile);

  return (
    <section className="desktop-asset-verifier" aria-label="Desktop asset interaction verifier">
      <div className="hardening-panel-title">
        <FileText size={18} aria-hidden="true" />
        <h3>Packaged asset interaction check</h3>
      </div>

      <div className="asset-input-grid">
        <AssetFileInput
          accept=".zip,application/zip"
          icon={<FileArchive size={18} aria-hidden="true" />}
          label="Select listening ZIP"
          selectedFallback={zipFile ? "Unknown ZIP file" : "No file selected"}
          selectedName={zipFile?.name ?? null}
          onSelect={setZipFile}
        />
        <AssetFileInput
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
          icon={<FileAudio size={18} aria-hidden="true" />}
          label="Select audio asset"
          selectedFallback={audioFile ? "Unknown audio file" : "No file selected"}
          selectedName={audioAsset?.name ?? null}
          onSelect={setAudioFile}
        />
        <AssetFileInput
          accept="application/pdf,.pdf"
          icon={<FileText size={18} aria-hidden="true" />}
          label="Select reading PDF"
          selectedFallback={pdfFile ? "Unknown PDF file" : "No file selected"}
          selectedName={pdfAsset?.name ?? null}
          onSelect={setPdfFile}
        />
      </div>

      <div className="asset-preview-grid">
        <div className="asset-preview-panel">
          <h4>Audio preview</h4>
          {audioAsset?.url ? (
            <audio aria-label="Selected audio preview" controls src={audioAsset.url} />
          ) : (
            <p className="empty-state">Select an extracted listening audio file to test playback.</p>
          )}
        </div>
        <div className="asset-preview-panel">
          <h4>PDF preview</h4>
          {pdfAsset?.url ? (
            <object
              aria-label="Selected PDF preview"
              className="pdf-preview-object"
              data={pdfAsset.url}
              title="Selected PDF preview"
              type="application/pdf"
            >
              Selected PDF preview
            </object>
          ) : (
            <p className="empty-state">Select a reading PDF to test WebView PDF rendering.</p>
          )}
        </div>
      </div>
    </section>
  );
}
