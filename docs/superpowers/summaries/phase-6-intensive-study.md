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
  - local audio playback through the local asset API,
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
    with audio path, sentence cues, and the highest-priority reading item with
    answer evidence,
  - the Mac dashboard intensive panel now renders local cue, transcript, answer
    sentence, explanation, synonym, keyword, and passage text data when available,
  - the existing sample preview remains only as a fallback when no local data has
    been loaded yet.
- Added local intensive study write APIs and Mac UI wiring:
  - `POST /api/study/listening-cues` creates sentence cues for the active local
    listening passage,
  - `PUT /api/study/listening-cues/:cueId` updates an existing cue's start/end
    time, label, and transcript,
  - `POST /api/study/dictation-attempts` persists dictation attempts and returns
    correctness against the cue transcript,
  - saving a cue in the Mac dashboard immediately enables sentence repeat, and
    submitting dictation shows the saved/correctness result,
  - existing cues can be loaded into the Mac cue editor and corrected without
    recreating the segment.
- Added Mac real-audio sentence repeat wiring:
  - the intensive listening preview now returns the local listening audio path,
  - `IntensiveListeningPlayer` renders a real `<audio>` element served through
    `GET /api/assets/local`,
  - clicking a sentence repeat cue seeks to the cue start time and loops back
    when the player reaches the cue end time.
- Added Mac intensive speed-status wiring:
  - the intensive listening Speed control now shows the active playback rate,
  - toggling slow playback updates both the local audio element and the visible
    speed label so the learner can confirm whether focused replay is slowed.
- Added Mac intensive clear-loop wiring:
  - an active A point or A-B loop now exposes a `Clear loop` control,
  - clearing the loop removes the active repeat range so subsequent playback can
    continue normally outside the focused segment.
- Added Mac dictation flow hardening:
  - submitting a dictation attempt now clears the text box,
  - continuous sentence practice can move to the next cue without carrying the
    previous typed answer forward.
- Added Mac close-reading mistake-label persistence:
  - `/api/study/intensive` now returns the latest wrong reading
    `attemptAnswerId` when available,
  - `POST /api/study/mistake-labels` stores the selected mistake reason against
    that answer,
  - clicking a close-reading mistake-label button in the Mac dashboard shows a
    saved status instead of being a no-op.
- Added Mac manual answer-sentence persistence for close reading:
  - `/api/study/intensive` now returns the reading `answerKeyId`,
  - `POST /api/study/answer-sentence` updates `answer_keys.answer_sentence`,
  - selecting passage text and clicking `Use selected sentence as answer
    evidence` saves the evidence sentence, shows saved status, and immediately
    updates the close-reading highlight.
- Added Mac close-reading keyword evidence wiring:
  - `/api/study/intensive` now reads string keywords from
    `questions.answer_rules_json.keywords`,
  - the Mac close-reading panel can highlight imported or manually curated
    keyword evidence instead of relying only on fallback sample data.
- Added Mac close-reading multiple-keyword highlight support:
  - `CloseReadingView` now renders every supplied keyword highlight,
  - answer-sentence highlights remain first priority when highlight spans overlap.
- Added repeated keyword highlight support:
  - repeated occurrences of the same reading keyword are highlighted throughout
    the passage,
  - overlap handling still preserves answer-sentence evidence as the primary
    highlight.
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
- Mac manual answer-sentence follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because `/api/study/intensive` did not return the
      `answerKeyId` needed to update an answer sentence.
    - Passed after returning the key id and adding
      `POST /api/study/answer-sentence`.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx src/test/dashboard.test.tsx`
    - Initially failed because `Use selected sentence as answer evidence` was a
      no-op in the Mac close-reading panel.
    - Passed after posting the selected browser text to the local study API and
      rendering the saved highlight/status.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the manual answer-sentence persistence follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac close-reading keyword evidence follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because `/api/study/intensive` always returned an empty
      `keywords` array for reading evidence.
    - Passed after parsing `answer_rules_json.keywords` into the intensive
      reading preview.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the close-reading keyword evidence follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac close-reading multiple-keyword highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because `CloseReadingView` highlighted only the first
      keyword in the supplied `keywords` array.
    - Passed after rendering all non-overlapping keyword highlights.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the multiple-keyword highlight follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac repeated keyword highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because repeated occurrences of the same keyword only
      highlighted the first match.
    - Passed after scanning each highlight target through the whole passage.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the repeated keyword highlight follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac missing-evidence close-reading follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because imported reading questions with an answer key but
      no `answer_sentence` and no explanation were excluded from
      `/api/study/intensive`.
    - Passed after allowing those questions into the close-reading preview so
      the Mac UI can manually save the selected answer sentence.
- Mac intensive empty-state follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the intensive preview still rendered sample
      listening and reading content when local passages were unavailable.
    - Passed after replacing sample material with local empty states for missing
      listening and reading data.
- Mac close-reading case-insensitive highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because answer-sentence and keyword highlights required
      exact casing between imported passage text and stored evidence strings.
    - Passed after matching highlight targets case-insensitively while rendering
      the original passage text.
- Mac import-to-intensive refresh follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because `/api/study/intensive` was fetched only once, so
      newly imported reading material did not appear in close reading until a
      page reload.
    - Passed after intensive preview refetches whenever dashboard local data is
      refreshed.
- Mac close-reading flexible-whitespace highlight follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because stored evidence like `answer sentence` did not
      highlight imported passage text split as `answer\nsentence` or
      `trade   routes`.
    - Passed after matching highlight targets with flexible whitespace while
      preserving the original imported passage text inside the highlight.
- Mac intensive real-audio repeat follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed because `/api/study/intensive` returned listening cues but
      no local audio path for the Mac intensive player.
    - Passed after returning the first imported listening audio path for the
      selected listening passage.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because `IntensiveListeningPlayer` had only static control
      buttons and no labeled audio element to play or seek.
    - Passed after rendering a local-asset audio element and making sentence
      repeat seek to the cue start and loop at the cue end.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the intensive real-audio repeat follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac cue update follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts`
    - Initially failed with `404` because existing listening cues could not be
      updated through the local study API.
    - Passed after adding `PUT /api/study/listening-cues/:cueId` and returning
      the corrected cue for the intensive preview.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the Mac intensive panel exposed sentence repeat
      controls but no `Edit Sentence` action for existing cues.
    - Passed after loading existing cue values into the cue editor, saving them
      through `PUT`, and refreshing the repeat label/status.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the cue update follow-up, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
- Mac intensive A-B loop status follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because custom A-B repeat set the loop internally but did
      not show the active A point or A-B range to the learner.
    - Passed after the Mac intensive listening player displayed the selected A
      point and active A-B loop range while keeping the loop behavior intact.
- Mac intensive speed-status follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the intensive listening Speed button did not show
      the active playback rate.
    - Passed after the Speed button rendered the current rate and updated it
      when slow playback was toggled.
- Mac intensive clear-loop follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because an active A-B loop had no `Clear loop` control.
    - Passed after clearing the loop removed the active range and prevented
      later time updates from jumping back to the A point.
- Mac dictation input reset follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/intensiveComponents.test.tsx`
    - Initially failed because the dictation textarea kept the submitted answer.
    - Passed after dictation submit clears the local textarea for continuous
      sentence practice.
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
