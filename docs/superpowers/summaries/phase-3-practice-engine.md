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

## Notes

- Phase 3 focuses on the practice engine and reusable question UI pieces, not the full IELTS-style exam screen. The exam shell, strict timer, bottom navigation polish, and split reading layout are Phase 4.
- The practice route test seeds 40 questions and proves the API can start, answer,
  submit, review with detailed explanations, and reload a practice attempt.
- Rich per-question option models for choices, maps, and matching will be refined as real importers and exam UI land. The Phase 3 backend can already persist and score the V1 question type set through normalized answer keys.

## Next Phase

Phase 4 should build the IELTS-style exam simulation UI on top of the practice engine: timer, help/settings controls, bottom navigation, review marker, submit warnings, reading split pane, and strict listening playback behavior.
