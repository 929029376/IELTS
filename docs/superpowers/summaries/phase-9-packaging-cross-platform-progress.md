# Phase 9 Packaging and Cross-Platform Verification Progress

**Date:** 2026-06-01 to 2026-06-02

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Continued development directly on `master`.
- Confirmed the GitHub remote is cleaned up for single-branch development:
  `refs/heads/master` is the only remote branch and `origin/HEAD` points to
  `origin/master`.
- Added cross-platform runtime path helpers in `apps/server/src/config/runtimePaths.ts`.
- Added automated path tests for:
  - Mac app data path,
  - Mac SQLite path,
  - Mac Baidu Cloud sync path,
  - Windows app data path,
  - Windows user-selected Baidu Cloud sync path,
  - Windows-style file picker path normalization.
- Added Tauri desktop packaging scaffold under `apps/web/src-tauri`.
- Added Tauri CLI dependency to the web workspace.
- Added packaging scripts:
  - root `desktop:check`,
  - root `desktop:build:mac`,
  - root `desktop:build:win`,
  - web `desktop:build`,
  - web `desktop:build:mac`,
  - web `desktop:build:win`.
- Added `scripts/desktop-check.mjs` to verify Tauri config presence and bundle targets.
- Added `.github/workflows/windows-desktop-package.yml` so GitHub can build Windows NSIS
  installer artifacts from `master` and preserve the `.exe` as workflow evidence.
- Added a host-independence regression test for runtime paths after the first Windows
  packaging workflow run showed that server unit tests failed on `windows-latest`.
- Updated runtime path construction so Mac and Windows path outputs are based on the
  requested target platform instead of the operating system running the test.
- Generated the full Tauri desktop icon set from `apps/web/src-tauri/icons/icon.png`,
  including `icon.ico` for Windows NSIS packaging and `icon.icns` for Mac packaging.
- Updated the Tauri bundle config and desktop packaging checks to require the desktop
  icon set explicitly instead of relying on a single PNG.
- Confirmed remote `master` points to commit `f6a74d4` after the icon-set fix.
- Confirmed GitHub Actions run `26794619213` on `master` completed successfully and
  uploaded the Windows NSIS installer artifact `ielts-local-practice-windows-nsis`.
- Added a Windows local web smoke test to the GitHub Actions packaging workflow so
  `windows-latest` starts `pnpm dev` and verifies both the API health endpoint and
  Vite HTML shell before building the Windows installer.
- Added a Windows packaged runtime verification kit to the GitHub Actions packaging
  workflow. The kit includes a generated installer manifest and
  `scripts/windows-packaged-runtime-check.ps1` so the remaining Windows hands-on
  runtime checks can be run from the same workflow artifact set as the installer.
- Enhanced `scripts/windows-packaged-runtime-check.ps1` so the Windows verification
  kit can check the installer SHA256, locate the installed app executable, launch the
  app, verify the process remains running, and report the expected app data and
  SQLite paths before the remaining UI checklist.
- Fixed the Windows packaging workflow after the first strict silent-install run
  failed without preserving downloadable artifacts.
- Pinned the Windows packaging workflow to `windows-2022` for a stable runner image.
- Moved Windows installer and verification-kit artifact uploads before the packaged
  runtime install check, so future install-check failures still leave downloadable
  evidence.
- Hardened `scripts/windows-packaged-runtime-check.ps1` to search both
  `IELTS Local Practice.exe` and `ielts-local-practice.exe`, print discovered
  executable candidates, and check common `%LOCALAPPDATA%\Programs` install paths.
- Added a Windows packaged app launch smoke to the packaging workflow by removing
  `-SkipLaunch` from the CI verification step and stopping the launched app process
  after the process check passes.
- Added a required Windows app data directory smoke check to the packaging workflow.
  The verification script now accepts `-RequireAppDataDir`, waits for app data
  creation after launch, and supports both product-name and Tauri identifier paths
  such as `IELTS Local Practice` and `local.ielts.practice`.
- Added a Rust unit test for Tauri packaged runtime diagnostics field construction.
  Root `desktop:check` now runs that cargo test, including a Windows-shaped app data
  path, SQLite path, sync path, and file/audio/PDF runtime mode assertions.
- Enhanced the Windows verification kit so `windows-packaged-runtime-check.ps1` can
  write `windows-packaged-runtime-report.json`, record the optional Windows Baidu
  Cloud sync folder, record listening ZIP/audio/PDF asset paths, and preserve a
  structured manual checklist for the remaining Windows UI evidence.
- Added a Windows runtime report artifact upload after the packaged runtime install
  check, so the CI-generated `windows-packaged-runtime-report.json` is preserved
  separately from the installer and verification kit artifacts.
