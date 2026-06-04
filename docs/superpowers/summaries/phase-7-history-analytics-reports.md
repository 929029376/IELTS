# Phase 7 History, Accuracy, Prediction, and Reports Summary

**Date:** 2026-05-31

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Added `apps/server/src/services/analyticsService.ts`.
- Implemented submitted-attempt history listing with:
  - subject,
  - mode,
  - submitted date,
  - raw score,
  - estimated band,
  - duration.
- Implemented accuracy analytics for:
  - listening and reading parts,
  - question types,
  - frequency classes,
  - mistake-label distribution.
- Implemented score prediction by subject:
  - recent mock exams receive higher weight,
  - practice records are used as a secondary signal,
  - output includes predicted band, band range, confidence label, and basis count.
- Implemented report export:
  - `mock-report-<date>.json`,
  - `mock-report-<date>.csv`,
  - `mistakes-<date>.csv`.
- Added reports API routes:
  - `GET /api/reports/history`,
  - `GET /api/reports/analytics`,
  - `GET /api/reports/dashboard`,
  - `POST /api/reports/export`.
- Added dashboard/report UI preview with:
  - latest mock score,
  - predicted listening score,
  - predicted reading score,
  - weakest question type,
  - recommended next practice,
  - history table,
  - history-row review reopening,
  - accuracy rows,
  - mistake-label chips,
  - report export actions.
- Connected the report export actions to `POST /api/reports/export` in the Mac
  dashboard and display the generated local JSON/CSV file paths after export.
- Added a Mac follow-up that wires the dashboard/report UI to the live local API
  instead of static sample data:
  - `GET /api/reports/history`,
  - `GET /api/reports/analytics`,
  - `GET /api/reports/dashboard`,
  - `GET /api/hardening/status`.
- Added frontend conversion for the server analytics shape so the dashboard can
  render part, frequency, question-type, history, prediction, and hardening data
  from the local database.
- Added a Mac dashboard refresh follow-up so submitting a local mock immediately
  refreshes history, latest mock score, prediction cards, and recommended next
  practice without requiring a browser reload.
- Added Mac estimate-label hardening:
  - mock score reports state that IELTS band scores are estimates,
  - history/prediction cards state that predicted bands are estimates and
    official raw-score cutoffs can vary.
- Added Mac history review reopening:
  - completed attempts in the history table expose a Review action,
  - selecting an attempt calls `GET /api/practice/:attemptId/review`,
  - the reports panel renders saved answer evidence, answer-sentence highlight,
    explanation, accepted answers, synonym notes, and saved sync conflicts.

## Verification Evidence

- Red test evidence:
  - Initial analytics service test failed because `apps/server/src/services/analyticsService.ts` did not exist.
  - Initial reports component test failed because `apps/web/src/features/reports/HistoryReportsPreview.tsx` did not exist.
  - Initial reports route test returned `404` because `/api/reports/*` routes were not registered.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/analyticsService.test.ts`
  - 4 analytics service tests passed.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx src/test/dashboard.test.tsx`
  - History/reports component and dashboard tests passed.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/reportsRoutes.test.ts src/test/analyticsService.test.ts`
  - Reports routes and analytics service tests passed.
- Mac live-dashboard follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because the dashboard did not render live API report data.
    - Passed after replacing sample report/hardening data with local API fetches.
- Mac report-export follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because clicking `Export mock report` did not call the
      reports export API or render exported file paths.
    - Passed after wiring the report buttons to the local export API and showing
      generated JSON/CSV paths in the reports panel.
- Mac history review-reopen follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because the history table rendered submitted attempts but
      did not provide a way to reopen the detailed review.
    - Passed after adding per-attempt Review actions and a history review panel
      backed by the existing local practice review API.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the history review-reopen follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
- Mac history review conflict follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because reopened history reviews did not show saved sync
      conflicts returned by the practice review API.
    - Passed after rendering remote conflicting answers with the source device
      inside the history review panel.
- Mac post-mock dashboard refresh follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because submitting a local mock did not refetch dashboard
      history or prediction data.
    - Passed after the mock exam UI notifies the dashboard to reload reports and
      study overview data after successful local mock submission.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the post-mock dashboard refresh follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac estimate-label follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the mock score report showed an estimated band
      without explaining that cutoffs can vary by test.
    - Passed after adding the estimate note to score reports.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because prediction cards did not show an estimate note.
    - Passed after adding the predicted-band estimate note to the reports panel.
- Final verification:
  - `npx pnpm@9.15.4 test`
    - Shared: 3 tests passed.
    - Server: 26 tests passed.
    - Web: 16 tests passed.
  - `npx pnpm@9.15.4 build`
    - Shared TypeScript build passed.
    - Server TypeScript build passed.
    - Web TypeScript and Vite production build passed.
  - `npx pnpm@9.15.4 db:migrate`
    - Migration command completed with `Database migrations applied.`
  - `npx pnpm@9.15.4 test:e2e`
    - Playwright Chromium dashboard and exam preview test passed.

## Notes

- Prediction is deliberately labeled as an estimate and exposes a range rather than a single official claim.
- Report export writes to the configured export directory; production defaults to
  `data/exports`, and the Mac dashboard now shows the exact generated paths.
- Dashboard report data is available from the API and represented in the current local dashboard preview.

## Next Phase

Phase 8 should implement Baidu Cloud JSONL sync and backup: sync folder configuration, JSONL creation, append-after-write events, import/dedupe, conflict-aware answer merging, and manual backup import/export.
