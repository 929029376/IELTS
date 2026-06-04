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
  - missing answer sentence,
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
- Added Mac intensive real-audio repeat hardening:
  - `/api/study/intensive` now returns the selected listening passage's local
    audio path,
  - the intensive listening player renders that local audio through
    `GET /api/assets/local`,
  - sentence repeat buttons seek to cue start times and loop back at cue end
    times for focused dictation practice.
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
- Added frontend free-practice controls in the Mock Exam Center so the dashboard
  can start reading or listening practice attempts through the same local
  practice API without entering mock mode.
- Added Mac listening practice playback hardening so listening practice passes
  the active practice mode into the player, keeping Pause, Seek, Speed, and the
  native local audio controls available for self-paced work.
- Added Mac practice-filter hardening:
  - practice starts can filter by part, frequency class, question type, and
    historical mistake label,
  - the dashboard exposes those filters before starting reading or listening
    practice.
- Added Mac IELTS word-limit scoring hardening:
  - imported or manually authored `wordLimit` strings are parsed alongside
    `maxWords`,
  - `NO MORE THAN TWO WORDS AND/OR A NUMBER` allows the number outside the word
    count,
  - practice and mock answers use the shared scoring behavior.
- Added frontend local mock completion controls so the active mock attempt can:
  - render answer inputs for returned question-bank questions,
  - save answers through the practice answer API,
  - open functional exam topbar Help and Settings panels,
  - toggle large interface text from the Settings panel,
  - mark questions for review and keep those marks visible in the local mock
    question navigation,
  - use the exam topbar `Mark for review` control to toggle the current local
    mock question,
  - jump from bottom question navigation items to the matching passage or
    listening section,
  - keep the listening section tabs, visible questions, and active audio metadata
    synchronized when bottom question navigation jumps to another listening
    section,
  - persist the marked-for-review flag with answer-save requests,
  - save current answer field state immediately before submit,
  - stop submission when the pre-submit answer save fails,
  - submit through the practice submit API,
  - show the returned raw score and estimated band report.
- Added submitted-mock review hardening:
  - `GET /api/practice/:attemptId/review` now returns detailed answer evidence,
  - the Mac dashboard renders correctness, user answer, accepted answer, answer
    sentence highlight, explanation, and synonym notes after submission.
- Added Mac history review reopening hardening:
  - completed attempts in the report history table can reopen the saved detailed
    review through `GET /api/practice/:attemptId/review`,
  - the Mac reports panel renders answer sentence highlights, explanations,
    accepted answers, synonym notes, and saved sync conflicts for the selected
    historical attempt.
- Added local mock resource hardening:
  - `POST /api/practice/start` now returns imported passage text, source asset
    paths, and listening audio metadata with started mock questions,
  - the Mac reading mock pane renders imported passage text when available,
  - the Mac listening mock player displays the selected local audio path and
    duration metadata.
- Added Mac full-set mock grouping hardening:
  - local reading mock attempts group returned questions by passage id and part,
  - reading passage tabs switch the active passage text, PDF asset, and visible
    question group,
  - local listening mock attempts group returned questions by section/passage,
  - listening section tabs switch the visible questions plus the selected local
    audio title, path, and duration metadata.
- Added Mac local asset playback hardening:
  - imported local audio can be streamed through `GET /api/assets/local`,
  - the Mac listening mock player now renders a real audio element that uses the
    local asset API,
  - unsupported local file extensions are rejected so the route only serves
    expected media, PDF, and image assets.
- Added Mac reading PDF viewing hardening:
  - reading mock attempts use imported PDF assets when structured passage text is
    missing,
  - embedded PDF previews use `GET /api/assets/local` instead of raw filesystem
    paths,
  - the reading passage pane keeps a stable PDF preview height.
- Added report-export UI hardening:
  - dashboard report buttons now call `POST /api/reports/export`,
  - generated mock JSON, mock CSV, and mistakes CSV paths are shown in the Mac UI.
- Added score-estimate UI hardening:
  - mock score reports explicitly label IELTS band scores as estimates,
  - prediction cards explain that local predicted bands are estimates and
    official raw-score cutoffs can vary.
- Added manual sync UI hardening:
  - the dashboard Manual sync action now calls `POST /api/sync/import`,
  - imported, skipped, and conflict counts are rendered after the sync completes.
- Added Mac review conflict hardening:
  - submitted mock review now renders saved sync conflicts per question,
  - remote conflicting answers show the originating device id and raw answer.
- Added Mac manual sync dashboard refresh hardening:
  - successful manual sync import refreshes report history, score prediction
    cards, hardening status, and local study overview.
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
- Added Mac close-reading answer-sentence sync hardening:
  - manual answer-sentence updates now append
    `answer_key.answer_sentence.updated` events,
  - the events are written to Baidu Cloud `imports.jsonl` as question-bank
    evidence metadata,
  - unresolved remote answer-key updates are skipped instead of crashing manual
    sync.
