# Phase 8 Baidu Cloud Sync and Backup Summary

**Date:** 2026-06-01

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Consolidated development onto `master`; old `phase-*` branches were removed from GitHub after `master` became the default branch.
- Added sync folder configuration with:
  - Mac default path: `/Users/musheng/Desktop/同步空间/IELTS-Sync`,
  - Windows selected-folder support.
- Added sync folder initialization for:
  - `attempts.jsonl`,
  - `answers.jsonl`,
  - `mistakes.jsonl`,
  - `stats.jsonl`,
  - `frequency.jsonl`,
  - `imports.jsonl`,
  - `devices.json`.
- Added append-only JSONL sync events for practice writes:
  - attempt creation,
  - answer saving,
  - attempt submission,
  - close-reading mistake-label selection.
- Added append-only JSONL sync events for Mac intensive listening writes:
  - sentence cue creation,
  - dictation attempt saving.
- Added append-only JSONL sync events for Mac close-reading evidence writes:
  - manual answer-sentence updates are written as
    `answer_key.answer_sentence.updated` events in `imports.jsonl`.
- Added append-only JSONL sync events for frequency table writes:
  - CSV/XLSX frequency imports append `frequency.entry.upserted` events,
  - manually corrected frequency rows append `frequency.entry.upserted` events,
  - remote frequency events update local `frequency_entries` so
    high-frequency-first test building stays consistent across devices.
- Added defensive import handling for remote close-reading evidence sync events:
  - answer-sentence events wait until the referenced answer key exists locally,
  - manual sync skips unresolved answer-key events instead of crashing when
    another device has not imported the same question-bank rows yet.
- Added defensive import handling for remote intensive listening sync events:
  - cue events wait until the referenced passage exists locally,
  - dictation events wait until the referenced cue exists locally,
  - manual sync skips those events instead of crashing when another device has
    not imported the same question-bank rows yet.
- Added remote JSONL import:
  - on server startup when sync is configured,
  - through `POST /api/sync/import`.
- Added forward-compatible sync import handling:
  - unknown future event types are skipped without recording them in
    `sync_events`,
  - later app versions can still process those events once support is added.
- Added malformed JSONL tolerance for Baidu Cloud sync logs:
  - malformed JSONL lines are counted as skipped,
  - valid events in the same file still import,
  - a partially written or conflict-corrupted sync line no longer prevents local
    startup.
- Added devices metadata repair for Baidu Cloud sync:
  - malformed `devices.json` is treated as empty device metadata,
  - the current device entry is rewritten so sync startup continues.
- Added event dedupe through `sync_events.event_id`.
- Added merge behavior for attempts and answers.
- Added conflict preservation for submitted local attempts:
  - remote conflicting answers are stored in `attempt_answer_conflicts`,
  - local submitted answers are not overwritten,
  - conflicts are returned in practice review.
- Added sync API:
  - `GET /api/sync/config`,
  - `POST /api/sync/import`.
- Connected the Mac dashboard Manual sync action to `POST /api/sync/import`
  and added local UI feedback for imported, skipped, and conflict counts.
- Added manual backup service and API:
  - `POST /api/backups/export`,
  - `POST /api/backups/import`.
- Backup export writes restore-ready JSON into `data/backups` by default and includes question-bank skeleton, attempts, answers, mistake labels, conflicts, sync events, stats, frequency, devices, listening cues, and dictation attempts.
- Connected the Mac dashboard Sync settings panel to manual backup operations:
  - export backup through `POST /api/backups/export`,
  - display the generated backup JSON path and key row counts,
  - import a pasted backup JSON path through `POST /api/backups/import`,
  - display imported table and row counts after restore.

## Verification Evidence

- Red test evidence:
  - Initial sync service test failed because `apps/server/src/sync/syncService.ts` did not exist.
  - Initial sync route test returned `404` because `/api/sync/*` routes were not registered.
  - Initial backup service test failed because `apps/server/src/sync/backupService.ts` did not exist.
  - Initial backup route test returned `404` because `/api/backups/*` routes were not registered.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncService.test.ts`
  - Sync folder, append, import, dedupe, merge, and conflict tests passed.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
  - Manual sync API and startup import tests passed.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/studyRoutes.test.ts src/test/syncRoutes.test.ts`
  - Passed after the Mac close-reading mistake-label route was wired to local
    persistence and optional `mistake.added` JSONL sync events.
