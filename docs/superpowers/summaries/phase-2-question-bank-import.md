# Phase 2 Question Bank Import Summary

**Date:** 2026-05-31, with Mac import route follow-up on 2026-06-03

**Plan Reference:** `docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md`

## Completed Scope

- Added `source_assets` storage for imported raw assets and extracted text.
- Added question repository support for:
  - checksum source lookup,
  - source asset creation,
  - source asset listing,
  - first passage lookup by source,
  - searchable passage listing.
- Implemented `apps/server/src/importers/listeningZipImporter.ts`.
  - Imports individual listening ZIP files.
  - Imports listening directories recursively.
  - Infers P1-P4 from path or filename.
  - Infers high/medium/low frequency from `高频`, `次高频`, `非高频`.
  - Stores HTML text content.
  - Extracts DOCX raw text when present and readable.
  - Stores PDF and audio assets under the configured asset root.
  - Creates listening audio records for audio files.
  - Uses SHA-256 checksums for dedupe.
  - Marks uncertain imported passages as `needs_review`.
- Implemented `apps/server/src/importers/readingPdfImporter.ts`.
  - Imports individual reading PDFs.
  - Imports reading directories recursively.
  - Extracts part, English title, and Chinese title from filenames.
  - Stores PDF assets under the configured asset root.
  - Marks imported reading passages as `needs_review`.
- Implemented `apps/server/src/importers/frequencyImporter.ts`.
  - Imports structured CSV frequency tables.
  - Imports structured XLSX frequency tables.
  - Imports manually corrected rows, which supports OCR correction workflows from sources like `reading/5月高频表格.jpg`.
  - Stores `subject`, `part`, `englishTitle`, `chineseTitle`, `frequencyClass`, `difficulty`, and `sourceMonth`.
- Added `apps/web/src/features/import/FrequencyCorrectionTable.tsx`.
  - Provides an editable table for OCR/manual frequency row correction before import.
  - Covers subject, part, English title, Chinese title, frequency class, difficulty, and source month.
- Added `apps/server/src/routes/importRoutes.ts`.
  - `POST /api/import/listening-zip`.
  - `POST /api/import/listening-directory`.
  - `POST /api/import/reading-pdf`.
  - `POST /api/import/reading-directory`.
  - `POST /api/import/frequency-file`.
  - `POST /api/import/frequency-rows`.
  - Uses the existing importer modules and stores assets under the configured asset root.
- Added `apps/web/src/features/import/QuestionBankImportPanel.tsx`.
  - Provides Mac local path inputs for the existing `listening` folder and reading PDF folder.
  - Provides frequency CSV/XLSX import and corrected frequency row import.
  - Shows import progress and imported item counts in the dashboard.
- Integrated the Question Bank import panel into the main app dashboard.

## Verification Evidence

- Red test evidence:
  - Initial importer test run failed because `jszip` and importer modules were missing.
- `npx pnpm@9.15.4 --filter @ielts/server test`
  - 4 test files passed.
  - 13 tests passed.
- `npx pnpm@9.15.4 test`
  - Shared: 3 tests passed.
  - Server: 13 tests passed.
  - Web: 4 tests passed.
- `npx pnpm@9.15.4 build`
  - Shared TypeScript build passed.
  - Server TypeScript build passed.
  - Web TypeScript and Vite production build passed.
- `npx pnpm@9.15.4 db:migrate`
  - Migration command completed with `Database migrations applied.`
- `npx pnpm@9.15.4 test:e2e`
  - Playwright Chromium dashboard smoke test passed.
- Mac import route follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/server test -- src/test/importRoutes.test.ts`
    - Initially failed with 404 because the import API routes were missing.
    - Passed after adding `registerImportRoutes` and wiring it into `buildServer`.
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/questionBankImportPanel.test.tsx`
    - Initially failed because `QuestionBankImportPanel` did not exist.
    - Passed after adding the panel and API calls for listening, reading, and frequency imports.
  - `npx pnpm@9.15.4 test:e2e`
    - 2 Playwright Chromium tests passed, including the Question Bank import region and default Mac local paths.
  - `npx pnpm@9.15.4 build`
    - Shared, server, and web production builds passed after the import route and panel changes.
  - `node scripts/mac-readiness-check.mjs`
    - Passed after the import route and panel changes.
    - Shared: 3 tests passed.
    - Server: 41 tests passed.
    - Web: 34 tests passed.
    - Playwright Chromium: 2 tests passed.
    - Production build passed.
    - `desktop:check` passed.
    - Mac DMG packaging passed and generated
      `apps/web/src-tauri/target/release/bundle/dmg/IELTS Local Practice_0.0.0_aarch64.dmg`.
- Real local asset smoke import:
  - Imported `listening/IELTS Listening 虾滑/P4/高频/52. P4 Underwater Archaeological Sites.zip`.
  - Result: listening P4, high frequency, title `Underwater Archaeological Sites`, `needs_review`.
  - Imported `reading/ReadingPractice/PDF/167. P3 - Sign, Baby, Sign! 美国手语.pdf`.
  - Result: reading P3, English title `Sign, Baby, Sign!`, Chinese title `美国手语`, `needs_review`.
- Mac import refresh follow-up:
  - `npx pnpm@9.15.4 --filter @ielts/web test -- src/test/dashboard.test.tsx`
    - Initially failed because a successful Question Bank import updated only
      the import status text; the local study queue and intensive preview stayed
      on their pre-import data.
    - Passed after successful imports notify the dashboard to refresh local
      study overview and intensive study preview data.

## Notes

- Phase 2 intentionally creates passage records as `needs_review` when the source does not provide reliable structured question data. This preserves all raw assets and lets later UI workflows add answer keys, explanations, and answer-sentence metadata safely.
- Reading frequency from the image table is supported through manually corrected rows rather than raw OCR in this phase. A future UI can call the same row import path after OCR/manual cleanup.
- Imported local `listening/` and `reading/` source folders remain ignored by git; only importer code and tests are committed.

## Next Phase

With Phase 2 complete, the project has real-file importers, local-path API routes,
and a Mac dashboard entry point for updating the question bank and frequency table.
Continue tightening the Mac self-use loop by replacing remaining static dashboard
preview data with live API data where it affects daily use.
