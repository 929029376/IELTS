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
- Added a Mac dashboard study queue backed by `/api/study/overview`, replacing
  another static entry point with live local question-bank readiness and
  high-frequency-first recommended mock sets.
- Added a Mac intensive study preview backed by `/api/study/intensive`, replacing
  the dashboard's static intensive listening and close-reading content whenever
  local cue and answer-evidence data is available.
- Added Mac intensive study write hardening:
  - cue creation now posts to `POST /api/study/listening-cues`,
  - dictation submit now posts to `POST /api/study/dictation-attempts`,
  - newly saved cues immediately appear in sentence repeat controls.
- Added Mac close-reading mistake-label hardening:
  - intensive reading preview now exposes the latest wrong reading answer id,
  - mistake-label buttons persist through `POST /api/study/mistake-labels`,
  - saved labels can be appended to Baidu Cloud `mistakes.jsonl` when sync is
    configured.
- Added Mac close-reading answer-evidence hardening:
  - intensive reading preview now exposes the local reading `answerKeyId`,
  - selected passage text persists through `POST /api/study/answer-sentence`,
  - saved evidence immediately becomes the highlighted answer sentence in the
    Mac close-reading panel.
- Hardened mock start behavior so local mock attempts now use the frequency-weighted
  full-set builder instead of sequential question loading.
- Added frontend mock-start controls in the Mock Exam Center so the dashboard can
  start reading or listening mock attempts through the local practice API.
- Added frontend local mock completion controls so the active mock attempt can:
  - render answer inputs for returned question-bank questions,
  - save answers through the practice answer API,
  - submit through the practice submit API,
  - show the returned raw score and estimated band report.
- Added submitted-mock review hardening:
  - `GET /api/practice/:attemptId/review` now returns detailed answer evidence,
  - the Mac dashboard renders correctness, user answer, accepted answer, answer
    sentence highlight, explanation, and synonym notes after submission.
- Added local mock resource hardening:
  - `POST /api/practice/start` now returns imported passage text, source asset
    paths, and listening audio metadata with started mock questions,
  - the Mac reading mock pane renders imported passage text when available,
  - the Mac listening mock player displays the selected local audio path and
    duration metadata.
- Added report-export UI hardening:
  - dashboard report buttons now call `POST /api/reports/export`,
  - generated mock JSON, mock CSV, and mistakes CSV paths are shown in the Mac UI.
- Added manual sync UI hardening:
  - the dashboard Manual sync action now calls `POST /api/sync/import`,
  - imported, skipped, and conflict counts are rendered after the sync completes.
- Added manual backup hardening for intensive listening:
  - backup export/import now includes `dictation_attempts`,
  - restore order keeps `dictation_attempts` after `listening_cues` so cue
    foreign keys remain valid.
- Added Mac intensive listening sync hardening:
  - sentence cue creation now appends `intensive.listening_cue.created` events,
  - dictation attempt saving now appends `intensive.dictation_attempt.saved`
    events,
  - both event types are written to Baidu Cloud `stats.jsonl` for cross-device
    practice-record continuity,
  - unresolved remote intensive events are skipped instead of crashing manual
    sync when the current device has not imported matching question-bank rows.