- Added a required Windows runtime report validation step before artifact upload.
  The workflow now parses `windows-packaged-runtime-report.json` with
  `ConvertFrom-Json` and fails CI if installer hash verification, installed app
  discovery, process launch smoke, app data detection, expected SQLite path, or the
  manual checklist evidence is missing.
- Added `docs/superpowers/windows-packaged-runtime-verification.md` to document the
  real Windows hands-on verification workflow. It covers artifact download, the
  `windows-packaged-runtime-check.ps1` PowerShell command, Baidu Cloud and asset
  path arguments, manual UI checks, `manualChecklist` report updates, and the Phase
  9 completion rule.
- Added `scripts/validate-windows-runtime-report.mjs` so a completed real Windows
  report can be checked automatically before Phase 9 is closed. It rejects missing
  installer hash evidence, installed app evidence, app data paths, Baidu Cloud path
  evidence, listening ZIP/audio/PDF path evidence, and any `manualChecklist` item
  that is not marked `passed`.
- Updated the Windows verification kit workflow to include
  `validate-windows-runtime-report.mjs` alongside `windows-packaged-runtime-check.ps1`,
  so a Windows machine only needs the installer artifact and verification kit
  artifact to generate and validate final Phase 9 evidence.
- Added `scripts/windows-verification-handoff.mjs` and root `pnpm windows:handoff`
  so the latest successful Windows Desktop Package run on `master`, required
  artifacts, artifact digests, download URLs, and final validation commands can be
  printed without relying on a stale hard-coded run id in the Windows verification
  guide.
- Added `scripts/mac-readiness-check.mjs` and root `pnpm mac:check` so the current
  Mac-first V1 work can be verified independently while Windows hands-on evidence
  is deferred.
- Installed Rust locally with `rustup` using `--no-modify-path` because `/Users/musheng/.bash_profile`
  is owned by `root` and cannot be modified by the current user.
- Added a Tauri icon at `apps/web/src-tauri/icons/icon.png`.
- Added `apps/web/src-tauri/Cargo.lock` so desktop builds are reproducible.
- Added `@tauri-apps/api` and a Tauri `desktop_runtime_status` command for packaged runtime diagnostics.
- Added a desktop runtime diagnostics panel in the Sync settings area.
- Added a packaged asset interaction verifier in the Sync settings area for selecting a listening ZIP,
  an extracted listening audio file, and a reading PDF inside the packaged app.
- Updated Mac desktop packaging to run Tauri with `--ci`, avoiding Finder AppleScript hangs during DMG creation.
- Built and verified the Mac DMG:
  - `apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg`.
- Mounted the DMG and confirmed it contains:
  - `IELTS Local Practice.app`,
  - `Applications` link,
  - app `Info.plist` with bundle identifier `local.ielts.practice`.
- Launched the app from the mounted DMG and confirmed the packaged runtime diagnostics panel showed:
  - platform `macos`,
  - app data directory `/Users/musheng/Library/Application Support/local.ielts.practice`,
  - SQLite path `/Users/musheng/Library/Application Support/local.ielts.practice/ielts.db`,
  - sync folder `/Users/musheng/Desktop/同步空间/IELTS-Sync`,
  - file picker mode `web-file-input`,
  - audio mode `html-audio`,
  - PDF mode `webview-pdf`.
- Exercised the packaged Mac app with real local assets:
  - selected listening ZIP
    `/Users/musheng/Desktop/IELTS/listening/IELTS Listening 虾滑/P4/高频/52. P4 Underwater Archaeological Sites.zip`,
  - extracted and selected `/private/tmp/ielts-audio-check/audio.mp3`,
  - selected reading PDF
    `/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/18. P1 - The History of Tea 茶叶的历史.pdf`,
  - confirmed the ZIP and PDF filenames rendered in the packaged app,
  - confirmed the audio preview showed duration `8:19`, played, and paused,
  - confirmed the PDF preview rendered `The History of Tea` passage and questions in the packaged WebView.
- Verified Mac local web mode by starting `pnpm dev`:
  - API health returned `{"ok":true}` from `http://127.0.0.1:5174/health`,
  - Vite served the dashboard shell from `http://127.0.0.1:5173/`.
- Confirmed Tauri CLI is available:
  - `tauri-cli 2.11.2`.
- Confirmed Rust toolchain is available for this shell when `~/.cargo/bin` is on `PATH`:
  - `rustc 1.96.0`,
  - `cargo 1.96.0`.

## Verification Evidence

