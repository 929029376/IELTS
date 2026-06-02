# Phase 9 Packaging and Cross-Platform Verification Progress

**Date:** 2026-06-01

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
    - Server: 39 tests passed.
    - Web: 26 tests passed.
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

- Windows local web mode still needs a real Windows run.
- Windows `.exe` package artifact still needs a Windows build environment.
- The Windows GitHub Actions packaging workflow needs to run on GitHub and produce an
  `apps/web/src-tauri/target/release/bundle/nsis/*.exe` artifact before marking the
  Windows `.exe` item complete.
- Windows packaged runtime diagnostics, file picker, audio playback, PDF viewing, SQLite path, and sync folder path still need a real Windows environment.

## Next Step

Run the Windows Desktop Package GitHub Actions workflow on `master`, download the NSIS
installer artifact, then repeat local web, packaged runtime diagnostics, file picker,
audio playback, PDF viewing, SQLite path, and Baidu Cloud sync folder checks on a
Windows environment.
