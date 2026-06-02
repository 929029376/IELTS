param(
  [string]$ManifestPath = ".\windows-package-manifest.json"
)

$ErrorActionPreference = "Stop"

Write-Host "IELTS Local Practice - Windows packaged runtime verification"
Write-Host ""

if (Test-Path $ManifestPath) {
  $manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
  Write-Host "Installer artifact"
  Write-Host ("  Name:   {0}" -f $manifest.installerName)
  Write-Host ("  SHA256: {0}" -f $manifest.sha256)
  Write-Host ("  Size:   {0} bytes" -f $manifest.sizeBytes)
  Write-Host ""
} else {
  Write-Host "Manifest not found. Continue with the manual checklist after installing the NSIS .exe."
  Write-Host ""
}

$expectedAppData = Join-Path $env:APPDATA "IELTS Local Practice"
$expectedDatabase = Join-Path $expectedAppData "ielts.db"

Write-Host "Manual checklist"
Write-Host "  [ ] Install the NSIS .exe from the GitHub artifact."
Write-Host "  [ ] Open IELTS Local Practice from the Start menu."
Write-Host "  [ ] Desktop runtime diagnostics shows platform windows."
Write-Host ("  [ ] Desktop runtime diagnostics shows SQLite path: {0}" -f $expectedDatabase)
Write-Host "  [ ] Desktop runtime diagnostics shows Baidu Cloud sync folder selected by the Windows file picker."
Write-Host "  [ ] The file picker accepts a listening ZIP."
Write-Host "  [ ] The file picker accepts an extracted listening audio file."
Write-Host "  [ ] The audio playback control loads duration, plays, and pauses."
Write-Host "  [ ] The file picker accepts a reading PDF."
Write-Host "  [ ] PDF viewing renders passage and question pages."
Write-Host ""

Write-Host "Record the exact Windows Baidu Cloud sync folder and any failed checklist item in docs/superpowers/summaries/phase-9-packaging-cross-platform-progress.md."
