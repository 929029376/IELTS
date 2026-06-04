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
  - individual listening ZIP import,
  - local reading PDF directory import,
  - individual reading PDF import,
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
- Added Mac study overview recommendation hardening:
  - recommended mock sets now choose the highest effective per-part
    `selectionWeight`,
  - recently completed passages are visibly deprioritized in the dashboard queue
    after recency penalties are applied.
- Added a Mac intensive study preview backed by `/api/study/intensive`, replacing
  the dashboard's static intensive listening and close-reading content whenever
  local cue and answer-evidence data is available.
- Added Mac intensive study write hardening:
  - cue creation now posts to `POST /api/study/listening-cues`,
  - existing cue corrections now post to
    `PUT /api/study/listening-cues/:cueId`,
  - dictation submit now posts to `POST /api/study/dictation-attempts`,
  - newly saved cues immediately appear in sentence repeat controls,
  - corrected cues immediately update sentence repeat labels and dictation
    transcript checks.
- Added Mac intensive real-audio repeat hardening:
  - `/api/study/intensive` now returns the selected listening passage's local
    audio path,
  - the intensive listening player renders that local audio through
    `GET /api/assets/local`,
  - sentence repeat buttons seek to cue start times and loop back at cue end
    times for focused dictation practice.
- Added Mac intensive speed-status hardening:
  - the intensive listening Speed control now displays the active playback rate,
  - toggling slow playback updates the local audio element and the visible speed
    label for clearer focused-listening feedback.
- Added Mac intensive clear-loop hardening:
  - active A points and A-B loops now expose a `Clear loop` action,
  - clearing the loop removes the focused repeat range so playback can continue
    normally during longer focused-listening passes.
- Added Mac dictation reset hardening:
  - the intensive listening dictation box clears after submit,
  - consecutive sentence practice no longer carries the previous typed answer
    into the next attempt.
- Added Mac cue-switch dictation hardening:
  - selecting another sentence repeat cue clears the current dictation text,
  - focused listening on the next cue starts from a blank input state.
- Added Mac blank-dictation hardening:
  - the intensive listening Submit dictation action requires non-blank text,
  - whitespace-only attempts are blocked before they can create empty local
    dictation records.
- Added Mac close-reading mistake-label hardening:
  - intensive reading preview now exposes the latest wrong reading answer id,
  - mistake-label buttons persist through `POST /api/study/mistake-labels`,
  - saved labels can be appended to Baidu Cloud `mistakes.jsonl` when sync is
    configured.
- Added Mac close-reading mistake-label visibility hardening:
  - mistake-label buttons render only when a wrong local reading answer id is
    available,
  - evidence-only close-reading previews no longer show unusable wrong-answer
    label actions.
- Added Mac close-reading answer-evidence hardening:
  - intensive reading preview now exposes the local reading `answerKeyId`,
  - selected passage text persists through `POST /api/study/answer-sentence`,
  - saved evidence immediately becomes the highlighted answer sentence in the
    Mac close-reading panel.
- Added Mac answer-evidence availability hardening:
  - the close-reading answer-evidence save button is disabled until a local
    `answerKeyId` is available,
  - evidence-only reading previews avoid an action that cannot persist selected
    text.
- Added Mac close-reading synonym-note empty-state hardening:
  - close-reading synonym notes now show a clear empty-state message when no
    synonym evidence is recorded,
  - the panel no longer renders an empty list that looks like missing UI.
- Hardened mock start behavior so local mock attempts now use the frequency-weighted
  full-set builder instead of sequential question loading.
- Added frontend mock-start controls in the Mock Exam Center so the dashboard can
  start reading or listening mock attempts through the local practice API.
- Added frontend free-practice controls in the Mock Exam Center so the dashboard
  can start reading or listening practice attempts through the same local
  practice API without entering mock mode.
- Removed the Mock Exam Center's old static sample exam so the main dashboard no
  longer shows fixed sample content before a real local attempt is started.
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
- Added Mac listening practice explicit-control hardening:
  - practice-mode Pause toggles local audio playback by calling play when paused
    and pause while playing,
  - practice-mode Seek advances local audio by 10 seconds,
  - practice-mode Speed updates playback rate and shows the active speed while
    mock mode keeps those controls disabled.
- Added Mac reading PDF viewing hardening:
  - reading mock attempts use imported PDF assets when structured passage text is
    missing,
  - embedded PDF previews use `GET /api/assets/local` instead of raw filesystem
    paths,
  - the reading passage pane keeps a stable PDF preview height.
- Added Mac reading selected-text highlight hardening:
  - the reading exam toolbar can highlight currently selected passage text during
    local mock or practice attempts,
  - user highlights use a distinct style from answer-sentence evidence
    highlights,
  - reading highlights are scoped to the active passage and restored when
    returning to that passage,
  - reading highlights can be cleared from the toolbar for the active passage.
