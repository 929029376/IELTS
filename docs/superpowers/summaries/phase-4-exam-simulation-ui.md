# Phase 4 IELTS-Style Exam Simulation UI Summary

**Date:** 2026-05-31

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Added reusable exam simulation components under `apps/web/src/features/exam`.
- Implemented `ExamShell`.
  - Top timer.
  - Help button.
  - Settings button.
  - Mark for review button.
  - Bottom question navigation.
  - Submit test button.
  - Functional help panel.
  - Functional settings panel with large interface text.
  - Submit warnings for unanswered and marked questions.
  - Time-expired auto-submit.
- Implemented `ReadingExamView`.
  - Left passage pane.
  - Right question pane.
  - Draggable and keyboard-adjustable divider for pane-width changes, with a
    retained click shortcut.
  - Answer text highlighting.
  - Notes panel with per-passage local note separation.
  - Font size controls.
- Implemented `ListeningExamView`.
  - Section tabs.
  - Mock-mode strict controls.
  - Pause, seek, and speed controls disabled in mock mode.
  - Final review time display.
- Implemented `ScoreReport`.
  - Subject.
  - Raw score.
  - Estimated band.
- Added `ExamPreview` to the dashboard so the local app renders an IELTS-style exam preview in the browser.
- Added a Mock Exam Center starter that calls `POST /api/practice/start` with
  `mode: "mock"` for reading or listening and renders the returned local attempt
  questions from the question bank.
- Added practice-mode starters beside the mock starters:
  - reading practice calls `POST /api/practice/start` with `mode: "practice"`,
  - listening practice calls `POST /api/practice/start` with `mode: "practice"`,
  - listening practice keeps free playback controls and the native local audio
    control bar instead of using mock-mode strict playback restrictions,
  - the loaded-attempt panel and exam shell title identify practice attempts
    separately from mock tests.
- Connected the loaded local mock attempt to the exam UI:
  - renders returned local questions as answer inputs,
  - saves answers through `POST /api/practice/:attemptId/answer`,
  - supports marking local mock questions for review,
  - supports the exam topbar `Mark for review` control for the current local
    mock question,
  - reflects marked questions in the bottom question navigation and submit warning,
  - supports clicking bottom question navigation items to jump to the matching
    local mock passage or listening section,
  - keeps the listening section tabs, visible questions, and selected local audio
    metadata synchronized when bottom question navigation jumps to another
    listening section,
  - persists the marked-for-review flag with the saved answer payload,
  - saves current answer input state again before local mock submission,
  - stops submission and shows an error when pre-submit answer saving fails,
  - submits through `POST /api/practice/:attemptId/submit`,
  - displays the returned raw score and estimated band report.
- Added a submitted-mock review panel that loads `GET /api/practice/:attemptId/review`
  and renders correctness, user answer, accepted answers, answer-sentence
  highlight, explanation, and synonym notes.
- Added local mock resource loading:
  - started mock questions now include imported passage text when a source asset
    has extracted text,
  - started listening mock questions include local audio path and duration metadata,
  - the Mac reading mock pane uses real imported passage text instead of the
    placeholder when available,
  - the Mac listening player shows the selected local audio resource path and
    duration metadata.
- Added Mac full-set mock grouping:
  - started reading mock questions are grouped by imported passage id and part,
  - the reading mock pane provides passage tabs for P1/P2/P3 full-set switching,
  - started listening mock questions are grouped by imported section/passage,
  - the listening mock section tabs now switch both the visible questions and
    the selected local audio metadata.
- Added Mac local listening audio playback:
  - the listening mock view renders a real `<audio>` element when imported audio
    is available,
  - mock mode keeps the native control bar hidden while the visible pause, seek,
    and speed controls remain disabled,
  - audio source URLs are served through a local asset API instead of exposing
    raw filesystem paths as browser URLs.
- Added Mac local reading PDF viewing:
  - reading mock attempts can render the first imported PDF asset when extracted
    passage text is missing,
  - PDF preview URLs are served through the same local asset API,
  - the preview uses stable dimensions inside the reading passage pane.
- Added Mac reading passage highlight controls:
  - selected passage text can be highlighted during a local reading exam or
    practice attempt,
  - user highlights render separately from answer-sentence evidence highlights,
  - highlights are kept separately for each active passage,
  - highlights can be cleared from the reading toolbar for the active passage.
