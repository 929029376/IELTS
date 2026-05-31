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
  - Submit warnings for unanswered and marked questions.
  - Time-expired auto-submit.
- Implemented `ReadingExamView`.
  - Left passage pane.
  - Right question pane.
  - Clickable divider for pane-width changes.
  - Answer text highlighting.
  - Notes panel.
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
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 db:migrate`
  - Migration command completed with `Database migrations applied.`

## Notes

- This phase delivers the reusable exam UI shell and dashboard preview. The shell is designed to sit on top of the Phase 3 practice engine.
- The exam preview uses static sample data. Later phases can connect it to generated mock sets and real imported passages.
- The listening player intentionally does not expose native audio controls in mock mode. The visible pause, seek, and speed controls are disabled to make the restriction explicit.

## Next Phase

Phase 5 should implement frequency-weighted random test building: high-frequency weighting, recency penalties, listening P1-P4 set creation, reading P1-P3 set creation, and practice filters.
