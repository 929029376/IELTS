# Phase 1 Local Database and Core Schemas Summary

**Date:** 2026-05-31

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Expanded the shared package with V1 question types, subject/part/frequency schemas, scoring exports, and sync event envelope types.
- Implemented the V1 SQLite schema in `apps/server/src/db/migrate.ts`.
- Added core tables for:
  - devices,
  - sources,
  - passages,
  - listening audio,
  - questions,
  - answer keys,
  - listening cues,
  - frequency entries,
  - attempts,
  - attempt answers,
  - mistake labels,
  - stats snapshots,
  - sync events.
- Added repository modules:
  - `apps/server/src/db/questionRepo.ts`
  - `apps/server/src/db/attemptRepo.ts`
  - `apps/server/src/db/frequencyRepo.ts`
  - `apps/server/src/db/syncRepo.ts`
- Added `db:seed` command and `apps/server/src/db/seed.ts` for inserting a tiny sample listening section, reading passage, questions, answer keys, frequency entry, and attempt.
- Added repository tests covering:
  - source, passage, question, and answer-key creation,
  - attempt and answer storage,
  - persistence across reopened SQLite file handles,
  - frequency entry upsert,
  - sync event dedupe.

## Verification Evidence

- `npx pnpm@9.15.4 --filter @ielts/server test`
  - 2 test files passed.
  - 6 tests passed.
- `npx pnpm@9.15.4 db:seed`
  - Seed command completed with `Seed data inserted.`
- `npx pnpm@9.15.4 test`
  - Web: 1 test passed.
  - Server: 6 tests passed.
  - Shared package: no test files yet, allowed at this phase.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 db:migrate`
  - Migration command completed with `Database migrations applied.`
- `npx pnpm@9.15.4 test:e2e`
  - Playwright Chromium dashboard smoke test passed.

## Notes

- The repository layer uses `better-sqlite3` directly for Phase 1. This keeps the data boundary explicit and small while still matching the planned SQLite storage model.
- `migrate` now accepts either a database path or an existing database handle, which makes tests fast and keeps the command-line migration path intact.
- The seed command writes to the local app database by default. The database is ignored by git.

## Next Phase

The next implementation phase should follow the plan's development order: Phase 3 with seed data, so the app gets an end-to-end practice loop before the more complex real-file importers.