- Added Mac reading pane drag hardening:
  - the reading exam divider can be dragged to resize passage and question panes,
  - the divider can also be adjusted with ArrowLeft, ArrowRight, Home, and End,
  - the divider keeps accessible separator metadata and the existing click shortcut.
- Added Mac reading notes hardening:
  - reading notes are kept separately for each active passage inside the local
    exam view,
  - switching passages no longer carries a previous passage note into the next
    passage,
  - returning to a passage restores its local note.
- Added Mac reading selected-highlight persistence:
  - user-selected highlights are kept separately for each active reading passage,
  - switching away from a passage no longer discards its selected text highlights,
  - clearing highlights affects the active passage only.
- Added Mac reading answer-evidence highlight hardening:
  - answer-sentence evidence in the reading exam view matches imported passage
    text without requiring identical casing,
  - repeated spaces and line-break differences between stored evidence and
    imported text no longer prevent the evidence highlight.
- Removed the static sample exam from the dashboard Mock Exam Center so the
  primary exam surface only renders real local attempts started from the question
  bank.
- Added unit coverage for:
  - shell controls,
  - timer auto-submit,
  - submit warnings,
  - reading split view,
  - answer highlight,
  - notes panel,
  - listening section tabs,
  - strict playback controls,
  - score report,
  - question navigation state mapping.
- Expanded Playwright e2e coverage to check the exam preview across 1440x900 and 1280x800 desktop viewports.

## Verification Evidence

- Red test evidence:
  - Initial Phase 4 component test failed because `features/exam` components did not exist.
- `npx pnpm@9.15.4 --filter @ielts/web test`
  - 4 web test files passed.
  - 10 web tests passed.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 13 tests passed.
  - Web: 10 tests passed.
- `npx pnpm@9.15.4 test:e2e`
  - Playwright Chromium dashboard and exam preview test passed across two desktop viewport sizes.
- Mac local mock-start follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because `Start reading mock` did not exist.
    - Passed after adding the local mock starter and loaded question rendering.
- Mac free-practice start follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because `Start reading practice` did not exist.
    - Passed after adding reading/listening practice starters, using
      `mode: "practice"` for the local practice API, and changing the active
      shell submit label to `Submit practice`.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the free-practice start follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
- Mac local mock answer/submit follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the loaded local mock questions had no answer input.
    - Passed after adding answer persistence, local mock submission, and score
      report rendering for the active attempt.
- Mac local mock submit-save follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because typing an answer and clicking Submit without
      blurring the field skipped the answer-save request.
    - Passed after saving current mock answer state before calling the submit
      endpoint.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the local mock submit-save follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac local mock review-marker follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the loaded local mock UI had no per-question
      control for marking a question for review.
    - Passed after adding local question mark toggles, marked navigation state,
      submit warnings for marked local questions, and `markedForReview`
      persistence in answer-save payloads.
- Mac exam topbar review-marker follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because clicking the active exam shell's topbar
      `Mark for review` button left the current local mock question unmarked.
    - Passed after adding a current-question mark callback to `ExamShell` and
      wiring it to the active local mock question state in `ExamPreview`.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the exam topbar review-marker follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac exam topbar help/settings follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because clicking `Help` did not open an `Exam help`
      dialog and `Settings` did not expose any adjustable exam setting.
    - Passed after adding topbar help and settings panels to `ExamShell`, plus a
      large-interface-text setting that applies to the active exam shell.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the exam topbar help/settings follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac full-set passage/section grouping follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because local reading mocks had no P2 passage tab and
      local listening mocks rendered later-section questions in the first
      section instead of isolating them by section.
    - Passed after grouping local mock questions by passage id, adding reading
      passage tabs, and giving listening sections their own questions and audio
      metadata.
- Mac bottom-navigation jump follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because clicking `Question 14` in the bottom navigator did
      not switch the active local reading passage.
    - Passed after adding question-select callbacks through `QuestionNavigator`
      and `ExamShell`, then mapping selected question numbers back to the
      correct local mock passage or section.
- Mac listening bottom-navigation section jump follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because clicking `Question 11` in the bottom navigator
      selected the question but left the listening player, section tab, and
      visible questions on section one.
    - Passed after making `ListeningExamView` accept the active section from the
      parent exam state and passing the active local mock group id from
      `ExamPreview`.