- Red test evidence:
  - Initial runtime path test failed because `apps/server/src/config/runtimePaths.ts` did not exist.
  - Initial desktop packaging test failed because Tauri CLI dependency, root `desktop:check`, and `apps/web/src-tauri/tauri.conf.json` did not exist.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/runtimePaths.test.ts`
  - 3 runtime path tests passed.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - 3 desktop packaging configuration tests passed.
- `npx pnpm@9.15.4 desktop:check`
  - Desktop packaging configuration check passed.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - 4 desktop packaging configuration tests passed, including icon presence and Mac `--ci` packaging script.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because `.github/workflows/windows-desktop-package.yml` did not exist.
  - Passed after adding the Windows desktop packaging workflow.
- GitHub Actions run `26793775740`
  - Triggered by commit `a99258f` on `master`.
  - Failed at the `Run unit tests` step on `windows-latest`, before web build and NSIS packaging ran.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/runtimePathsHostIndependence.test.ts`
  - Initially failed because `node:path.join` let the runner OS change target-platform path output.
  - Passed after changing runtime path construction to normalize and append path segments explicitly.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/runtimePaths.test.ts`
  - 3 runtime path tests passed after the host-independence fix.
- GitHub Actions run `26794083343`
  - Triggered by commit `721d097` on `master`.
  - Passed the Windows unit tests, web build, and desktop packaging config check.
  - Failed at the `Build Windows NSIS installer` step.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because `apps/web/src-tauri/icons/icon.ico` did not exist.
  - Initially failed again because `tauri.conf.json` did not explicitly list bundle icons.
  - Passed after generating the Tauri icon set and adding `bundle.icon`.
- `npx pnpm@9.15.4 desktop:check`
  - Passed after requiring `32x32.png`, `128x128.png`, `128x128@2x.png`,
    `icon.icns`, `icon.ico`, and `icon.png`.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 27 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `git diff --check`
  - No whitespace errors reported.
- GitHub Actions run `26794619213`
  - Triggered by commit `f6a74d4` on `master`.
  - Passed Windows unit tests, web build, desktop packaging config check,
    Windows NSIS installer build, and Windows installer upload.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Artifact size: `1851855` bytes.
  - Artifact digest: `sha256:a5f1fc6fddde46d1ebd20c5ee797267b5ce6fb324a975bc1d4293790550195a2`.
  - Artifact expires at `2026-08-31T02:28:46Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows workflow did not include a local web smoke test.
  - Passed after requiring the workflow to start `pnpm dev` on `windows-latest` and
    verify `http://127.0.0.1:5174/health` plus `http://127.0.0.1:5173/`.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 27 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Desktop packaging configuration check passed.
- GitHub Actions run `26797896087`
  - Triggered by commit `90eb01f` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, desktop packaging
    config check, Windows NSIS installer build, and Windows installer upload.
  - The Windows local web smoke verified `http://127.0.0.1:5174/health` and
    `http://127.0.0.1:5173/` on `windows-latest`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Artifact size: `1853541` bytes.
  - Artifact digest: `sha256:26a6aa2da2fc84fff61c751a4257e30b3b6ee0f96538e7fa53015bb36502b77e`.
  - Artifact expires at `2026-08-31T04:11:41Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows workflow did not ship a packaged runtime
    verification kit.
  - Passed after adding the PowerShell checklist script and requiring the workflow to
    create `windows-package-manifest.json` plus upload
    `ielts-local-practice-windows-verification-kit`.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Desktop packaging configuration check passed.
- GitHub Actions run `26798309569`
  - Triggered by commit `d18abe0` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, desktop packaging
    config check, Windows NSIS installer build, Windows verification kit creation,
    Windows installer upload, and Windows verification kit upload.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1854090` bytes.
  - Installer artifact digest: `sha256:4a100f6fb3d62d922080ad47c430ce34614932e97a89ea4dc2de7ab9c57cf771`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `1440` bytes.
  - Verification kit artifact digest: `sha256:0351b6ec747eb43686565591640d947dd3546c1331d464a6c9a2ae6915286dac`.
  - Both artifacts expire at `2026-08-31T04:25:10Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows verification script did not include automated
    installer hash, installed executable, launch, process, and app data checks.
  - Passed after enhancing `windows-packaged-runtime-check.ps1`.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Desktop packaging configuration check passed.
- GitHub Actions run `26798729548`
  - Triggered by commit `b1cf5b6` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, desktop packaging
    config check, Windows NSIS installer build, Windows verification kit creation,
    Windows installer upload, and Windows verification kit upload.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1852978` bytes.
  - Installer artifact digest: `sha256:13d42a587846a5b47c60370cdbccaf9c119a803bce65e77cce6ae2746d314502`.
  - Uploaded enhanced artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `2101` bytes.
  - Verification kit artifact digest: `sha256:d2c0f3c9e69e735b776efe7a52c662b370bfae7fd9326f11b79f8333378ce14f`.
  - Both artifacts expire at `2026-08-31T04:38:16Z`.
