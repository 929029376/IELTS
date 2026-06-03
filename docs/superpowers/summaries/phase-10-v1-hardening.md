# Phase 10 V1 Hardening

**Date:** 2026-06-01 to 2026-06-02

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Continued development directly on `master`.
- Added V1 hardening service and API routes:
  - `GET /api/hardening/import-failures`,
  - `GET /api/hardening/question-bank-completeness`,
  - `GET /api/hardening/backup-reminder`,
  - `GET /api/hardening/status`.
- Added import failure reporting for unresolved `failed` and `needs_review` sources, including source path, status, version, and asset count.
- Added question-bank completeness checks for:
  - missing answer key,
  - missing explanation,
  - missing audio,
  - missing transcript,
  - missing listening cues,
  - missing frequency entry.
- Added backup reminder logic based on submitted attempt count and recent backup age.
- Added frontend readiness surfaces:
  - V1 hardening center,
  - import failure report,
  - question-bank completeness page,
  - backup reminder,
  - Baidu Cloud JSONL sync settings preview.
- Added UI empty states for:
  - no import issues,
  - no question-bank data,
  - no completed history,
  - no accuracy analytics,
  - no mistake labels.
- Added a root V1 readiness gate:
  - `pnpm v1:check` requires a real Windows packaged runtime report,
  - the gate delegates completed-report validation to
    `scripts/validate-windows-runtime-report.mjs`,
  - the completed-report validator now requires non-empty `observedEvidence` for
    each passed Windows manual checklist item,
  - the gate prevents V1 from being marked complete while the remaining Windows
    hands-on evidence is missing.
- Added a Mac-only V1 readiness gate for the current priority shift:
  - root `pnpm mac:check`,
  - `scripts/mac-readiness-check.mjs`,
  - the gate verifies unit/component coverage, Playwright main UI flow, production
    build, desktop runtime diagnostics, and Mac DMG packaging without requiring the
    deferred Windows report.
- Expanded Playwright coverage for dashboard, import report, practice, mock exam, review, history, and sync settings anchors.
- Added a Mac self-use question-bank import surface:
  - local listening directory import,
  - local reading PDF directory import,
  - frequency CSV/XLSX import,
  - corrected manual frequency row import,
  - Playwright anchors for the Question Bank import region and default Mac local paths.
- Replaced static dashboard hardening sample data with live local API data from
  `/api/hardening/status`.
- Updated Playwright configuration so the dashboard regression starts the root
  development command and waits for the local API health endpoint before testing
  the web app.

## Verification Evidence

- Red test evidence:
  - `apps/server/src/test/hardeningService.test.ts` first failed because `apps/server/src/services/hardeningService.ts` did not exist.
  - `apps/web/src/test/hardeningCenter.test.tsx` first failed because `apps/web/src/features/hardening/HardeningCenter.tsx` did not exist.
  - `pnpm test:e2e` first failed because the `Sync settings` region did not exist.
- Targeted verification:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/hardeningService.test.ts`
    - 2 tests passed.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/hardeningCenter.test.tsx`
    - 3 tests passed.
  - `npx pnpm@9.15.4 test:e2e`
    - 2 Playwright tests passed.
- V1 readiness gate:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
    - Initially failed because root `v1:check` did not exist.
    - Passed after adding `scripts/v1-readiness-check.mjs` and test coverage
      proving it fails without Windows hands-on evidence and passes with a
      completed Windows runtime report fixture.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
    - Initially failed because reports could pass with manual checklist statuses
      but no observed Windows UI evidence text.
    - Passed after requiring non-empty `observedEvidence` on every passed Windows
      manual checklist item.
- Mac-only readiness gate:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
    - Initially failed because root `mac:check` did not exist.
    - Passed after adding `scripts/mac-readiness-check.mjs` and test coverage for
      a Mac-only readiness command that does not require a Windows report.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
    - Initially failed because the Mac readiness list exposed `npx pnpm@9.15.4`
      instead of the stable `pnpm ...` gate commands.
    - Passed after changing the script to present `pnpm` commands while resolving
      the available pnpm executable at runtime.
  - `node scripts/mac-readiness-check.mjs`
    - Passed on macOS with network permission for the `npx pnpm@9.15.4` fallback.
    - Shared: 3 tests passed.
    - Server: 40 tests passed.
    - Web: 33 tests passed.
    - Playwright Chromium: 2 tests passed.
    - Production build passed.
    - `desktop:check` passed, including Rust runtime diagnostics.
    - Mac DMG packaging passed and generated
      `apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg`.
