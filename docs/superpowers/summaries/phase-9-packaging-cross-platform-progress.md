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
- Installed Rust locally with `rustup` using `--no-modify-path` because `/Users/musheng/.bash_profile`
  is owned by `root` and cannot be modified by the current user.
- Added a Tauri icon at `apps/web/src-tauri/icons/icon.png`.
- Added `apps/web/src-tauri/Cargo.lock` so desktop builds are reproducible.
- Updated Mac desktop packaging to run Tauri with `--ci`, avoiding Finder AppleScript hangs during DMG creation.
- Built and verified the Mac DMG:
  - `apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg`.
- Mounted the DMG and confirmed it contains:
  - `IELTS Local Practice.app`,
  - `Applications` link,
  - app `Info.plist` with bundle identifier `local.ielts.practice`.
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
- Mac local web mode verification:
  - `npx pnpm@9.15.4 dev` started server and web dev mode.
  - `curl -fsS http://127.0.0.1:5174/health` returned `{"ok":true}`.
  - `curl -fsS http://127.0.0.1:5173/` returned the Vite HTML shell.
- Final verification:
  - `npx pnpm@9.15.4 test`
    - Shared: 3 tests passed.
    - Server: 39 tests passed.
    - Web: 23 tests passed.
  - `npx pnpm@9.15.4 build`
    - Shared TypeScript build passed.
    - Server TypeScript build passed.
    - Web TypeScript and Vite production build passed.
  - `npx pnpm@9.15.4 db:migrate`
    - Migration command completed with `Database migrations applied.`
  - `npx pnpm@9.15.4 test:e2e`
    - Playwright Chromium dashboard and exam preview test passed.
  - `npx pnpm@9.15.4 desktop:check`
    - Tauri desktop packaging configuration check passed.
  - `git diff --check`
    - No whitespace errors reported.

## Remaining Phase 9 Work

- Windows local web mode still needs a real Windows run.
- Windows `.exe` package artifact still needs a Windows build environment.
- File picker, audio playback, PDF viewing, SQLite path, and sync folder path still need hands-on verification in the packaged Mac app and in the packaged Windows app.

## Next Step

Run the generated Mac app interactively to verify packaged runtime behavior, then repeat on Windows for `.exe` generation and Windows runtime checks.