- Added Mac frequency-table sync hardening:
  - frequency CSV/XLSX imports and manually corrected rows append
    `frequency.entry.upserted` events,
  - remote frequency events update local `frequency_entries`,
  - frequency sync keeps high-frequency-first random test building aligned across
    devices.
- Added sync forward-compatibility hardening:
  - unknown future event types are skipped without recording a completed
    `sync_events` row,
  - future app versions can still process those events after new handlers are
    added.
- Added malformed JSONL sync hardening:
  - malformed Baidu Cloud JSONL lines are skipped instead of crashing startup or
    manual sync,
  - valid events in the same sync file still import.
- Added malformed devices metadata sync hardening:
  - malformed `devices.json` is repaired instead of crashing startup,
  - valid current-device metadata is rewritten.
- Added reading answer-sentence completeness hardening:
  - reading answer keys with empty `answer_sentence` are counted as
    `missingAnswerSentence`,
  - the V1 hardening center now shows an Answer sentence issue meter and passage
    labels so manual close-reading evidence work is easier to find.
- Added close-reading keyword evidence hardening:
  - intensive reading previews now parse `answer_rules_json.keywords`,
  - imported or manually curated reading keywords can appear in the Mac
    close-reading highlight flow.
- Added close-reading multiple-keyword highlight hardening:
  - the Mac close-reading view now highlights every supplied keyword,
  - overlapping answer-sentence evidence remains the primary highlight.
- Added repeated keyword highlight hardening:
  - repeated reading keyword occurrences are highlighted across the passage,
  - overlap checks continue to avoid nested or conflicting mark spans.
- Stabilized the question-bank import panel regression so sequential import
  actions wait for the shared import lock to release before submitting the next
  local import request.
- Added Mac post-mock dashboard refresh hardening:
  - successful local mock submissions now refresh report history, latest mock
    score, score prediction cards, and the local study overview without requiring
    a manual page reload.
- Added Mac manual backup UI hardening:
  - the Sync settings panel can export a local backup JSON,
  - the generated backup path and key row counts are shown in the UI,
  - a pasted backup path can be imported through the local backup API,
  - restore feedback shows imported tables and row counts.
- Added Mac backup reminder refresh hardening:
  - successful backup export/import actions refresh the dashboard data snapshot,
  - the V1 hardening backup reminder updates immediately after a backup is
    created or restored.

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
- Mac free-practice UI follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the dashboard could start mock attempts but not
      free practice attempts.
    - Passed after adding reading/listening practice start buttons that call
      `POST /api/practice/start` with `mode: "practice"` and label the active
      shell with `Submit practice`.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the free-practice UI follow-up, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
- Mac local mock review-marker follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because local mock question cards did not expose a real
      per-question mark-for-review control.
    - Passed after adding the mark toggle, bottom-navigation marked state,
      marked-question submit warning, and `markedForReview` persistence in the
      local answer-save request.
- Mac exam topbar review-marker follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the topbar `Mark for review` control did not
      change the active local mock question state.
    - Passed after adding an `ExamShell` callback for toggling the current
      question mark and handling it in `ExamPreview`.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the exam topbar review-marker follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac exam topbar help/settings follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because `Help` and `Settings` were visible topbar controls
      without usable panels.
    - Passed after adding accessible help/settings dialogs and a large-interface
      text toggle for the active exam shell.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the exam topbar help/settings follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac full-set passage/section grouping follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because local reading mocks only rendered the first
      passage and local listening mocks did not isolate section questions/audio
      by part.
    - Passed after adding passage/section grouping, reading passage tabs, and
      per-section listening audio metadata.
- Mac bottom-navigation jump follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because bottom question navigation buttons did not drive
      the active local mock passage/section.
    - Passed after adding a navigator selection callback and mapping clicked
      question numbers to their local passage or listening section.
- Mac listening bottom-navigation section jump follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because clicking a later listening question in the bottom
      navigator updated the current question state but left the visible section,
      tab selection, and audio metadata on the first listening section.
    - Passed after making the listening exam view accept the active section from
      the parent local mock state.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the listening bottom-navigation section jump follow-up,
      including unit/component tests, Playwright, production build, desktop
      diagnostics, and Mac DMG packaging.
