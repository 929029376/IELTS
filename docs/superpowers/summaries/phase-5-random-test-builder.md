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
- Hardened the Mac study overview recommendations so each recommended mock-set
  part picks the candidate with the highest effective `selectionWeight`, after
  frequency weights and recency penalties are applied.
- Added a local dashboard study queue that consumes the overview API and surfaces
  recommended mock passages from the local question bank.
- Added Mac study queue title fallback hardening:
  - recommended mock passages with whitespace-only imported titles now render as
    `Untitled passage`,
  - the local study queue no longer shows blank recommendation rows when source
    metadata is incomplete.
- Wired `POST /api/practice/start` in `mock` mode to the frequency-weighted full-set
  builder so real mock attempts use one selected passage per IELTS part instead
  of taking the first sequential questions from the database.
- Wired `POST /api/practice/start` in `practice` mode to the planned practice
  filters:
  - part,
  - frequency class,
  - question type,
  - historical mistake label.
- Added Mac dashboard practice filter controls for part, frequency, question
  type, and mistake label before starting reading or listening practice.

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
- Mac study overview recency-recommendation follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because the study overview recommended the first
      alphabetically sorted candidate for a part even when that high-frequency
      passage had just been completed and had a lower effective selection weight.
    - Passed after the overview recommendation path selected the highest
      effective `selectionWeight` per part, keeping mock-start random selection
      separate from the deterministic dashboard recommendation.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the recency-recommendation follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac study queue title fallback follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/studyOverviewPanel.test.tsx`
    - Initially failed because a recommended mock passage with a whitespace-only
      title rendered as a blank row in the study queue.
    - Passed after trimming recommended passage titles and falling back to
      `Untitled passage`.
- Mock-start integration follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because a reading mock start included both a high-frequency
      P1 and a low-frequency P1 from sequential question loading.
    - Passed after routing mock starts through the frequency-weighted full-set
      builder.
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts src/test/testBuilder.test.ts src/test/studyRoutes.test.ts`
    - Practice routes, test builder, and study overview tests passed together.
- Practice-filter API and UI follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because practice starts returned all subject questions
      even when part, frequency-class, question-type, or mistake-label filters
      were supplied.
    - Passed after filtering practice questions in the question repository and
      route/service layers.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the Mac dashboard did not expose the practice
      filters.
    - Passed after adding filter controls and sending selected filters only when
      starting `practice` mode.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the practice-filter follow-up, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
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
