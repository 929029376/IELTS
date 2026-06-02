param(
  [string]$ManifestPath = ".\windows-package-manifest.json",
  [string]$InstallerPath = "",
  [string]$ReportPath = ".\windows-packaged-runtime-report.json",
  [string]$BaiduSyncPath = "",
  [string]$ListeningZipPath = "",
  [string]$AudioPath = "",
  [string]$ReadingPdfPath = "",
  [switch]$RequireInstalledApp,
  [switch]$RequireAppDataDir,
  [switch]$RequireBaiduSyncPath,
  [switch]$SkipLaunch
)

$ErrorActionPreference = "Stop"
$actualHash = ""
$installerHashVerified = $false
$appExe = ""
$launchChecked = $false
$processStayedRunning = $false
$launchedAppData = $null

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

  $installerHashVerified = $true
  Write-Host "Installer SHA256 check passed."
  Write-Host ""
}

function Join-IfRoot {
  param(
    [string]$Root,
    [string]$RelativePath
  )

  if ([string]::IsNullOrWhiteSpace($Root)) {
    return $null
  }

  return Join-Path $Root $RelativePath
}

$appDataCandidates = @(
  (Join-IfRoot $env:APPDATA "IELTS Local Practice"),
  (Join-IfRoot $env:APPDATA "local.ielts.practice"),
  (Join-IfRoot $env:LOCALAPPDATA "IELTS Local Practice"),
  (Join-IfRoot $env:LOCALAPPDATA "local.ielts.practice")
)
$expectedAppData = $appDataCandidates | Where-Object { $_ } | Select-Object -First 1
$expectedDatabase = if ($expectedAppData) { Join-Path $expectedAppData "ielts.db" } else { "ielts.db" }

function Get-AppDataDirectory {
  $existing = $appDataCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($existing) {
    return $existing
  }

  return $null
}

function Wait-AppDataDirectory {
  param(
    [int]$TimeoutSeconds = 30
  )

  for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
    $existing = Get-AppDataDirectory
    if ($existing) {
      return $existing
    }

    Start-Sleep -Seconds 1
  }

  return $null
}

$appExeFileNames = @("IELTS Local Practice.exe", "ielts-local-practice.exe")
$exeCandidates = @(
  (Join-IfRoot $env:LOCALAPPDATA "Programs\IELTS Local Practice\IELTS Local Practice.exe"),
  (Join-IfRoot $env:LOCALAPPDATA "Programs\IELTS Local Practice\ielts-local-practice.exe"),
  (Join-IfRoot $env:LOCALAPPDATA "Programs\ielts-local-practice\ielts-local-practice.exe"),
  (Join-IfRoot $env:LOCALAPPDATA "IELTS Local Practice\IELTS Local Practice.exe"),
  (Join-IfRoot $env:ProgramFiles "IELTS Local Practice\IELTS Local Practice.exe"),
  (Join-IfRoot ${env:ProgramFiles(x86)} "IELTS Local Practice\IELTS Local Practice.exe")
) | Where-Object { $_ -and (Test-Path $_) }

if ($exeCandidates.Count -eq 0) {
  $searchRoots = @(
    (Join-IfRoot $env:LOCALAPPDATA "Programs"),
    $env:LOCALAPPDATA,
    $env:ProgramFiles,
    ${env:ProgramFiles(x86)}
  ) | Where-Object { $_ -and (Test-Path $_) }

  foreach ($searchRoot in $searchRoots) {
    Write-Host ("Searching installed app executables under: {0}" -f $searchRoot)
    $found = Get-ChildItem -Path $searchRoot -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue |
      Where-Object {
        $appExeFileNames -contains $_.Name -or
        $_.FullName -match "IELTS Local Practice|ielts-local-practice|local\.ielts\.practice"
      } |
      Select-Object -First 5

    if (@($found).Count -gt 0) {
      Write-Host "Installed app executable candidates:"
      foreach ($candidateExe in @($found)) {
        Write-Host ("  {0}" -f $candidateExe.FullName)
      }

      $exeCandidates = @($found | Select-Object -ExpandProperty FullName)
      break
    }
  }
}

if ($exeCandidates.Count -gt 0) {
  $appExe = $exeCandidates[0]
  Write-Host ("Installed app executable found: {0}" -f $appExe)

  if (-not $SkipLaunch) {
    $launchChecked = $true
    $process = Start-Process -FilePath $appExe -PassThru
    Start-Sleep -Seconds 5
    $runningProcess = Get-Process -Id $process.Id -ErrorAction SilentlyContinue

    if (-not $runningProcess) {
      throw "IELTS Local Practice process did not stay running after launch."
    }

    $processStayedRunning = $true
    Write-Host ("Launch check passed. Process id: {0}" -f $runningProcess.Id)
    $launchedAppData = Wait-AppDataDirectory -TimeoutSeconds 30
    if ($launchedAppData) {
      Write-Host ("App data directory exists after launch: {0}" -f $launchedAppData)
    } elseif ($RequireAppDataDir) {
      throw "App data directory was required after launch but was not found."
    }

    Stop-Process -Id $runningProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Launch check process stopped."
  }
} else {
  Write-Host "Installed app executable was not found automatically."
  Write-Host "Expected one of:"
  Write-Host "  %LOCALAPPDATA%\Programs\IELTS Local Practice\IELTS Local Practice.exe"
  Write-Host "  %LOCALAPPDATA%\Programs\IELTS Local Practice\ielts-local-practice.exe"
  Write-Host "  %LOCALAPPDATA%\Programs\ielts-local-practice\ielts-local-practice.exe"
  Write-Host "  %LOCALAPPDATA%\IELTS Local Practice\IELTS Local Practice.exe"
  Write-Host "  %ProgramFiles%\IELTS Local Practice\IELTS Local Practice.exe"
  Write-Host "  %ProgramFiles(x86)%\IELTS Local Practice\IELTS Local Practice.exe"

  if ($RequireInstalledApp) {
    throw "Installed app executable was required but was not found."
  }
}