- GitHub Actions run `26799247989`
  - Triggered by commit `f4c7fe7` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, desktop packaging
    config check, Windows NSIS installer build, and Windows verification kit creation.
  - Failed at `Verify Windows packaged runtime install`.
  - The REST logs endpoint returned `403` without repository admin rights, and the
    workflow uploaded no artifacts because upload steps were after the failing
    install-verification step.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the workflow did not wait after silent install, did not
    upload artifacts before install verification, and the verification script did not
    search for `ielts-local-practice.exe`.
  - Passed after pinning the runner to `windows-2022`, moving uploads before install
    verification, adding a post-install wait, and broadening installed executable
    discovery.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- GitHub Actions run `26799826230`
  - Triggered by commit `d73ba77` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, desktop packaging
    config check, Windows NSIS installer build, Windows verification kit creation,
    Windows installer upload, Windows verification kit upload, and Windows packaged
    runtime install verification.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1852528` bytes.
  - Installer artifact digest: `sha256:0b31d6f3fde5a8bcad4403a92fe2a412b3ab5e97081a9375f6ee186983abeecc`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `2540` bytes.
  - Verification kit artifact digest: `sha256:7fb8bc54e81312b12206522ab76a8c90041a7780d20ff7dec373cf7674aea34a`.
  - Both artifacts expire at `2026-08-31T05:11:30Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows workflow still passed `-SkipLaunch`.
  - Passed after requiring CI to launch the installed app and requiring the
    verification script to stop the smoke-test process.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- GitHub Actions run `26800364659`
  - Triggered by commit `55a5740` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, desktop packaging
    config check, Windows NSIS installer build, Windows verification kit creation,
    Windows installer upload, Windows verification kit upload, and Windows packaged
    runtime install plus launch smoke verification.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1852615` bytes.
  - Installer artifact digest: `sha256:9789aa48748010af073b8324df4d8e429447a1a12e4ca8303feebbc39bb06b78`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `2567` bytes.
  - Verification kit artifact digest: `sha256:dd68ebe9277336aa449a46400b194433f78108c127b4578fa53da8daa5bf333e`.
  - Both artifacts expire at `2026-08-31T05:27:44Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows workflow did not pass `-RequireAppDataDir`
    and the verification script did not include the `local.ielts.practice` app data
    candidate.
  - Passed after adding required app data detection, a post-launch wait, and
    product-name plus identifier-based app data candidates.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- GitHub Actions run `26801307144`
  - Triggered by commit `74c3959` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, desktop packaging
    config check, Windows NSIS installer build, Windows verification kit creation,
    Windows installer upload, Windows verification kit upload, and Windows packaged
    runtime install, launch smoke, and app data directory smoke verification.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1854147` bytes.
  - Installer artifact digest: `sha256:9b617a83f3d8714d3d22d66169cf068c4046b7862340e3b94c4d6d66cd693e2e`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `2824` bytes.
  - Verification kit artifact digest: `sha256:74ec35bf3801ad44c61aa1c4d8380261ea06157c1e019d13f1847d7530b59a35`.
  - Both artifacts expire at `2026-08-31T05:54:03Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because `scripts/desktop-check.mjs` did not run cargo runtime
    diagnostics tests.
  - Initially failed again because the local shell did not have `cargo` on `PATH`.
  - Passed after adding the `runtime_status_includes_packaged_modes` Rust test and
    a `~/.cargo/bin/cargo` fallback in `desktop:check`.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Rust test `runtime_status_includes_packaged_modes` passed.
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- `PATH="$HOME/.cargo/bin:$PATH" cargo fmt --manifest-path apps/web/src-tauri/Cargo.toml`
  - Could not run because `cargo-fmt` is not installed for the local stable toolchain.
  - Import ordering was kept tidy manually instead.
- GitHub Actions run `26821603976`
  - Triggered by commit `be1c53a` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, Windows
    `desktop:check` including Rust packaged runtime diagnostics, Windows NSIS
    installer build, Windows verification kit creation, artifact uploads, and
    Windows packaged runtime install, launch smoke, and app data directory smoke
    verification.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1852998` bytes.
  - Installer artifact digest: `sha256:4d44af00f98161addb37fb792692d6407d028064515757671c086ab0fd226436`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `2823` bytes.
  - Verification kit artifact digest: `sha256:01d382bfae236523398c6ade4e52a990aaed86aeaafb53fe0bf83363ae27b709`.
  - Both artifacts expire at `2026-08-31T13:04:44Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows verification kit manifest and script did
    not expose `manualReportName`, `ReportPath`, `BaiduSyncPath`,
    `ListeningZipPath`, `AudioPath`, `ReadingPdfPath`, `RequireBaiduSyncPath`, or
    `manualChecklist`.
  - Passed after extending the workflow manifest and PowerShell verifier.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Rust test `runtime_status_includes_packaged_modes` passed.
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- Local environment note:
  - `pwsh` is not installed on this Mac, so PowerShell execution of the updated
    verification script was verified by GitHub Actions on `windows-2022`.
