# Phase 3 Practice Engine Summary

**Date:** 2026-05-31

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Added answer normalization and scoring helpers in `packages/shared/src/scoring.ts`:
  - case-insensitive comparison,
  - repeated-space trimming,
  - curly quote normalization,
  - hyphen spacing normalization,
  - accepted answer aliases,
  - max-word checks.
- Added backend practice service and routes:
  - `POST /api/practice/start`
  - `POST /api/practice/:attemptId/answer`
  - `POST /api/practice/:attemptId/submit`
  - `GET /api/practice/:attemptId/review`
- Added question-bank repository read helpers for 40-question practice sessions and answer-key lookup.
- Expanded practice review responses with `reviewItems` so submitted attempts
  include prompt, passage title, accepted answers, answer sentence, explanation,
  synonyms, correctness, and the user's raw answer.
- Added Mac history review reopening so a completed attempt from the history
  table can call `GET /api/practice/:attemptId/review` and display the saved
  detailed answer evidence again.
- Added basic reusable web question components:
  - `AnswerInput`
  - `QuestionNavigator`
- Added Mac dashboard free-practice entry points:
  - reading practice starts through `POST /api/practice/start` with
    `mode: "practice"`,
  - listening practice starts through `POST /api/practice/start` with
    `mode: "practice"`,
  - loaded practice attempts are labelled separately from mock exams in the UI.
- Added practice-start filtering:
  - part,
  - frequency class,
  - question type,
  - historical mistake label.
- Added IELTS number-permitted word-limit scoring:
  - `NO MORE THAN TWO WORDS AND/OR A NUMBER` keeps the number outside the word
    count,
  - explicit answer-rule flags such as `allowNumber` are also honored,
  - the behavior is shared by direct scoring helpers and practice API answers.
- Added question navigation states:
  - unanswered,
  - answered,
  - current,
  - marked,
  - correct,
  - incorrect.
- Added tests for:
  - answer normalization and scoring,
  - 40-question practice API flow,
  - answer persistence through the practice API,
  - submission scoring,
  - detailed review retrieval,
  - reusable answer input and question navigation components.

## Verification Evidence

- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 7 tests passed.
  - Web: 3 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 db:migrate`
  - Migration command completed with `Database migrations applied.`
- `npx pnpm@9.15.4 test:e2e`
  - Playwright Chromium dashboard smoke test passed.
- Mac detailed-review follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because `GET /api/practice/:attemptId/review` did not
      include detailed review items.
    - Passed after adding prompt, answer key, answer sentence, explanation, and
      correctness details to the review response.
- Mac history review-reopen follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/historyReports.test.tsx`
    - Initially failed because completed history attempts had no Review action
      for reopening detailed answer evidence.
    - Passed after adding a history Review button that loads the existing
      practice review API and renders answer sentence highlights, explanations,
      accepted answers, and synonym notes.
- Mac free-practice UI follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the dashboard had mock-start buttons but no
      reading practice start action.
    - Passed after adding reading/listening practice start actions that call the
      practice API with `mode: "practice"` and label the loaded attempt as
      practice.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the Mac free-practice UI follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
- Mac practice-filter follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because `POST /api/practice/start` ignored part,
      frequency-class, question-type, and mistake-label practice filters.
    - Passed after wiring those filters through the route schema, practice
      service, and question repository.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because the dashboard had no practice filter controls.
    - Passed after adding Mac dashboard controls for part, frequency, question
      type, and mistake label and sending those filters with practice starts.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the Mac practice-filter follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
- Mac practice elapsed-timer follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because practice attempts still used the strict mock
      countdown timer and could auto-submit on timeout.
    - Passed after practice attempts switched to elapsed time tracking while
      mock attempts retained countdown auto-submit behavior.
- Mac practice answer-time follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because local practice answer saves still sent
      `timeSpentSeconds: 0` even after the practice elapsed timer was visible.
    - Passed after the Mac practice UI records the attempt start time and sends
      the elapsed answer time with local answer saves.
- Mac practice score-denominator follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because short practice attempts displayed raw score as
      `/40`, the same as a full mock test.
    - Passed after practice score reports use the loaded practice question count
      as the denominator while full mock reports keep `/40`.
- Mac practice accuracy-report follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/examComponents.test.tsx`
    - Initially failed because local practice score reports still displayed an
      IELTS `Estimated band`, which made partial practice sets look like full
      mock results.
    - Passed after practice reports show local practice accuracy while full mock
      reports continue to show estimated IELTS bands.
- Mac word-limit alias scoring follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because practice scoring only honored
      `answerRules.maxWords`; a matched answer with `answerRules.wordLimit`
      could bypass the IELTS word-limit rule.
    - Passed after practice scoring accepted `maxWords`, `wordLimit`, and
      `max_words` rule keys before correctness is calculated.
- Mac textual word-limit scoring follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because a rule like `NO MORE THAN TWO WORDS` did not
      produce a numeric max-word limit.
    - Passed after practice scoring parsed common IELTS English number words in
      word-limit rule strings.
- Mac number-permitted word-limit scoring follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/shared test -- src/scoring.test.ts`
    - Initially failed because `wordCountWithinLimit` did not support a number
      outside the word count.
    - Passed after adding the shared `allowNumber` scoring option.
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/practiceRoutes.test.ts`
    - Initially failed because the practice API parsed the word count but did
      not detect `AND/OR A NUMBER`.
    - Passed after practice scoring detected number-permitted IELTS rule text
      and passed the shared option into answer correctness.

## Notes

- Phase 3 focuses on the practice engine and reusable question UI pieces, not the full IELTS-style exam screen. The exam shell, strict timer, bottom navigation polish, and split reading layout are Phase 4.
- The practice route test seeds 40 questions and proves the API can start, answer,
  submit, review with detailed explanations, and reload a practice attempt.
- Rich per-question option models for choices, maps, and matching will be refined as real importers and exam UI land. The Phase 3 backend can already persist and score the V1 question type set through normalized answer keys.

## Next Phase

Phase 4 should build the IELTS-style exam simulation UI on top of the practice engine: timer, help/settings controls, bottom navigation, review marker, submit warnings, reading split pane, and strict listening playback behavior.