- Added Mac reading pane drag hardening:
  - the reading exam divider can be dragged to resize passage and question panes,
  - the divider keeps a click shortcut and accessible separator metadata,
  - ArrowLeft, ArrowRight, Home, and End can adjust the split from the keyboard.
- Added Mac reading notes hardening:
  - reading notes are scoped to the active passage inside the local exam view,
  - switching to another passage starts with its own note state and returning to
    the previous passage restores its note.
- Added Mac reading answer-evidence highlight hardening:
  - reading mock/practice answer-sentence evidence highlights now tolerate
    casing differences and repeated whitespace from imported passage text.
- Added report-export UI hardening:
  - dashboard report buttons now call `POST /api/reports/export`,
  - generated mock JSON, mock CSV, and mistakes CSV paths are shown in the Mac UI.
- Added Mac report path clipboard hardening:
  - exported mock JSON, mock CSV, and mistakes CSV paths can be copied together
    from the reports panel after local export,
  - copied-state feedback appears in the report export panel.
- Added score-estimate UI hardening:
  - mock score reports explicitly label IELTS band scores as estimates,
  - prediction cards explain that local predicted bands are estimates and
    official raw-score cutoffs can vary.
- Added Mac prediction-card evidence hardening:
  - live dashboard prediction objects now preserve predicted band, range,
    confidence label, and basis attempt count,
  - reports render the predicted band as the primary card value and show range,
    confidence, and attempt count as supporting evidence.
- Added Mac frequency-accuracy report hardening:
  - report analytics now keep frequency-class accuracy in its own group,
  - live dashboard API data maps `byFrequencyClass` into high/medium/low
    frequency rows for easier high-frequency review.
- Added manual sync UI hardening:
  - the dashboard Manual sync action now calls `POST /api/sync/import`,
  - imported, skipped, and conflict counts are rendered after the sync completes.
- Added Mac runtime sync configuration hardening:
  - the real server entrypoint now uses a persistent local database path instead
    of an in-memory database,
  - default Baidu Cloud sync routes are registered for real Mac runtime startup,
  - `IELTS_SYNC_FOLDER_PATH` can override the default sync folder,
  - the Sync settings panel can save an edited Baidu Cloud folder path through
    `PUT /api/sync/config`,
  - saved sync folder paths are written to local runtime config JSON and loaded
    again when the real server starts.
- Added Mac review conflict hardening:
  - submitted mock review now renders saved sync conflicts per question,
  - remote conflicting answers show the originating device id and raw answer.
- Added Mac manual sync dashboard refresh hardening:
  - successful manual sync import refreshes report history, score prediction
    cards, hardening status, and local study overview.
- Added Mac manual sync timestamp hardening:
  - successful manual sync import now updates the Sync settings panel's Last sync
    value immediately,
  - the panel no longer stays on `Not synced yet` after showing completion
    counts.
- Added manual backup hardening for intensive listening:
  - backup export/import now includes `dictation_attempts`,
  - restore order keeps `dictation_attempts` after `listening_cues` so cue
    foreign keys remain valid.
- Added Mac intensive listening sync hardening:
  - sentence cue creation now appends `intensive.listening_cue.created` events,
  - sentence cue corrections now append `intensive.listening_cue.updated` events,
  - dictation attempt saving now appends `intensive.dictation_attempt.saved`
    events,
  - both event types are written to Baidu Cloud `stats.jsonl` for cross-device
    practice-record continuity,
  - unresolved remote intensive events are skipped instead of crashing manual
    sync when the current device has not imported matching question-bank rows,
  - newly resolvable out-of-order events in the same JSONL file are retried
    within the same startup or manual sync import.
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
- Added Mac single-file import controls so a single listening ZIP or reading PDF
  can be imported directly from the Question Bank panel without rescanning the
  whole source directory.
- Added Mac packaged file-picker hardening for single-file imports:
  - selecting a listening ZIP can fill the single ZIP path field from the
    desktop-exposed local file path,
  - selecting a reading PDF can fill the single PDF path field from the
    desktop-exposed local file path,
  - selecting a frequency CSV/XLSX can fill the frequency file path field from
    the desktop-exposed local file path,
  - manual path entry remains available when a browser environment does not
    expose a local path.
- Added Mac post-mock dashboard refresh hardening:
  - successful local mock submissions now refresh report history, latest mock
    score, score prediction cards, and the local study overview without requiring
    a manual page reload.
- Added Mac manual backup UI hardening:
  - the Sync settings panel can export a local backup JSON,
  - the generated backup path and key row counts are shown in the UI,
  - a pasted backup path can be imported through the local backup API,
  - selecting a backup JSON file can fill the import path from the
    desktop-exposed local file path,
  - restore feedback shows imported tables and row counts.