$detectedAppData = Get-AppDataDirectory
if ($detectedAppData) {
  Write-Host ("App data directory exists: {0}" -f $detectedAppData)
} else {
  Write-Host "App data directory not found yet."
  Write-Host "Expected one of:"
  foreach ($candidateAppData in $appDataCandidates) {
    if ($candidateAppData) {
      Write-Host ("  {0}" -f $candidateAppData)
    }
  }
  Write-Host "Open the app once and re-run this script after closing it."

  if ($RequireAppDataDir) {
    throw "App data directory was required but was not found."
  }
}

Write-Host ""

function Get-PathCheck {
  param(
    [string]$Label,
    [string]$Path
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return [ordered]@{
      label = $Label
      path = ""
      provided = $false
      exists = $false
      status = "not_provided"
    }
  }

  $exists = Test-Path $Path
  $status = "missing"
  if ($exists) {
    $status = "exists"
  }

  return [ordered]@{
    label = $Label
    path = $Path
    provided = $true
    exists = $exists
    status = $status
  }
}

$baiduSyncCheck = Get-PathCheck -Label "Baidu Cloud sync folder" -Path $BaiduSyncPath
if ($baiduSyncCheck.provided) {
  Write-Host ("Baidu Cloud sync folder supplied: {0}" -f $baiduSyncCheck.path)
  if ($baiduSyncCheck.exists) {
    Write-Host "Baidu Cloud sync folder exists."
  } elseif ($RequireBaiduSyncPath) {
    throw "BaiduSyncPath was required but the folder was not found: $BaiduSyncPath"
  } else {
    Write-Host "Baidu Cloud sync folder was not found."
  }
}

$assetChecks = @(
  (Get-PathCheck -Label "Listening ZIP" -Path $ListeningZipPath),
  (Get-PathCheck -Label "Listening audio" -Path $AudioPath),
  (Get-PathCheck -Label "Reading PDF" -Path $ReadingPdfPath)
)

$expectedSyncEvidence = "Record the selected Windows Baidu Cloud folder."
if ($BaiduSyncPath) {
  $expectedSyncEvidence = $BaiduSyncPath
}

$expectedZipEvidence = "Record the selected listening ZIP path."
if ($ListeningZipPath) {
  $expectedZipEvidence = $ListeningZipPath
}

$expectedAudioEvidence = "Record the selected listening audio path and observed duration."
if ($AudioPath) {
  $expectedAudioEvidence = $AudioPath
}

$expectedPdfEvidence = "Record the selected reading PDF path and rendered passage title."
if ($ReadingPdfPath) {
  $expectedPdfEvidence = $ReadingPdfPath
}

$manualChecklist = @(
  [ordered]@{
    id = "runtime-platform"
    label = "Desktop runtime diagnostics shows platform windows."
    status = "manual"
    expectedEvidence = "The diagnostics panel lists platform windows."
  },
  [ordered]@{
    id = "runtime-sqlite-path"
    label = "Desktop runtime diagnostics shows the expected SQLite path."
    status = "manual"
    expectedEvidence = $expectedDatabase
  },
  [ordered]@{
    id = "runtime-sync-path"
    label = "Desktop runtime diagnostics shows the selected Baidu Cloud sync folder."
    status = "manual"
    expectedEvidence = $expectedSyncEvidence
  },
  [ordered]@{
    id = "listening-zip-picker"
    label = "The file picker accepts a listening ZIP."
    status = "manual"
    expectedEvidence = $expectedZipEvidence
  },
  [ordered]@{
    id = "listening-audio-playback"
    label = "The file picker accepts an extracted listening audio file, and audio loads duration, plays, and pauses."
    status = "manual"
    expectedEvidence = $expectedAudioEvidence
  },
  [ordered]@{
    id = "reading-pdf-preview"
    label = "The file picker accepts a reading PDF, and PDF viewing renders passage and question pages."
    status = "manual"
    expectedEvidence = $expectedPdfEvidence
  }
)

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

$manifestSha256 = ""
if ($manifest -and $manifest.sha256) {
  $manifestSha256 = $manifest.sha256
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  manifestPath = $ManifestPath
  reportPath = $ReportPath
  manifest = $manifest
  installer = [ordered]@{
    path = $installerToCheck
    sha256 = $actualHash
    manifestSha256 = $manifestSha256
    hashVerified = $installerHashVerified
  }
  installedApp = [ordered]@{
    executablePath = $appExe
    found = (-not [string]::IsNullOrWhiteSpace($appExe))
    launchChecked = $launchChecked
    processStayedRunning = $processStayedRunning
  }
  appData = [ordered]@{
    detectedPath = $detectedAppData
    detectedAfterLaunch = $launchedAppData
    expectedCandidates = @($appDataCandidates | Where-Object { $_ })
    expectedDatabase = $expectedDatabase
  }
  baiduSync = $baiduSyncCheck
  assetChecks = $assetChecks
  manualChecklist = $manualChecklist
  nextAction = "Complete each manualChecklist item on Windows and attach this report to the Phase 9 summary."
}

$reportDir = Split-Path -Parent $ReportPath
if (-not [string]::IsNullOrWhiteSpace($reportDir)) {
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$report | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $ReportPath

Write-Host ("Verification report written to: {0}" -f $ReportPath)
Write-Host "Record the exact Windows Baidu Cloud sync folder and any failed checklist item in docs/superpowers/summaries/phase-9-packaging-cross-platform-progress.md."
