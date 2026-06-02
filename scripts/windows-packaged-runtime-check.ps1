param(
  [string]$ManifestPath = ".\windows-package-manifest.json",
  [string]$InstallerPath = "",
  [switch]$SkipLaunch
)

$ErrorActionPreference = "Stop"

Write-Host "IELTS Local Practice - Windows packaged runtime verification"
Write-Host ""

$manifest = $null
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

$installerToCheck = $InstallerPath
if (-not $installerToCheck -and $manifest -and $manifest.installerName) {
  $candidate = Join-Path (Split-Path -Parent $ManifestPath) $manifest.installerName
  if (Test-Path $candidate) {
    $installerToCheck = $candidate
  }
}

if ($installerToCheck) {
  if (-not (Test-Path $installerToCheck)) {
    throw "InstallerPath was provided but the file does not exist: $installerToCheck"
  }

  $actualHash = (Get-FileHash -Path $installerToCheck -Algorithm SHA256).Hash.ToLowerInvariant()
  Write-Host ("Installer SHA256 from file: {0}" -f $actualHash)

  if ($manifest -and $manifest.sha256 -and $actualHash -ne $manifest.sha256) {
    throw "Installer SHA256 does not match the manifest."
  }

  Write-Host "Installer SHA256 check passed."
  Write-Host ""
}

$expectedAppData = Join-Path $env:APPDATA "IELTS Local Practice"
$expectedDatabase = Join-Path $expectedAppData "ielts.db"
$exeCandidates = @(
  (Join-Path $env:LOCALAPPDATA "IELTS Local Practice\IELTS Local Practice.exe"),
  (Join-Path $env:ProgramFiles "IELTS Local Practice\IELTS Local Practice.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "IELTS Local Practice\IELTS Local Practice.exe")
) | Where-Object { $_ -and (Test-Path $_) }

if ($exeCandidates.Count -gt 0) {
  $appExe = $exeCandidates[0]
  Write-Host ("Installed app executable found: {0}" -f $appExe)

  if (-not $SkipLaunch) {
    $process = Start-Process -FilePath $appExe -PassThru
    Start-Sleep -Seconds 5
    $runningProcess = Get-Process -Id $process.Id -ErrorAction SilentlyContinue

    if (-not $runningProcess) {
      throw "IELTS Local Practice process did not stay running after launch."
    }

    Write-Host ("Launch check passed. Process id: {0}" -f $runningProcess.Id)
  }
} else {
  Write-Host "Installed app executable was not found automatically."
  Write-Host "Expected one of:"
  Write-Host "  %LOCALAPPDATA%\IELTS Local Practice\IELTS Local Practice.exe"
  Write-Host "  %ProgramFiles%\IELTS Local Practice\IELTS Local Practice.exe"
  Write-Host "  %ProgramFiles(x86)%\IELTS Local Practice\IELTS Local Practice.exe"
}

if (Test-Path $expectedAppData) {
  Write-Host ("App data directory exists: {0}" -f $expectedAppData)
} else {
  Write-Host ("App data directory not found yet: {0}" -f $expectedAppData)
  Write-Host "Open the app once and re-run this script after closing it."
}

Write-Host ""

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