- Added Mac sync-folder file-picker hardening:
  - selecting an existing sync JSONL or `devices.json` file can fill the sync
    folder path from the desktop-exposed local file path's parent directory.
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
- Mac single-file import UI follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/questionBankImportPanel.test.tsx`
    - Initially failed because the Mac Question Bank panel did not expose the
      existing single listening ZIP and single reading PDF import routes.
    - Passed after adding single-file path fields, disabled empty-path states,
      and API calls to `POST /api/import/listening-zip` and
      `POST /api/import/reading-pdf`.
- Mac packaged file-picker import follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/questionBankImportPanel.test.tsx`
    - Initially failed because the single-file import cards had no file picker
      controls to populate import paths in packaged local use.
    - Passed after adding listening ZIP and reading PDF file selectors that read
      desktop-exposed local `File.path` values into the matching import fields.
- Mac frequency-file picker import follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/questionBankImportPanel.test.tsx`
    - Initially failed because the frequency CSV/XLSX card had no file picker to
      populate the import path in packaged local use.
    - Passed after adding a frequency file selector that reads desktop-exposed
      local `File.path` values into the frequency import field.
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
- Mac study overview recency-recommendation follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because the study overview picked the first sorted
      candidate instead of the highest effective post-recency selection weight.
    - Passed after recommended mock sets chose the highest `selectionWeight` per
      part.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the recency-recommendation follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
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
- Mac intensive cue-update follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed with `404` because existing sentence cues could not be
      corrected through the local study API.
    - Passed after adding `PUT /api/study/listening-cues/:cueId`.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because existing sentence cues had repeat buttons but no
      edit action in the Mac intensive panel.
    - Passed after adding cue edit buttons, prefilled cue fields, `PUT` save
      handling, and refreshed repeat labels.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the cue-update hardening, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
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
- Mac manual sync timestamp follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
    - Initially failed because the Manual sync completion counts rendered while
      Last sync stayed `Not synced yet`.
    - Passed after the Sync settings panel stores and displays the successful
      manual-sync completion timestamp.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the manual sync timestamp follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
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
- Mac backup file-picker follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
    - Initially failed because backup restore required manually pasting a full
      local backup JSON path.
    - Passed after adding a backup JSON file selector that reads
      desktop-exposed local `File.path` values into the import field.
- Mac sync-folder file-picker follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
    - Initially failed because selecting an existing Baidu Cloud sync file could
      not populate the editable sync folder path.
    - Passed after adding a sync JSONL/devices file selector that derives the
      folder from the selected file's desktop-exposed local path.
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
- Mac intensive listening cue-update sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because cue corrections did not append
      `intensive.listening_cue.updated`, and remote cue update events were not
      applied after the local cue existed.
    - Passed after adding cue-update sync append/import handling.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the cue-update sync hardening, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
- Same-batch sync retry hardening:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because a cue update arriving before its cue create event
      in the same sync file was skipped for that startup/import pass.
    - Passed after retrying unresolved events in the same JSONL batch whenever a
      later event makes progress.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the same-batch sync retry hardening, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
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
- Mac listening practice explicit-control hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because enabled practice controls did not pause, seek, or
      change speed on the local audio element.
    - Passed after wiring those buttons directly to the audio element.
- Mac listening practice play-pause toggle hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because paused local practice audio could not be started
      from the visible practice playback control.
    - Passed after the same control calls play or pause based on audio state.
- Mac reading PDF viewing hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the active reading mock pane ignored returned PDF
      asset paths when no extracted passage text existed.
    - Passed after the Mac reading exam view embedded the PDF through
      `GET /api/assets/local`.
- Mac reading selected-text highlight hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the reading exam view had no
      `Highlight selected text` control.
    - Passed after selected passage text can be highlighted in the reading view
      while answer-sentence evidence highlights remain visible.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the selected-text highlight hardening, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
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
- Mac frequency-accuracy report hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because frequency-class accuracy rows were not shown as a
      dedicated report group.
    - Passed after adding `frequencyRows` to the report view.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Passed after mapping live API `byFrequencyClass` data into visible
      frequency accuracy rows.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the frequency-accuracy report hardening follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac intensive A-B repeat status hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the Mac intensive listening player could set an
      A-B loop without surfacing the active A point or loop range.
    - Passed after showing the custom A-B loop status in the intensive listening
      player and preserving the existing loop-back playback behavior.
- Mac intensive speed-status hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the intensive listening Speed control still
      rendered only `Speed` instead of the current playback rate.
    - Passed after showing `Speed: 1x` initially and `Speed: 0.85x` after slow
      playback is toggled.
- Mac intensive clear-loop hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because A-B repeat could be started but not explicitly
      cleared from the intensive listening controls.
    - Passed after adding `Clear loop` and verifying later time updates no
      longer jump back to the cleared A point.
- Mac dictation reset hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because submitted dictation text remained in the textarea.
    - Passed after the intensive player clears the text after dispatching the
      dictation submit action.
- Mac cue-switch dictation hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because selecting `Repeat Sentence 2` kept the typed
      answer from Sentence 1 in the dictation box.
    - Passed after repeat-cue selection clears the dictation input before
      playback starts from the new cue.
- Mac blank-dictation hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because blank dictation text could still submit.
    - Passed after the submit control requires trimmed text and the handler
      ignores whitespace-only attempts.
- Mac close-reading mistake-label visibility hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because close-reading previews without `attemptAnswerId`
      still rendered mistake-label buttons.
    - Passed after `isWrongAnswer` is derived from the live reading
      `attemptAnswerId`.
- Mac answer-evidence availability hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the answer-evidence save button stayed enabled
      without a local `answerKeyId`.
    - Passed after the preview passes answer-key availability into
      `CloseReadingView` and the button disables when saving is unavailable.
- Mac close-reading synonym-note empty-state hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because missing synonym notes produced an empty `ul`.
    - Passed after the close-reading view renders `No synonym notes recorded yet.`
      when the synonym list is empty.
- Mac practice elapsed-timer hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because Mac practice attempts reused the mock countdown
      timer and did not expose a free-practice elapsed timer.
    - Passed after wiring practice attempts to elapsed time tracking while
      keeping mock attempts on strict countdown and timeout submit.
- Mac practice answer-time hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because saved local answers always used
      `timeSpentSeconds: 0`, weakening practice history timing evidence.
    - Passed after answer saves use the actual elapsed seconds since the current
      local attempt started.
- Mac practice score-denominator hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because local practice score reports displayed short
      practice sets as `/40`, which made one-question practice results look like
      full IELTS mock scores.
    - Passed after practice reports use the current practice set size while mock
      reports continue to use the 40-question IELTS denominator.
- Mac practice accuracy-report hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because local practice reports still exposed an IELTS
      estimated band for partial practice sets.
    - Passed after practice reports show practice accuracy and reserve estimated
      IELTS bands for full mock reports.
- Mac partial-practice prediction hardening:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because short practice submissions still produced an
      `estimatedBand`, which could enter history-based prediction.
    - Passed after partial practice submissions return `estimatedBand: null`
      while preserving full mock band estimates.
- Mac practice local-resource hardening:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because free practice attempts did not receive imported
      reading passage text, PDF paths, or listening audio metadata from the
      practice API.
    - Passed after practice starts return the same local passage resource
      metadata used by mock starts, keeping Mac free practice usable for
      reading pages and listening audio.
- Mac practice error-copy hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because a free-practice save failure still told the user
      that the local mock attempt could not be submitted.
    - Passed after Mac exam preview error handling reports local practice
      failures as practice failures and preserves mock wording for mock exams.
- Mac sync-config display hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because the dashboard could show a stale hardcoded Mac
      sync path instead of the server's active Baidu Cloud JSONL sync folder.
    - Passed after App loads `/api/sync/config` and passes the live device name
      and sync folder path into the Sync settings panel.
- Mac manual frequency batch-row hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/frequencyCorrectionTable.test.tsx`
    - Initially failed because manual frequency correction was limited to the
      seeded single row, making OCR/image frequency-table updates cumbersome.
    - Passed after the correction table can append additional editable frequency
      rows for batch updates.
- Mac report path clipboard hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because exported report paths could be viewed but not
      copied as a ready-to-use local path list.
    - Passed after adding the `Copy report paths` action and clipboard write
      coverage.
- Mac reading answer-evidence highlight hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because reading exam answer-sentence evidence required
      exact casing and spacing to highlight imported passage text.
    - Passed after making reading exam evidence matching case-insensitive and
      whitespace-flexible.
- Mac reading pane drag hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the reading divider only supported click-based
      width toggling instead of real dragging.
    - Passed after adding drag-based pane width calculation and regression
      coverage.
- Mac reading pane keyboard-resize hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the reading divider exposed separator value
      metadata but did not support keyboard resizing.
    - Passed after adding ArrowLeft, ArrowRight, Home, and End handling.
- Mac reading notes hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because notes from one reading passage remained visible
      after switching to a different passage.
    - Passed after making notes local to each active passage in the reading exam
      view.
- Mac selected-highlight persistence hardening:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because selected reading highlights were lost when
      switching away from a passage and returning.
    - Passed after storing selected highlights per active reading passage.

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
