# Phase 5 Frequency-Weighted Random Test Builder Summary

**Date:** 2026-05-31

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Added `apps/server/src/services/testBuilder.ts`.
- Implemented frequency-based selection weights:
  - high: `5`
  - medium: `3`
  - low: `1`
  - unknown: `1`
- Implemented recency penalties:
  - completed in last 7 days: `0.1`
  - completed in last 30 days: `0.4`
  - never completed or older than 30 days: `1`
- Implemented deterministic `weightedPick` support for testable random selection.
- Implemented full listening set builder:
  - one P1 passage,
  - one P2 passage,
  - one P3 passage,
  - one P4 passage.
- Implemented full reading set builder:
  - one P1 passage,
  - one P2 passage,
  - one P3 passage.
- Implemented candidate filtering by:
  - subject,
  - part,
  - frequency class,
  - question type,
  - mistake label.
- Added `addMistakeLabel` support to `attemptRepo` so mistake-label filters can use persisted history.
- Added a Mac self-use study overview API:
  - `GET /api/study/overview`.
- The overview reports:
  - listening and reading passage counts,
  - question counts,
  - listening cue counts,
  - frequency distribution by subject,
  - whether full listening and reading mock sets are currently buildable,
  - high-frequency-first recommended listening and reading mock sets.
- Added a local dashboard study queue that consumes the overview API and surfaces
  recommended mock passages from the local question bank.

## Verification Evidence

- Red test evidence:
  - Initial Phase 5 backend test failed because `apps/server/src/services/testBuilder.ts` did not exist.
- `npx pnpm@9.15.4 --filter @ielts/server test`
  - 5 server test files passed.
  - 18 server tests passed.
- Mac study overview follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts src/test/testBuilder.test.ts`
    - Initially failed with `404` for `/api/study/overview`.
    - Passed after adding the study overview route and service.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because the dashboard did not render `Local study queue`.
    - Passed after adding the study overview panel and API loading hook.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 18 tests passed.
  - Web: 10 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 db:migrate`
  - Migration command completed with `Database migrations applied.`
- `npx pnpm@9.15.4 test:e2e`
  - Playwright Chromium dashboard and exam preview test passed.

## Notes

- The test builder works at the passage level, which matches current importer output and the planned IELTS set structure.
- Random selection accepts an injected random function so weighted behavior can be tested deterministically.
- Recency is derived from submitted attempts connected to passage questions through `attempt_answers`.

## Next Phase

Phase 6 should implement intensive listening and intensive reading: practice audio controls, A-B loop, cue editor, transcript/dictation storage, answer-sentence highlight workflows, explanation drawer, and mistake label selection.