- GitHub Actions run `26822605341`
  - Triggered by commit `cd33612` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, Windows
    `desktop:check` including Rust packaged runtime diagnostics, Windows NSIS
    installer build, Windows verification kit creation with `manualReportName`,
    artifact uploads, and Windows packaged runtime install, launch smoke, app data
    directory smoke, and updated PowerShell report-capable verifier execution.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1852979` bytes.
  - Installer artifact digest: `sha256:668d861640ac0b083aff8aa326a9b8e6d886eb350114a74194aa75776ca47cff`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `3895` bytes.
  - Verification kit artifact digest: `sha256:637dd0255e576ea22dc325322a3e9884484bd05fd396e03879ce43a378501e9d`.
  - Both artifacts expire at `2026-08-31T13:22:53Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows workflow did not pass `-ReportPath` and did
    not upload `ielts-local-practice-windows-runtime-report` after packaged runtime
    verification.
  - Passed after requiring the runtime report upload to occur after
    `Verify Windows packaged runtime install`.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Rust test `runtime_status_includes_packaged_modes` passed.
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- GitHub Actions run `26823453430`
  - Triggered by commit `c812f62` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, Windows
    `desktop:check` including Rust packaged runtime diagnostics, Windows NSIS
    installer build, Windows verification kit creation, installer upload,
    verification kit upload, Windows packaged runtime install, launch smoke, app
    data directory smoke, report-capable PowerShell verifier execution, and runtime
    report artifact upload.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1853879` bytes.
  - Installer artifact digest: `sha256:371586024336bcc3f026491dc3da0ca34ec849bf5b126fbae6ce73aecbd4800f`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `3894` bytes.
  - Verification kit artifact digest: `sha256:9bd70d62eac4969b8ccc394b2cc1ae7c7a2f3a555630db62fd0c8408cf47ea14`.
  - Uploaded artifact `ielts-local-practice-windows-runtime-report`.
  - Runtime report artifact size: `1338` bytes.
  - Runtime report artifact digest: `sha256:b98d1b627fdff3245c604d690b78f01422ed59a3f198f53c37d4f5a2e11ba312`.
  - All three artifacts expire at `2026-08-31T13:37:47Z`.
- Remote branch cleanup:
  - `git ls-remote --heads origin` returned only
    `refs/heads/master` at commit `7dcf48da1fa24c30998b2ef1d132359b0bb61e76`.
  - Local `master` and `origin/master` were aligned with no uncommitted changes.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows workflow did not include
    `Validate Windows runtime report`.
  - Passed after requiring the workflow to parse the generated report JSON with
    `ConvertFrom-Json` and assert the key installer, launch, app data, SQLite path,
    and manual checklist fields before upload.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 28 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Rust test `runtime_status_includes_packaged_modes` passed.
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- GitHub Actions run `26824224735`
  - Triggered by commit `7dcf48d` on `master`.
  - Passed Windows unit tests, web build, Windows local web smoke, Windows
    `desktop:check` including Rust packaged runtime diagnostics, Windows NSIS
    installer build, Windows verification kit creation, installer upload,
    verification kit upload, Windows packaged runtime install, launch smoke, app
    data directory smoke, runtime report validation, and runtime report upload.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1853819` bytes.
  - Installer artifact digest: `sha256:6cac9f2833a98a7803179a86e72700236b246b163fea487ecdf2989571b9bf16`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `3895` bytes.
  - Verification kit artifact digest: `sha256:a5d6368bbd7e9c68942002afc8c85f492147f9f86db57e9128bb4576a0d048f2`.
  - Uploaded artifact `ielts-local-practice-windows-runtime-report`.
  - Runtime report artifact size: `1344` bytes.
  - Runtime report artifact digest: `sha256:45a4701c19ca9a39f2d0d47c81ef493fdc7afa962aab31fcf604d7d8cb4f9c99`.
  - All three artifacts expire at `2026-08-31T13:51:05Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because `docs/superpowers/windows-packaged-runtime-verification.md`
    did not exist.
  - Passed after adding the Windows hands-on verification guide and requiring it to
    cover installer, verification kit, runtime report, PowerShell arguments, desktop
    runtime diagnostics, SQLite path, file picker, audio playback, PDF viewing,
    `manualChecklist`, and the Phase 9 completion rule.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because `scripts/validate-windows-runtime-report.mjs` did not
    exist.
  - Passed after adding a validator that accepts a fully passed Windows runtime
    report and rejects a report with incomplete `manualChecklist` evidence.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows verification kit workflow did not copy
    `scripts/validate-windows-runtime-report.mjs` into the artifact and the Windows
    hands-on guide did not say the validator is included in the verification kit.
  - Passed after shipping `validate-windows-runtime-report.mjs` in
    `windows-verification-kit/` and updating the Windows verification guide.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 30 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 desktop:check`
  - Rust test `runtime_status_includes_packaged_modes` passed.
  - Desktop packaging configuration check passed.
