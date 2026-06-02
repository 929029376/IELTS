# Windows Packaged Runtime Verification

**Purpose:** Close the remaining Phase 9 evidence gap by running the packaged IELTS
Local Practice app on a real Windows machine and preserving a structured runtime
report.

This guide uses the GitHub Actions artifacts produced by the Windows Desktop Package
workflow. Use the latest successful run on `master`; at the time this guide was
created, run `26824224735` is the current evidence run.

## Required Artifacts

Download these artifacts from the successful GitHub Actions run:

- `ielts-local-practice-windows-nsis`
- `ielts-local-practice-windows-verification-kit`
- `ielts-local-practice-windows-runtime-report`

Unzip the installer and verification kit into one local folder, for example:

```powershell
C:\Users\<you>\Downloads\ielts-windows-verification
```

The folder should contain:

- the NSIS installer `.exe`,
- `windows-package-manifest.json`,
- `windows-packaged-runtime-check.ps1`,
- `validate-windows-runtime-report.mjs`.

## Test Assets

Prepare local Windows paths for the same asset categories already checked on Mac:

- Baidu Cloud sync folder,
- listening ZIP,
- extracted listening audio file,
- reading PDF.

The Baidu Cloud folder does not need to contain the whole SQLite database. It should
be the folder used for JSONL sync files.

## Automated Verification Command

Open PowerShell in the verification folder and run:

```powershell
.\windows-packaged-runtime-check.ps1 `
  -ManifestPath ".\windows-package-manifest.json" `
  -InstallerPath ".\IELTS Local Practice_0.0.0_x64-setup.exe" `
  -ReportPath ".\windows-packaged-runtime-report.json" `
  -BaiduSyncPath "C:\Users\<you>\BaiduSyncdisk\IELTS-Sync" `
  -ListeningZipPath "C:\Users\<you>\Desktop\IELTS\listening\sample.zip" `
  -AudioPath "C:\Users\<you>\Desktop\IELTS\audio.mp3" `
  -ReadingPdfPath "C:\Users\<you>\Desktop\IELTS\reading.pdf" `
  -RequireInstalledApp `
  -RequireAppDataDir `
  -RequireBaiduSyncPath
```

Adjust the installer filename and local asset paths to match the downloaded files.
The script verifies:

- installer SHA256 from `windows-package-manifest.json`,
- installed executable discovery,
- app launch and process stability,
- app data directory creation,
- expected SQLite path,
- supplied Baidu Cloud sync folder existence,
- supplied listening ZIP, audio, and PDF asset paths.

## Hands-On UI Checklist

After the automated script passes, open IELTS Local Practice on Windows and verify
the rendered app UI:

- Desktop runtime diagnostics: the Sync settings panel renders Windows runtime
  diagnostics.
- SQLite path: the diagnostics panel shows the expected Windows app data SQLite path.
- Baidu Cloud sync folder: the selected Baidu Cloud folder matches the intended
  cross-device sync folder.
- file picker: the packaged app accepts the listening ZIP and reading PDF through
  the Windows file picker.
- audio playback: the selected listening audio loads, plays, and pauses in the
  packaged app.
- PDF viewing: the selected reading PDF renders in the packaged WebView.

## Report Evidence

Open `windows-packaged-runtime-report.json` and update the `manualChecklist` entries
after hands-on verification. Each completed item should use:

```text
status = "passed"
observedEvidence = "<what you saw on the Windows screen>"
```

Use `observedEvidence` to record the exact Windows UI evidence for each item, such
as the diagnostics path shown, the selected Baidu Cloud folder, the rendered file
name, observed audio duration/play-pause result, or the reading PDF title that
appeared in the packaged WebView.

Keep the report with the installer run evidence. The report is complete when:

- `installer.hashVerified` is `true`,
- `installedApp.found` is `true`,
- `installedApp.processStayedRunning` is `true`,
- `appData.detectedPath` is not empty,
- `appData.expectedDatabase` is not empty,
- Baidu Cloud, listening ZIP, listening audio, and reading PDF path checks are
  `exists`,
- every `manualChecklist` item is marked as passed,
- every passed `manualChecklist` item has non-empty `observedEvidence`.

## Final Report Validator

After updating the manual checklist, run the validator included in the verification kit:

```powershell
node ".\validate-windows-runtime-report.mjs" ".\windows-packaged-runtime-report.json"
```

The same script is also available in this repo at
`scripts/validate-windows-runtime-report.mjs`.

The validator must print:

```text
Windows runtime report is complete and Phase 9 evidence-ready.
```

If it fails, fix the missing Windows evidence before updating the Phase 9 summary.

## Phase 9 Completion Rule

Do not mark Phase 9 complete until the real Windows report proves desktop runtime
diagnostics, SQLite path, Baidu Cloud sync folder path, file picker, audio playback,
and PDF viewing on a real Windows environment, each passed manual checklist item has
non-empty `observedEvidence`, and
`scripts/validate-windows-runtime-report.mjs` passes against that completed report.
