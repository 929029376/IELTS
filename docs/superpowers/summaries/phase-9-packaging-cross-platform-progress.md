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
- Verified Mac local web mode by starting `pnpm dev`:
  - API health returned `{"ok":true}` from `http://127.0.0.1:5174/health`,
  - Vite served the dashboard shell from `http://127.0.0.1:5173/`.
- Confirmed Tauri CLI is available:
  - `tauri-cli 2.11.2`.

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
- Mac local web mode verification:
  - `npx pnpm@9.15.4 dev` started server and web dev mode.
  - `curl -fsS http://127.0.0.1:5174/health` returned `{"ok":true}`.
  - `curl -fsS http://127.0.0.1:5173/` returned the Vite HTML shell.
- Final verification:
  - `npx pnpm@9.15.4 test`
    - Shared: 3 tests passed.
    - Server: 37 tests passed.
    - Web: 19 tests passed.
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
- Mac `.dmg` and Windows `.exe` package artifacts have not been built because the current machine does not have Rust/Cargo installed.
- File picker, audio playback, PDF viewing, SQLite path, and sync folder path still need hands-on verification on both Mac packaged app and Windows packaged app.

## Next Step

Install the Rust/Tauri build toolchain on Mac, build the Mac `.dmg`, verify packaged runtime behavior locally, then repeat on Windows for `.exe` generation and Windows runtime checks.