- Stabilized the question-bank import panel regression so sequential import
  actions wait for the shared import lock to release before submitting the next
  local import request.

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
- Mac mock-start UI follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the dashboard exam preview had no `Start reading mock`
      action.
    - Passed after adding the local mock-start controls and loaded question list.
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
- Mac study queue follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts src/test/testBuilder.test.ts`
    - Initially failed with `404` for `/api/study/overview`.
    - Passed after adding the study overview API.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because the dashboard did not render `Local study queue`.
    - Passed after adding the local study queue UI.
  - `npx pnpm@9.15.4 build`
    - Passed after narrowing the test-only `server.db` type assertion.
  - `npx pnpm@9.15.4 test:e2e`
    - Passed with Playwright coverage for the study queue region.
- Mac intensive study live-data follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed with `404` because `/api/study/intensive` did not exist.
    - Passed after adding the intensive study preview API.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because the dashboard did not render live intensive study
      data from the local API.
    - Passed after loading and rendering local listening cues and reading evidence.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the intensive live-data wiring, including Mac DMG packaging.
- Mac intensive study write follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because cue creation and dictation write APIs did not exist,
      and listening passages without cues were not returned for editing.
    - Passed after adding the local write routes and editable listening preview.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the cue editor and dictation submit controls were
      no-ops.
    - Passed after wiring them to local APIs and rendering saved/correctness
      status.
- Mac close-reading mistake-label follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts src/test/syncRoutes.test.ts`
    - Initially failed because the intensive reading preview did not return the
      latest wrong answer id needed for labeling.
    - Passed after adding the preview id and mistake-label write route.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx src/test/dashboard.test.tsx`
    - Initially failed because close-reading mistake-label buttons were still
      no-ops.
    - Passed after wiring the buttons to local persistence and saved-status UI.
- Mac close-reading answer-evidence follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because the intensive reading preview did not expose the
      `answerKeyId` required to update `answer_keys.answer_sentence`.
    - Passed after adding the answer-sentence update route and returning the key
      id from the intensive preview API.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx src/test/dashboard.test.tsx`
    - Initially failed because the Mac close-reading evidence selection button
      did not call a local API or update the highlight.
    - Passed after wiring selected text persistence and saved-status rendering.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the close-reading answer-evidence hardening follow-up,
      including unit/component tests, Playwright, production build, desktop
      diagnostics, and Mac DMG packaging.
- Mac mock-start hardening follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because mock start loaded sequential questions and included
      two P1 passages.
    - Passed after mock start used the frequency-weighted full-set builder.
  - `npx pnpm@9.15.4 build`
    - Shared, server, and web production builds passed.
- Mac local mock completion follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the started local mock set rendered only a summary
      and no answer field.
    - Passed after wiring answer save, submit, and score report display to the
      active local attempt.
- Mac detailed mock review follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because the review API did not include detailed review
      items.
    - Passed after returning answer key, answer sentence, explanation, synonym,
      and correctness details.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because submitting a local mock did not show a detailed
      review region.
    - Passed after rendering the submitted-mock review panel.
- Mac local mock resource follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because started mock questions did not include imported
      passage text, asset paths, or listening audio metadata.
    - Passed after extending the practice service response.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the Mac exam UI still used placeholder passage text
      and did not show the local listening audio resource.
    - Passed after rendering API-provided passage text, audio path, and duration.
- Mac report export follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because report export buttons were static.
    - Passed after wiring them to the reports export API and rendering exported
      local file paths.
- Mac manual sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
    - Initially failed because the Manual sync button did not call the sync API or
      show a completion status.
    - Passed after wiring it to `POST /api/sync/import` and rendering imported,
      skipped, and conflict counts.
- Mac manual backup intensive-listening follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/backupService.test.ts`
    - Initially failed because manual backup JSON did not include
      `dictation_attempts`.
    - Passed after including dictation attempts in export/import and verifying
      restored intensive attempts can be listed by cue.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the manual backup intensive-listening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac intensive listening sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because the cue and dictation study routes persisted local
      SQLite rows but did not append Baidu Cloud sync events.
    - Passed after appending intensive cue and dictation events to `stats.jsonl`.
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed with a foreign-key crash when a remote intensive event
      referenced a passage or cue missing from the current Mac database.
    - Passed after treating unresolved remote intensive events as skipped during
      sync import.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the intensive listening sync hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac readiness follow-up:
  - `node scripts/mac-readiness-check.mjs`
    - Initially failed because the question-bank import panel regression clicked
      the next import action before the shared import lock released.
    - Passed after waiting for each sequential import action to become enabled.

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