- `git diff --check`
  - No whitespace errors reported.
- GitHub Actions run `26826263442`
  - Triggered by commit `5446478` on `master`.
  - Passed Windows unit tests including the report validator coverage, web build,
    Windows local web smoke, Windows `desktop:check` including Rust packaged
    runtime diagnostics, Windows NSIS installer build, Windows verification kit
    creation, installer upload, verification kit upload, Windows packaged runtime
    install, launch smoke, app data directory smoke, runtime report validation, and
    runtime report upload.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1854550` bytes.
  - Installer artifact digest: `sha256:e44f3b662904f89369092f62dcf0f5aa94197568acbe4b4204c8bc076c152108`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `3896` bytes.
  - Verification kit artifact digest: `sha256:4362f2682411462fa561e4d255d1466bc537adef9339e1cd7d7bb210c2c7ce39`.
  - Uploaded artifact `ielts-local-practice-windows-runtime-report`.
  - Runtime report artifact size: `1344` bytes.
  - Runtime report artifact digest: `sha256:19828fadcbb6c4c28a55455280adcb0f0f5882eeb96b2bdad6643d45cbdc1deb`.
  - All three artifacts expire at `2026-08-31T14:25:28Z`.
- GitHub Actions run `26827197252`
  - Triggered by commit `3cc72f8` on `master`.
  - Passed Windows unit tests including the verification-kit validator coverage,
    web build, Windows local web smoke, Windows `desktop:check` including Rust
    packaged runtime diagnostics, Windows NSIS installer build, Windows verification
    kit creation with `validate-windows-runtime-report.mjs`, installer upload,
    verification kit upload, Windows packaged runtime install, launch smoke, app
    data directory smoke, runtime report validation, and runtime report upload.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1855067` bytes.
  - Installer artifact digest: `sha256:1536c4571087f2f7b42dc523a4451fd94bccf2238901538f2c5e65a0e7104bb8`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `5055` bytes.
  - Verification kit artifact digest: `sha256:3e61a4d4cfdd7c4b2fc407de7b5e648a5cb0d8bd5c0de5835a0c09830f1460b5`.
  - Uploaded artifact `ielts-local-practice-windows-runtime-report`.
  - Runtime report artifact size: `1341` bytes.
  - Runtime report artifact digest: `sha256:7738aa6ffc386d5381750f4c9048fff097ab2764263c0261034b74786b6c34c3`.
  - All three artifacts expire at `2026-08-31T14:40:50Z`.
- GitHub Actions run `26825215775`
  - Triggered by commit `02bf79e` on `master`.
  - Passed Windows unit tests including the Windows verification guide coverage,
    web build, Windows local web smoke, Windows `desktop:check` including Rust
    packaged runtime diagnostics, Windows NSIS installer build, Windows verification
    kit creation, installer upload, verification kit upload, Windows packaged
    runtime install, launch smoke, app data directory smoke, runtime report
    validation, and runtime report upload.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1857767` bytes.
  - Installer artifact digest: `sha256:999b4be001a475c0dec375ddb48fbdc9c6d87b3f68c497dddf46154691ac7fe3`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `3895` bytes.
  - Verification kit artifact digest: `sha256:733a53cf9189a05e716d728360550935626fa53092f13edd244cd1958c117611`.
  - Uploaded artifact `ielts-local-practice-windows-runtime-report`.
  - Runtime report artifact size: `1337` bytes.
  - Runtime report artifact digest: `sha256:8b0521295288e12bae60ba477bc893d1e279ff441f6fc95123691acb2c1a9633`.
  - All three artifacts expire at `2026-08-31T14:07:53Z`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopRuntimeDiagnostics.test.tsx`
  - 2 desktop runtime diagnostics tests passed.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopAssetVerifier.test.tsx`
  - Initially failed because `DesktopAssetVerifier` did not exist.
  - Passed after adding the verifier component and object URL mocks.
- `PATH="$HOME/.cargo/bin:$PATH" npx pnpm@9.15.4 desktop:build:mac`
  - Initially failed because `apps/web/src-tauri/icons/icon.png` was missing.
- `PATH="$HOME/.cargo/bin:$PATH" npx pnpm@9.15.4 desktop:build:mac`
  - Built `IELTS Local Practice_0.0.0_aarch64.dmg` through the root package script.
- `hdiutil verify apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg`
  - DMG checksum was valid.
- DMG mount inspection:
  - Mounted the generated DMG read-only.
  - Confirmed `IELTS Local Practice.app` and `Applications` link are present.
  - Confirmed `CFBundleIdentifier` is `local.ielts.practice`.
- Packaged app runtime inspection:
  - Started `IELTS Local Practice.app` from the mounted DMG.
  - Confirmed the app loaded at `tauri://localhost`.
  - Confirmed desktop runtime diagnostics rendered the Mac app data path, SQLite path, sync path, file picker mode, audio mode, and PDF mode.