- Mac local mock save-failure follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because a failed pre-submit answer save still allowed the
      mock submit flow to continue.
    - Passed after checking answer-save responses and surfacing the submit error
      when saving fails.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the local mock save-failure follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac local mock review follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because submitting a local mock did not render a detailed
      review region.
    - Passed after loading the practice review endpoint and rendering answer
      evidence, explanations, and synonym notes.
- Mac local mock resource follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because `POST /api/practice/start` did not return imported
      passage text, source asset paths, or listening audio metadata.
    - Passed after adding resource metadata to started mock questions.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the Mac exam UI still rendered placeholder reading
      text and hid local listening audio metadata.
    - Passed after rendering returned passage text, audio path, and audio duration.
- Mac local listening audio playback follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because `ListeningExamView` did not render a real audio
      element for returned local audio paths.
    - Passed after adding a metadata-preloaded audio element with strict mock
      controls.
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/assetRoutes.test.ts`
    - Initially failed because `/api/assets/local` did not exist.
    - Passed after adding a local asset stream route for imported media and PDF
      files.
    - A second red test confirmed unsupported local file types were rejected
      before adding a media/PDF whitelist.
- Mac local reading PDF viewing follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because reading mock attempts with a PDF asset and no
      extracted passage text did not render a PDF preview.
    - Passed after wiring PDF asset paths into the reading exam view and using
      the local asset API as the embedded PDF source.
- Mac reading selected-text highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the reading exam view had no
      `Highlight selected text` control.
    - Passed after adding selected-text highlight and clear-highlight controls
      while preserving answer-sentence evidence highlighting.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the selected-text highlight follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac reading answer-evidence highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because stored evidence such as `answer sentence` did not
      highlight imported reading text such as `Answer   Sentence`.
    - Passed after the reading exam highlighter began treating casing and
      whitespace differences as equivalent.
- Mac reading pane drag follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because dragging the reading pane divider did not change
      the passage/question pane width.
    - Passed after the divider began calculating pane width from the drag
      position while preserving the click shortcut.
- Mac reading pane keyboard-resize follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the accessible reading pane divider exposed a
      value but did not respond to keyboard resizing commands.
    - Passed after ArrowLeft, ArrowRight, Home, and End began updating the
      passage/question pane split.
- Mac reading notes follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because notes typed in one reading passage were still
      visible after switching to another passage.
    - Passed after notes were keyed by active passage and restored when returning
      to that passage.
- Mac selected-highlight persistence follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because selected reading highlights disappeared after
      switching to another passage and returning.
    - Passed after selected highlights were keyed by active passage.
- Mac listening practice playback-controls follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because listening practice still rendered the local audio
      player in mock mode, hiding native controls and disabling Pause, Seek, and
      Speed.
    - Passed after passing the active attempt mode through to `ListeningExamView`
      so practice attempts keep free playback controls.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the listening practice playback-controls follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac practice-vs-mock timer follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because `ExamShell` always rendered a `Time remaining`
      countdown, even for free practice mode.
    - Passed after adding a timer mode so mock exams keep strict countdown and
      practice sessions show elapsed time without automatic timeout submission.
- Mac static-sample removal follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because `ExamPreview` rendered the fixed
      `The History of Tea` sample exam before any local attempt had been started.
    - Passed after removing the static sample exam and keeping the Mock Exam
      Center focused on local question-bank attempts.
  - `npx pnpm@9.15.4 --filter @ielts/web exec playwright test -g "renders the local IELTS dashboard"`
    - Initially failed because the Playwright dashboard anchor still expected
      the removed static sample exam and its fixed submit flow.
    - Passed after updating the e2e anchor to verify the real starter-only
      initial state.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 db:migrate`
  - Migration command completed with `Database migrations applied.`

## Notes

- This phase delivers the reusable exam UI shell. The dashboard Mock Exam Center
  now renders that shell only for started local mock or practice attempts backed
  by the Phase 3 practice engine.
- The listening player intentionally does not expose native audio controls in mock mode. The visible pause, seek, and speed controls are disabled to make the restriction explicit.

## Next Phase

Phase 5 should implement frequency-weighted random test building: high-frequency weighting, recency penalties, listening P1-P4 set creation, reading P1-P3 set creation, and practice filters.
