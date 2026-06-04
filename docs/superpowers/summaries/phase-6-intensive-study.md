# Phase 6 Intensive Listening and Intensive Reading Summary

**Date:** 2026-05-31

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Added intensive listening persistence in `apps/server/src/db/intensiveRepo.ts`.
- Added `dictation_attempts` database migration support.
- Implemented listening cue workflows:
  - create cue,
  - update start/end time,
  - label cue,
  - attach transcript.
- Implemented dictation attempt storage with normalized answer comparison against cue transcript.
- Added mistake-label listing support to `attemptRepo`.
- Added intensive listening UI:
  - play/pause,
  - seek,
  - speed,
  - A-B repeat controls,
  - cue-based sentence repeat,
  - dictation input and submit.
- Added cue editor UI for sentence-level listening segmentation.
- Added close-reading UI:
  - passage and question panes,
  - answer sentence highlight,
  - keyword highlight,
  - synonym notes,
  - explanation drawer,
  - manual answer-sentence selection action,
  - wrong-answer mistake labels.
- Mounted the intensive practice preview on the main dashboard so the local app exposes the Phase 6 experience.
- Added live local intensive study data loading:
  - `GET /api/study/intensive` returns the highest-priority listening passage
    with sentence cues and the highest-priority reading item with answer evidence,
  - the Mac dashboard intensive panel now renders local cue, transcript, answer
    sentence, explanation, synonym, keyword, and passage text data when available,
  - the existing sample preview remains only as a fallback when no local data has
    been loaded yet.
- Added local intensive study write APIs and Mac UI wiring:
  - `POST /api/study/listening-cues` creates sentence cues for the active local
    listening passage,
  - `POST /api/study/dictation-attempts` persists dictation attempts and returns
    correctness against the cue transcript,
  - saving a cue in the Mac dashboard immediately enables sentence repeat, and
    submitting dictation shows the saved/correctness result.
- Added Mac close-reading mistake-label persistence:
  - `/api/study/intensive` now returns the latest wrong reading
    `attemptAnswerId` when available,
  - `POST /api/study/mistake-labels` stores the selected mistake reason against
    that answer,
  - clicking a close-reading mistake-label button in the Mac dashboard shows a
    saved status instead of being a no-op.
- Added focused unit tests for intensive server persistence and web components.

## Verification Evidence

- Red test evidence:
  - Initial Phase 6 server test failed because `apps/server/src/db/intensiveRepo.ts` did not exist.
  - Initial Phase 6 web test failed because intensive components did not exist.
- Fix evidence:
  - A build-time type mismatch in `updateListeningCue` exposed that update input should not require `passageId`; the repo API now accepts only editable cue fields.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
  - 7 intensive component tests passed, including fallback labels for unnamed live
    sentence cues and local API wiring for cue save plus dictation submit.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
  - Initially failed with `404` because `/api/study/intensive` did not exist.
  - Passed after adding the intensive study preview API.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
  - Initially failed because `/api/study/intensive` did not return cue-editable
    listening passages without existing cues.
  - Passed after returning the listening `passageId` with empty cue lists and
    adding cue/dictation write routes.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
  - Initially failed because the cue editor and dictation submit actions did not
    call local APIs or render saved status.
  - Passed after wiring the Mac intensive panel to cue and dictation APIs.
- Mac close-reading mistake-label follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because the intensive reading preview did not expose an
      `attemptAnswerId` for the latest wrong reading answer.
    - Passed after returning that identifier and adding the mistake-label write
      route.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because close-reading mistake-label buttons were still
      no-ops in the dashboard preview.
    - Passed after posting selected labels to the local study API and rendering
      saved status.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
  - Initially failed because the dashboard still rendered static intensive sample
    content instead of live local intensive data.
  - Passed after wiring `IntensivePracticePreview` to `/api/study/intensive`.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx src/test/intensiveComponents.test.tsx`
  - Dashboard and intensive component integration checks passed.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 44 tests passed.
  - Web: 44 tests passed.
- `npx pnpm@9.15.4 build`
  - Initially failed because live cue labels can be `null` while the player
    expects stable display labels.
  - Passed after normalizing unnamed cues to `Sentence N`.
- `npx pnpm@9.15.4 test:e2e`
  - 2 Playwright Chromium dashboard regression tests passed.
- `node scripts/mac-readiness-check.mjs`
  - Passed, including unit/component tests, Playwright, production build,
    desktop diagnostics, and Mac DMG packaging.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 21 tests passed.
  - Web: 15 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 db:migrate`
  - Migration command completed with `Database migrations applied.`
- `npx pnpm@9.15.4 test:e2e`
  - Playwright Chromium dashboard and exam preview test passed.

## Notes

- Single-sentence repeat is enabled when cue metadata exists.
- A-B repeat remains available as the fallback when no cue metadata has been created.
- Reading answer-sentence storage was already represented by `answer_keys.answer_sentence`; this phase wires the review UI around that data shape.
- Mistake labels are persisted at the attempt-answer level so Phase 7 analytics can group weak points by error reason.

## Next Phase

Phase 7 should build history, accuracy analytics, score prediction, and report surfaces using the attempt, answer, dictation, and mistake-label records now available.