- Packaged app real-asset inspection:
  - Confirmed the Mac file picker accepted the real high-frequency listening ZIP.
  - Confirmed the Mac file picker accepted the extracted MP3 from that listening ZIP.
  - Confirmed the packaged audio control loaded duration `8:19`, started playback, and paused.
  - Confirmed the Mac file picker accepted the real reading PDF.
  - Confirmed the packaged PDF preview rendered the reading passage and question pages.
- Final Mac DMG verification after adding packaged runtime diagnostics:
  - `PATH="$HOME/.cargo/bin:$PATH" npx pnpm@9.15.4 desktop:build:mac` completed successfully.
  - `hdiutil verify apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg` reported the checksum is valid.
- Mac local web mode verification:
  - `npx pnpm@9.15.4 dev` started server and web dev mode.
  - `curl -fsS http://127.0.0.1:5174/health` returned `{"ok":true}`.
  - `curl -fsS http://127.0.0.1:5173/` returned the Vite HTML shell.
- Final verification:
  - `npx pnpm@9.15.4 test`
    - Shared: 3 tests passed.
    - Server: 40 tests passed.
    - Web: 27 tests passed.
  - `npx pnpm@9.15.4 build`
    - Shared TypeScript build passed.
    - Server TypeScript build passed.
    - Web TypeScript and Vite production build passed.
  - `npx pnpm@9.15.4 db:migrate`
    - Migration command completed with `Database migrations applied.`
  - `npx pnpm@9.15.4 test:e2e`
    - 2 Playwright Chromium tests passed.
  - `npx pnpm@9.15.4 desktop:check`
    - Tauri desktop packaging configuration check passed.
  - `git diff --check`
    - No whitespace errors reported.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the root package did not expose `v1:check`.
  - Passed after adding `scripts/v1-readiness-check.mjs`, wiring root
    `v1:check`, and requiring a completed real Windows packaged runtime report
    before V1 can be treated as evidence-complete.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Windows hands-on guide did not document
    `observedEvidence`, and the runtime report validator accepted a passed manual
    checklist item without any observed Windows UI evidence text.
  - Passed after requiring non-empty `observedEvidence` for every passed manual
    checklist item, adding blank `observedEvidence` fields to the PowerShell report
    template, and updating the Windows hands-on guide.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the repo did not expose a `windows:handoff` command
    and the Windows verification guide still contained a stale hard-coded run id.
  - Passed after adding `scripts/windows-verification-handoff.mjs`, wiring the root
    `pnpm windows:handoff` command, making the guide point to that command, and
    fixture-testing the handoff output for required artifact names, digests, and
    final Windows validation commands.
- `node scripts/windows-verification-handoff.mjs`
  - Passed with network access.
  - Printed latest successful Windows packaging run `26829543197`, run URL
    `https://github.com/929029376/IELTS/actions/runs/26829543197`, and the three
    required artifacts with their current digests.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because root `mac:check` did not exist.
  - Passed after adding a Mac-only readiness command and script.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
  - Initially failed because the Mac readiness list exposed `npx pnpm@9.15.4`
    commands rather than the stable `pnpm ...` readiness commands.
  - Passed after changing the script list output to `pnpm test`,
    `pnpm test:e2e`, `pnpm build`, `pnpm desktop:check`, and
    `pnpm desktop:build:mac`.
- `node scripts/mac-readiness-check.mjs`
  - Passed on macOS.
  - Shared: 3 tests passed.
  - Server: 40 tests passed.
  - Web: 33 tests passed.
  - Playwright Chromium: 2 tests passed.
  - Production build passed.
  - `desktop:check` passed, including Rust runtime diagnostics.
  - Mac DMG packaging passed and generated
    `apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg`.