- Full verification:
  - `npx pnpm@9.15.4 test`
    - Shared: 3 tests passed.
    - Server: 39 tests passed.
    - Web: 22 tests passed.
  - `npx pnpm@9.15.4 build`
    - Shared TypeScript build passed.
    - Server TypeScript build passed.
    - Web TypeScript and Vite production build passed.
  - `npx pnpm@9.15.4 db:migrate`
    - Migration command completed with `Database migrations applied.`
- Mac question-bank import follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/importRoutes.test.ts`
    - Initially failed with 404 because the import API routes were missing.
    - Passed after adding import routes and wiring them into `buildServer`.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/questionBankImportPanel.test.tsx`
    - Initially failed because the Question Bank import panel did not exist.
    - Passed after adding the panel and local import API calls.
  - `npx pnpm@9.15.4 test:e2e`
    - 2 Playwright Chromium tests passed with Question Bank import anchors.
  - `npx pnpm@9.15.4 build`
    - Shared, server, and web production builds passed.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after adding the Question Bank import API and dashboard panel.
    - Shared: 3 tests passed.
    - Server: 41 tests passed.
    - Web: 34 tests passed.
    - Playwright Chromium: 2 tests passed.
    - Production build passed.
    - `desktop:check` passed.
    - Mac DMG packaging passed and generated
      `apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg`.
- Browser verification:
  - Opened `http://127.0.0.1:5173/` in the in-app browser.
  - Confirmed the page title, V1 hardening center, and sync settings were present.
  - Confirmed no horizontal overflow at the checked viewport.
- Mac live-dashboard follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because the dashboard still used sample report data.
    - Passed after loading report and hardening data through the local API.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/desktopPackaging.test.ts`
    - Initially failed because Playwright only started the web dev server.
    - Passed after changing Playwright to start the root `pnpm dev` command and
      wait on `http://127.0.0.1:5174/health`.
  - `npx pnpm@9.15.4 test:e2e`
    - Passed with the local API and web app running together.

## Remaining V1 Gaps

- Phase 9 remains partially blocked by environment:
  - Windows local web mode is verified in GitHub Actions on `windows-2022`.
  - Mac `.dmg` packaging and packaged Mac hands-on checks are complete.
  - Windows `.exe` packaging is complete through the GitHub Actions artifact
    `ielts-local-practice-windows-nsis`.
  - A Windows verification kit artifact now ships with the installer and includes a
    manifest plus `windows-packaged-runtime-check.ps1`, including automated installer
    hash, installed executable discovery, app launch, process, app data checks, and
    structured `windows-packaged-runtime-report.json` output before the remaining UI
    checklist.
  - GitHub Actions run `26829543197` on `master` passed Windows unit tests,
    including stricter observed-evidence coverage, web build, Windows local web
    smoke, `desktop:check` with Rust packaged runtime diagnostics, Windows NSIS
    build, artifact uploads, and Windows packaged runtime silent-install plus
    launch smoke plus app data directory verification plus report-capable
    PowerShell verifier execution plus runtime report JSON validation plus runtime
    report artifact upload on `windows-2022`.
  - Windows packaged runtime diagnostics field construction is verified in CI, but
    the rendered diagnostics panel still needs hands-on inspection on a real
    Windows environment.
  - A repo-tracked Windows hands-on verification guide now documents the exact
    artifact set, PowerShell command, manual checklist, and report completion rule
    needed to close the remaining Phase 9 evidence gap.
  - A repo-tracked Windows runtime report validator now checks the completed report
    before Phase 9 can be closed.
  - A root `pnpm windows:handoff` command now prints the latest successful Windows
    Desktop Package run on `master`, required artifact names, artifact digests,
    download URLs, and the remaining Windows validation commands.
  - The Windows verification kit artifact from run `26829543197` ships that
    validator, reducing the real Windows validation dependency to the downloaded
    installer and kit artifacts.
  - Windows packaged runtime diagnostics, file picker, audio playback, PDF viewing,
    SQLite path, and sync folder path still need hands-on verification on a real
    Windows environment.