- Mac practice-filter follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because supplied practice filters were ignored by the
      practice start API.
    - Passed after adding part, frequency-class, question-type, and mistake-label
      filtering to practice starts.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the Mac dashboard had no filter controls for free
      practice starts.
    - Passed after adding part, frequency, question-type, and mistake-label
      controls to the dashboard practice starter.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the practice-filter follow-up, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
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
- Mac intensive real-audio repeat follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because `/api/study/intensive` did not include the local
      audio path needed by the Mac intensive listening player.
    - Passed after joining the selected listening passage with imported audio
      metadata.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the intensive listening player exposed static
      buttons without a real audio element or cue-driven seek/loop behavior.
    - Passed after rendering local audio and wiring sentence repeat to cue start
      and end times.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the intensive real-audio repeat follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
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
- Mac local mock submit-save follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because submitting immediately after typing skipped the
      answer-save request when the field had not blurred.
    - Passed after saving all active mock answers before submission.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the Mac local mock submit-save hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac local mock save-failure follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because a failed answer-save response did not stop local
      mock submission.
    - Passed after treating failed answer saves as submission-blocking errors.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the local mock save-failure follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
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
- Mac history review-reopen follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because submitted attempts in history had no action for
      reopening saved detailed review evidence.
    - Passed after adding per-attempt Review actions and a history review panel
      backed by `GET /api/practice/:attemptId/review`.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the history review-reopen follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
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
- Mac post-mock dashboard refresh follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because a successful local mock submission left dashboard
      reports and predictions on the initial API snapshot.
    - Passed after sending a successful-submit notification from the mock exam UI
      and refetching report/history and study overview data.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the post-mock dashboard refresh follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac manual sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
    - Initially failed because the Manual sync button did not call the sync API or
      show a completion status.
    - Passed after wiring it to `POST /api/sync/import` and rendering imported,
      skipped, and conflict counts.
- Mac manual sync dashboard-refresh follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because manual sync completion left the dashboard on stale
      report data.
    - Passed after manual sync success triggers a dashboard data refresh.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the manual sync dashboard-refresh follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
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
- Mac manual backup UI follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
    - Initially failed because the dashboard Sync settings panel had no backup
      export/import controls.
    - Passed after adding manual backup export/import controls and row-count
      feedback for the Mac UI.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the manual backup UI follow-up, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
- Mac backup reminder refresh follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because exporting a backup left the V1 hardening backup
      reminder on the stale pre-export status.
    - Passed after backup export/import success triggers a dashboard data refresh.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the backup reminder refresh follow-up, including
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
- Mac close-reading answer-sentence sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because answer-sentence updates were saved locally but did
      not append or apply Baidu Cloud sync events.
    - Passed after adding `answer_key.answer_sentence.updated` event append and
      import handling with unresolved answer-key skips.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the close-reading answer-sentence sync hardening follow-up,
      including unit/component tests, Playwright, production build, desktop
      diagnostics, and Mac DMG packaging.