- GitHub Actions run `26829543197`
  - Triggered by commit `765e9fa` on `master`.
  - Passed Windows unit tests including the stricter observed-evidence coverage,
    web build, Windows local web smoke, Windows `desktop:check`, Windows NSIS
    installer build, Windows verification kit creation, installer upload,
    verification kit upload, Windows packaged runtime install, launch smoke, app
    data directory smoke, runtime report validation, and runtime report upload.
  - Used runner label `windows-2022`.
  - Uploaded artifact `ielts-local-practice-windows-nsis`.
  - Installer artifact size: `1855191` bytes.
  - Installer artifact digest: `sha256:0b07acefecbd78289ec8e4db0aa4d02caa0b96c6a713ef190040a6ebc870c7b7`.
  - Uploaded artifact `ielts-local-practice-windows-verification-kit`.
  - Verification kit artifact size: `5117` bytes.
  - Verification kit artifact digest: `sha256:d0df235f722e4f5356de37655eeb3f0132058062e5486b7baacff9f1117ad208`.
  - Uploaded artifact `ielts-local-practice-windows-runtime-report`.
  - Runtime report artifact size: `1351` bytes.
  - Runtime report artifact digest: `sha256:148d8e24ffe475f354d23da70fcb78325e1a994971c7ca282e34088b91432fa0`.
  - All three artifacts expire at `2026-08-31T15:19:20Z`.

## Remaining Phase 9 Work

- Windows local web mode is verified on `windows-2022` by GitHub Actions run `26829543197`.
- Windows `.exe` packaging is complete through the GitHub Actions artifact
  `ielts-local-practice-windows-nsis`.
- Windows packaged runtime hands-on verification now has a downloadable verification
  kit artifact with a manifest and PowerShell script that can automate installer hash,
  installed executable discovery, app launch, process, and app data checks before
  manual UI verification. The script can now also write a structured
  `windows-packaged-runtime-report.json` for the remaining hands-on evidence.
- Windows packaged runtime hands-on verification now has a repo-tracked guide at
  `docs/superpowers/windows-packaged-runtime-verification.md`.
- The guide now points to `pnpm windows:handoff` to fetch the latest successful
  Windows packaging run and required artifacts instead of relying on a stale run
  number.
- Completed Windows packaged runtime reports can now be checked with
  `node scripts/validate-windows-runtime-report.mjs <report-path>` before Phase 9
  is closed.
- The Windows verification kit artifact now includes the report validator, so the
  final command can be run as `node .\validate-windows-runtime-report.mjs
  .\windows-packaged-runtime-report.json` from the extracted kit folder.
- Root `pnpm v1:check -- --windows-report <report-path>` now acts as the V1
  evidence gate. It remains intentionally blocked until the real Windows hands-on
  runtime report validates successfully.
- Root `pnpm mac:check` now acts as the Mac-first V1 readiness gate while Windows
  work is deferred.
- The final Windows report must include non-empty `observedEvidence` on every
  passed manual checklist item, so Phase 9 evidence records what was actually seen
  in the packaged Windows UI.
- Windows packaged runtime diagnostics field construction is verified by `desktop:check`
  on `windows-2022` through GitHub Actions run `26829543197`.
- Windows packaged runtime silent install, launch smoke, app data directory smoke,
  report-capable PowerShell verifier execution, runtime report JSON validation, and
  runtime report artifact upload are verified in GitHub Actions run `26829543197`.
- Windows packaged runtime diagnostics, file picker, audio playback, PDF viewing, SQLite path, and sync folder path still need a real Windows environment.

## Next Step

Per the 2026-06-02 direction, Windows hands-on verification is deferred while the
Mac implementation is finished first. Continue Mac work behind `pnpm mac:check`.
When Windows work resumes, download the Windows NSIS installer artifact and Windows
verification kit artifact from the latest successful run printed by
`pnpm windows:handoff`, then run `windows-packaged-runtime-check.ps1` on a Windows
environment with the downloaded installer path. Use `-ReportPath`, and optionally
pass `-BaiduSyncPath`, `-ListeningZipPath`, `-AudioPath`, and `-ReadingPdfPath`, so
the generated `windows-packaged-runtime-report.json` captures the remaining file
picker, audio playback, PDF viewing, SQLite path, and Baidu Cloud sync folder
evidence. After marking every manual checklist item as `passed` and adding
`observedEvidence` text to each item, run
`node .\validate-windows-runtime-report.mjs .\windows-packaged-runtime-report.json`
from the extracted verification kit folder and record the passing validator output
in this summary. Then run `npx pnpm@9.15.4 v1:check -- --windows-report
<report-path>` from the repo root before closing cross-platform V1.
