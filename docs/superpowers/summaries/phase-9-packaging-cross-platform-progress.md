# Phase 9 Packaging and Cross-Platform Verification Progress

**Date:** 2026-06-01 to 2026-06-02

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Continued development directly on `master`.
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

## Remaining Phase 9 Work

- Windows local web mode is verified on `windows-latest` by GitHub Actions run `26797896087`.
- Windows `.exe` packaging is complete through the GitHub Actions artifact
  `ielts-local-practice-windows-nsis`.
- Windows packaged runtime hands-on verification now has a downloadable verification
  kit artifact with a manifest and PowerShell checklist script.
- Windows packaged runtime diagnostics, file picker, audio playback, PDF viewing, SQLite path, and sync folder path still need a real Windows environment.

## Next Step

Download the Windows NSIS installer artifact and Windows verification kit artifact from
GitHub Actions run `26798309569`, then run `windows-packaged-runtime-check.ps1` on a
Windows environment while checking packaged runtime diagnostics, file picker, audio
playback, PDF viewing, SQLite path, and Baidu Cloud sync folder behavior.