- Mac intensive listening sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because saving listening cues and dictation attempts left
      `stats.jsonl` empty.
    - Passed after appending `intensive.listening_cue.created` and
      `intensive.dictation_attempt.saved` events to Baidu Cloud sync logs.
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed with a SQLite foreign-key error when remote intensive
      events referenced passage/cue ids missing on the current device.
    - Passed after safely skipping unresolved remote intensive events until the
      referenced local question-bank rows exist.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the intensive listening sync follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac close-reading answer-sentence sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because saving answer-sentence evidence left
      `imports.jsonl` empty and remote answer-sentence events were ignored.
    - Passed after appending `answer_key.answer_sentence.updated` events and
      applying resolvable remote answer-key updates during manual sync/startup
      import.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the close-reading answer-sentence sync follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Mac frequency-table sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because local frequency-row imports left `frequency.jsonl`
      empty and remote frequency events were ignored.
    - Passed after appending and importing `frequency.entry.upserted` events.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the frequency-table sync follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
- Sync forward-compatibility follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because unknown future sync events were recorded in
      `sync_events` as already processed.
    - Passed after treating unknown event types as skipped and leaving them
      unrecorded for future app versions.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the sync forward-compatibility follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- Malformed JSONL sync follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncRoutes.test.ts`
    - Initially failed because one malformed JSONL line threw during startup
      import and prevented a valid event in the same file from importing.
    - Passed after parsing JSONL line-by-line, counting malformed lines as
      skipped, and continuing with valid events.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the malformed JSONL sync follow-up, including unit/component
      tests, Playwright, production build, desktop diagnostics, and Mac DMG
      packaging.
- Malformed devices metadata follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/syncService.test.ts`
    - Initially failed because malformed `devices.json` threw in
      `ensureSyncFolder`.
    - Passed after treating malformed devices metadata as empty and rewriting the
      current device entry.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the malformed devices metadata follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
  - Initially failed because the Manual sync button did not call the sync API or
    render a completion status.
  - Passed after wiring the button to `POST /api/sync/import`.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/backupService.test.ts`
  - Initially failed because `dictation_attempts` were missing from the backup
    payload.
  - Passed after adding `dictation_attempts` to manual backup export/import
    after `listening_cues` so restore order preserves foreign keys.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the manual backup dictation-attempt follow-up, including
      unit/component tests, Playwright, production build, desktop diagnostics,
      and Mac DMG packaging.
- `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/backupRoutes.test.ts`
  - Manual backup API test passed.
- Mac manual backup UI follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/syncSettingsPreview.test.tsx`
    - Initially failed because the Sync settings panel exposed manual sync but
      did not expose backup export/import actions.
    - Passed after adding export/import backup controls, local backup path input,
      and exported/imported row-count feedback.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the manual backup UI follow-up, including unit/component tests,
      Playwright, production build, desktop diagnostics, and Mac DMG packaging.
- Final verification:
  - `npx pnpm@9.15.4 test`
    - Shared: 3 tests passed.
    - Server: 34 tests passed.
    - Web: 16 tests passed.
  - `npx pnpm@9.15.4 build`
    - Shared TypeScript build passed.
    - Server TypeScript build passed.
    - Web TypeScript and Vite production build passed.
  - `npx pnpm@9.15.4 db:migrate`
    - Migration command completed with `Database migrations applied.`
  - `npx pnpm@9.15.4 test:e2e`
    - Playwright Chromium dashboard and exam preview test passed.
  - `git diff --check`
    - No whitespace errors reported.

## Notes

- SQLite remains outside the Baidu Cloud folder. Only JSONL event logs and device metadata are placed in the sync folder.
- Local submitted answers are treated as immutable for conflict handling; remote conflicting answers are preserved for review rather than applied destructively.
- Existing historical branch commits are still reachable through `master`; the GitHub branch list is now clean.

## Next Phase

Phase 9 should verify Mac and Windows local web mode, confirm production build behavior, and start desktop packaging only after web mode is stable.