- Mac frequency-table sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because frequency imports were local-only and remote
      frequency events were ignored.
    - Passed after wiring `frequency.entry.upserted` append/import behavior.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the frequency-table sync hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Sync forward-compatibility follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because unknown future event types were marked as
      processed and would not be re-imported after an app upgrade.
    - Passed after leaving unknown events unrecorded and counted as skipped.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the sync forward-compatibility hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Malformed JSONL sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because malformed JSONL caused startup import to throw.
    - Passed after malformed lines were counted as skipped while valid lines
      continued to import.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the malformed JSONL sync hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Malformed devices metadata sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncService.test.ts`
    - Initially failed because malformed `devices.json` threw in
      `ensureSyncFolder`.
    - Passed after malformed devices metadata is treated as empty and the current
      device entry is rewritten.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the malformed devices metadata sync hardening follow-up,
      including unit/component tests, Playwright, production build, desktop
      diagnostics, and Mac DMG packaging.
- Reading answer-sentence completeness follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/hardeningService.test.ts`
    - Initially failed because reading answer keys with empty `answer_sentence`
      were not counted in question-bank completeness.
    - Passed after adding `missingAnswerSentence` issue counts and passage
      labels.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/hardeningCenter.test.tsx`
    - Initially failed because the V1 hardening center had no Answer sentence
      issue meter.
    - Passed after adding the frontend issue count type and label.
  - `npx pnpm@9.15.4 build`
    - Initially failed because the dashboard fallback hardening status still used
      the old issue-count shape.
    - Passed after updating the fallback and dashboard test fixture.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the reading answer-sentence completeness follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Close-reading keyword evidence follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because `/api/study/intensive` always returned empty
      reading `keywords`.
    - Passed after parsing string keywords from `answer_rules_json.keywords`.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the close-reading keyword evidence hardening follow-up,
      including unit/component tests, Playwright, production build, desktop
      diagnostics, and Mac DMG packaging.
- Close-reading multiple-keyword highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the second reading keyword was rendered as plain
      text.
    - Passed after mapping all supplied reading keywords into highlight targets.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the close-reading multiple-keyword highlight hardening
      follow-up, including unit/component tests, Playwright, production build,
      desktop diagnostics, and Mac DMG packaging.
- Repeated keyword highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the second occurrence of the same reading keyword
      stayed plain text.
    - Passed after scanning each target for every non-overlapping occurrence.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the repeated keyword highlight hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac readiness follow-up:
  - `node scripts/mac-readiness-check.mjs`
    - Initially failed because the question-bank import panel regression clicked
      the next import action before the shared import lock released.
    - Passed after waiting for each sequential import action to become enabled.
- Mac missing-evidence close-reading hardening:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because a reading PDF import that had an answer key but
      no answer sentence and no explanation returned `reading: null` from
      `/api/study/intensive`.
    - Passed after the intensive preview started surfacing those incomplete
      reading questions, keeping manual answer-sentence selection usable for
      imported PDF material that still needs review.
- Mac intensive empty-state hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the dashboard intensive panel still displayed
      sample listening and reading material when the local question bank had no
      intensive passage data.
    - Passed after removing sample fallback rendering and showing local empty
      states for missing listening and reading passages.
- Mac close-reading case-insensitive highlight hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because stored answer evidence such as `answer sentence`
      did not highlight imported passage text such as `Answer Sentence`.
    - Passed after the close-reading highlighter started matching answer
      sentence and keyword targets without requiring identical casing.
- Mac post-import dashboard refresh hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because imported question-bank material did not refresh
      the Mac study overview or intensive preview without a page reload.
    - Passed after the import panel notifies the dashboard after successful
      imports and the intensive preview refetches with the same refresh signal.
- Mac close-reading flexible-whitespace highlight hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because PDF/HTML extracted passage text with line breaks
      or repeated spaces prevented answer-sentence and keyword highlights.
    - Passed after the close-reading highlighter began treating whitespace in
      stored evidence and imported passage text as equivalent.
- Mac word-limit alias scoring hardening:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because manually authored or imported `wordLimit` rules
      did not enforce IELTS answer word limits.
    - Passed after practice scoring recognized common word-limit aliases before
      deciding whether a matched answer is correct.
- Mac textual word-limit scoring hardening:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because imported rule text such as
      `NO MORE THAN TWO WORDS` bypassed the word-limit gate.
    - Passed after practice scoring extracts numeric limits from common IELTS
      word-limit phrases before checking correctness.
- Mac number-permitted word-limit scoring hardening:
  - `npx pnpm@9.15.4 --filter @ielts/shared test -- src/scoring.test.ts`
    - Initially failed because the shared word-limit helper counted a permitted
      numeric token as an extra word.
    - Passed after adding an `allowNumber` scoring option.
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because `NO MORE THAN TWO WORDS AND/OR A NUMBER` was
      parsed as only a two-word limit.
    - Passed after the practice service detects number-permitted IELTS rule text
      and forwards that scoring option.
- Mac local asset playback hardening:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/assetRoutes.test.ts`
    - Initially failed with 404 because no local asset stream route existed.
    - Passed after adding `GET /api/assets/local` for local audio/PDF/image
      assets.
    - Initially failed for unsupported `.txt` files because the route could
      return arbitrary local files.
    - Passed after adding an extension whitelist.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the listening mock view had no audio element and
      then because it used the raw filesystem path as `src`.
    - Passed after the Mac listening mock player rendered an audio element whose
      source uses the local asset API.
- Mac listening practice playback-controls follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because `Start listening practice` loaded local audio but
      still used mock-mode playback restrictions.
    - Passed after `ExamPreview` forwards the active attempt mode to
      `ListeningExamView`, enabling native audio controls plus Pause, Seek, and
      Speed in practice mode.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the listening practice playback-controls follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac reading PDF viewing hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the active reading mock pane ignored returned PDF
      asset paths when no extracted passage text existed.
    - Passed after the Mac reading exam view embedded the PDF through
      `GET /api/assets/local`.
- Mac review conflict hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because a review response containing `conflicts` did not
      show any sync conflict in the Mac mock review panel.
    - Passed after rendering remote conflicting answers with their source device
      beside the affected question.
- Mac history review conflict hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because reopened history reviews did not show saved sync
      conflicts returned by `GET /api/practice/:attemptId/review`.
    - Passed after the history review panel rendered remote conflicting answers
      with their source device beside the affected question.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the history review conflict hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac score-estimate UI hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the score report did not explain that IELTS band
      scores are estimates.
    - Passed after adding the score report estimate note.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because prediction cards did not explain that predicted
      bands are estimates.
    - Passed after adding the prediction estimate note.

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
