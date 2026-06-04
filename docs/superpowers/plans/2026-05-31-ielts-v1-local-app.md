# IELTS V1 Local App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Mac/Windows local IELTS Listening and Reading practice app with exam simulation, intensive study, local question-bank import, history analytics, frequency-weighted random tests, Baidu Cloud sync logs, and V1-ready scoring/reporting.

**Architecture:** Use a local-first web app: a React/Vite frontend talks to a local Node/Fastify API backed by SQLite. The main database stays on each device, while cross-device history sync uses append-only JSONL files inside `/Users/musheng/Desktop/同步空间/IELTS-Sync` on Mac and a user-selected Baidu Cloud folder on Windows.

**Tech Stack:** TypeScript, React, Vite, Fastify, SQLite, Drizzle ORM, Zod, Vitest, Playwright, jszip, cheerio, mammoth, pdfjs-dist, sharp, optional Tauri packaging after the web app is stable.

---

## Scope

V1 is a personal local program, not a public platform. It must work for one learner across Mac and Windows, using local files and optional Baidu Cloud sync. It does not include account login, online payment, cloud hosting, multi-user roles, or public content distribution.

V1 includes both major workflows:

- **Mock Exam Center:** strict timer, strict listening playback rules, realistic IELTS computer-test layout, full-set submission, raw-score and band-score estimate, review screen, history persistence.
- **Intensive Practice Center:** listening dictation/intensive listening, sentence or segment repeat, reading close reading, answer-sentence highlight, detailed explanations, mistake labels, focused retry.

## Target Folder Layout

Create this structure under `/Users/musheng/Desktop/IELTS`:

```text
/Users/musheng/Desktop/IELTS/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── app/App.tsx
│   │   │   ├── routes/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── styles/
│   │   │   └── test/
│   │   └── playwright.config.ts
│   └── server/
│       ├── package.json
│       ├── src/
│       │   ├── main.ts
│       │   ├── config/
│       │   ├── db/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── importers/
│       │   ├── scoring/
│       │   ├── sync/
│       │   └── test/
│       └── drizzle.config.ts
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── schemas.ts
│           ├── scoring.ts
│           ├── questionTypes.ts
│           └── syncEvents.ts
├── data/
│   ├── ielts.db
│   ├── assets/
│   ├── imports/
│   ├── exports/
│   └── backups/
└── docs/
    └── superpowers/
        └── plans/
```

The Baidu Cloud sync folder is outside the app data folder:

```text
/Users/musheng/Desktop/同步空间/IELTS-Sync/
├── attempts.jsonl
├── answers.jsonl
├── mistakes.jsonl
├── stats.jsonl
├── frequency.jsonl
├── imports.jsonl
└── devices.json
```

## Data Model

Implement these tables in SQLite:

- `devices`: device id, name, platform, first seen time.
- `sources`: original imported file or folder, checksum, import status, version.
- `passages`: reading passage or listening section metadata.
- `questions`: question text, type, part, order, answer rules, explanation links.
- `answer_keys`: accepted answers, answer sentence, explanation, synonyms, word-limit rule.
- `listening_audio`: audio file path, duration, checksum.
- `listening_cues`: sentence or segment start/end times for repeat listening.
- `frequency_entries`: source frequency table, subject, part, frequency class, difficulty.
- `attempts`: mock/practice attempt session.
- `attempt_answers`: per-question response, correctness, time spent, marked-for-review state.
- `mistake_labels`: user-selected or system-suggested mistake reason.
- `stats_snapshots`: aggregated accuracy and score prediction snapshots.
- `sync_events`: imported/exported JSONL event ids for dedupe.

## Scoring Rules

Use a configurable estimated IELTS band table. The app must label all scores as estimates because official raw-score cutoffs can vary by test.

Listening estimate:

```text
39-40 => 9.0
37-38 => 8.5
35-36 => 8.0
32-34 => 7.5
30-31 => 7.0
26-29 => 6.5
23-25 => 6.0
18-22 => 5.5
16-17 => 5.0
13-15 => 4.5
10-12 => 4.0
```

Academic Reading estimate:

```text
39-40 => 9.0
37-38 => 8.5
35-36 => 8.0
33-34 => 7.5
30-32 => 7.0
27-29 => 6.5
23-26 => 6.0
19-22 => 5.5
15-18 => 5.0
13-14 => 4.5
10-12 => 4.0
```

Answer normalization:

- Ignore case.
- Trim repeated spaces.
- Normalize straight and curly apostrophes.
- Normalize hyphen spacing.
- Accept configured answer aliases.
- Apply word-limit rules before correctness.
- Treat spelling mistakes as incorrect unless the answer key explicitly lists the variant.
- Store raw user answer exactly for later review.

## Phase 0: Project Bootstrap

**Outcome:** The app can start locally on Mac, with an empty dashboard and health-checked API.

- [x] Create monorepo files: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`.
- [x] Create `apps/web` with Vite, React, TypeScript, and baseline CSS.
- [x] Create `apps/server` with Fastify, TypeScript, SQLite connection, and `/health`.
- [x] Create `packages/shared` for Zod schemas and shared scoring/question types.
- [x] Add commands:
  - `pnpm dev`: start web and server.
  - `pnpm test`: run unit tests.
  - `pnpm test:e2e`: run Playwright.
  - `pnpm db:migrate`: apply SQLite migrations.
- [x] Add first tests:
  - server health route returns `{ ok: true }`.
  - web dashboard renders app shell.
- [x] Verify on Mac: open `http://localhost:5173`.

**Acceptance:** `pnpm dev` starts the app, `pnpm test` passes, dashboard renders without imported data.

## Phase 1: Local Database and Core Schemas

**Outcome:** The app has durable local storage for question bank, attempts, answers, frequency entries, and sync event ids.

- [x] Define shared Zod schemas in `packages/shared/src/schemas.ts`.
- [x] Define question type enum in `packages/shared/src/questionTypes.ts`.
- [x] Implement SQLite migrations for all V1 tables.
- [x] Implement repositories:
  - `apps/server/src/db/questionRepo.ts`
  - `apps/server/src/db/attemptRepo.ts`
  - `apps/server/src/db/frequencyRepo.ts`
  - `apps/server/src/db/syncRepo.ts`
- [x] Add seed command for a tiny sample listening section and reading passage.
- [x] Add tests for creating a passage, question, answer key, attempt, and answer.

**Acceptance:** A sample question can be inserted, answered, scored, and retrieved from history after server restart.

## Phase 2: Question Bank Import

**Outcome:** Existing local files can be imported into the structured database with source tracking and dedupe.

### Listening ZIP Import

- [x] Implement `apps/server/src/importers/listeningZipImporter.ts`.
- [x] Expose local-path import API routes for single ZIP and directory import.
- [x] Parse ZIP files from existing paths such as `listening/IELTS Listening 虾滑/P1/高频/*.zip`.
- [x] Extract and store:
  - original source path,
  - HTML content,
  - DOCX text when present,
  - PDF path when present,
  - `audio.mp3`,
  - part number from folder or filename,
  - frequency class from folder name: `高频`, `次高频`, `非高频`.
- [x] Use checksums to avoid duplicate imports.
- [x] Store unparsed assets in `data/assets/listening/<sourceId>/`.
- [x] When automatic question parsing is uncertain, create a passage with import status `needs_review` and keep the source visible in the app.

### Reading PDF Import

- [x] Implement `apps/server/src/importers/readingPdfImporter.ts`.
- [x] Expose local-path import API routes for single PDF and directory import.
- [x] Import PDFs from `reading/ReadingPractice/PDF`.
- [x] Extract title, part, English name, Chinese name from filename.
- [x] Store PDF asset path and passage metadata.
- [x] Mark question structure as `needs_review` unless a structured sidecar file is available.

### Frequency Table Import

- [x] Implement `apps/server/src/importers/frequencyImporter.ts`.
- [x] Expose API routes for CSV/XLSX frequency table imports and corrected manual rows.
- [x] Support CSV/XLSX structured frequency tables.
- [x] Support manual correction UI for OCR output from images like `reading/5月高频表格.jpg`.
- [x] Store entries with `subject`, `part`, `englishTitle`, `chineseTitle`, `frequencyClass`, `difficulty`, `sourceMonth`.
- [x] Add a Mac local Question Bank import panel with default listening and reading paths plus frequency update controls.

**Acceptance:** Importing current listening and reading folders creates searchable passage records, frequency classes, source versions, and dedupe records.

## Phase 3: Practice Engine

**Outcome:** The user can open a passage or listening section, answer questions, submit, receive correctness, and save history.

- [x] Implement session creation API:
  - `POST /api/practice/start`
  - `POST /api/practice/:attemptId/answer`
  - `POST /api/practice/:attemptId/submit`
  - `GET /api/practice/:attemptId/review`
- [x] Implement answer normalization and scoring in `packages/shared/src/scoring.ts`.
- [x] Support V1 question types:
  - fill blank,
  - single choice,
  - multiple choice,
  - matching,
  - true/false/not given,
  - yes/no/not given,
  - short answer,
  - table/form/flow completion,
  - map/plan label.
- [x] Build reusable answer components in `apps/web/src/features/questions`.
- [x] Add question navigation state: unanswered, answered, current, marked for review, correct, incorrect.
- [x] Save every answer change locally through the API.
- [x] Return detailed review items from the practice review API, including prompt,
  accepted answers, answer sentence, explanation, synonyms, and correctness.

**Acceptance:** A seeded set of 40 questions can be answered, submitted, reviewed, and reopened from history.

## Phase 4: IELTS-Style Exam Simulation UI

**Outcome:** Mock exam mode feels close to the real computer-delivered IELTS experience without copying protected branding.

- [x] Build exam shell:
  - top timer,
  - help button,
  - settings button,
  - bottom question navigation,
  - review marker,
  - submit/end test button.
- [x] Build reading exam view:
  - left passage pane,
  - right question pane,
  - draggable divider,
  - text highlight,
  - notes panel,
  - font size settings.
- [x] Build listening exam view:
  - section-based question pages,
  - strict audio playback in mock mode,
  - no pause, no seek, no speed change in mock mode,
  - final review time configured by test type.
- [x] Add warnings:
  - unanswered questions before submit,
  - marked questions before submit,
  - time expired auto-submit.
- [x] Add Playwright tests for desktop widths on Mac/Windows-like viewport sizes.
- [x] Add dashboard controls that start reading and listening mock attempts from
  the local practice API.
- [x] Connect started local mock attempts to answer saving, submission, and score
  report rendering in the Mac dashboard exam UI.
- [x] Load detailed review evidence after local mock submission and render answer
  sentence highlights, accepted answers, explanations, and synonym notes.
- [x] Load imported passage text, source asset paths, and listening audio metadata
  into started local mock attempts so the Mac exam UI no longer depends on
  placeholder passage/audio content when local resources are available.

**Acceptance:** Listening and reading mock exams can be completed under strict mode, auto-submit on timeout, and produce a score report.

## Phase 5: Frequency-Weighted Random Test Builder

**Outcome:** The app can generate random practice sets and mock tests that prioritize high-frequency materials while preserving variety.

- [x] Implement weighted selection service in `apps/server/src/services/testBuilder.ts`.
- [x] Apply weights:
  - high frequency: `5`,
  - medium frequency: `3`,
  - low frequency: `1`,
  - no frequency data: `1`.
- [x] Apply recency penalty:
  - completed in last 7 days: multiply by `0.1`,
  - completed in last 30 days: multiply by `0.4`,
  - never completed: multiply by `1`.
- [x] Build listening full set: one P1, one P2, one P3, one P4.
- [x] Build reading full set: one P1, one P2, one P3.
- [x] Add practice filters: subject, part, frequency class, question type, mistake label.
- [x] Add a local study overview API and dashboard queue showing frequency
  distribution, full-mock readiness, cue counts, and recommended mock sets.
- [x] Use the frequency-weighted full-set builder when starting real mock attempts
  through `POST /api/practice/start`.

**Acceptance:** Generated sets prefer high-frequency items, contain the correct part distribution, and avoid excessive recent repetition.

## Phase 6: Intensive Listening and Intensive Reading

**Outcome:** The user can use the app to improve ability, not only check scores.

### Listening Intensive Mode

- [x] Build audio player with practice-only controls:
  - play/pause,
  - seek,
  - speed,
  - A-B loop,
  - segment repeat,
  - dictation input.
- [x] Implement `listening_cues` editor:
  - create segment,
  - adjust start/end time,
  - name segment,
  - attach transcript sentence.
- [x] If cues exist, enable single-sentence repeat.
- [x] If cues do not exist, enable A-B repeat and show a cue creation prompt inside the player.
- [x] Store dictation attempts and compare against transcript when available.
- [x] Add a local intensive study API and Mac dashboard wiring so the intensive
  listening panel uses real passage cues when available.
- [x] Connect the Mac cue editor and dictation submit actions to local study APIs
  so newly created cues immediately enable sentence repeat and dictation results
  are persisted.

### Reading Intensive Mode

- [x] Build close-reading view:
  - passage pane,
  - question pane,
  - answer sentence highlight,
  - keyword highlight,
  - synonym notes,
  - explanation drawer.
- [x] Store answer sentence references in `answer_keys`.
- [x] Support manual answer-sentence selection when imported PDFs do not provide structured answer locations.
- [x] Connect manual answer-sentence selection in the Mac close-reading panel to
  local answer-key persistence.
- [x] Add mistake label selection after each wrong answer.
- [x] Add Mac dashboard wiring so the close-reading panel loads local answer
  sentence, explanation, synonym, keyword, and passage text evidence when
  available.
- [x] Connect Mac close-reading mistake-label buttons to local persistence and
  Baidu Cloud mistake JSONL sync events for the latest wrong reading answer.

**Acceptance:** Listening supports repeatable segments once cues are available, reading supports answer-sentence highlight and explanation review, and mistake labels are saved.

## Phase 7: History, Accuracy, Prediction, and Reports

**Outcome:** The app gives useful feedback for near-term exam preparation.

- [x] Build history page:
  - attempt list,
  - subject,
  - mode,
  - date,
  - raw score,
  - estimated band,
  - duration.
- [x] Build analytics page:
  - listening P1-P4 accuracy,
  - reading P1-P3 accuracy,
  - question type accuracy,
  - frequency class accuracy,
  - mistake label distribution.
- [x] Implement prediction service:
  - use recent mock exams with higher weight,
  - use practice records as secondary signal,
  - output estimated band range and confidence label.
- [x] Export reports:
  - `data/exports/mock-report-<date>.json`,
  - `data/exports/mock-report-<date>.csv`,
  - `data/exports/mistakes-<date>.csv`.
- [x] Connect dashboard report export actions to `POST /api/reports/export` and
  show generated local file paths in the Mac UI.
- [x] Add dashboard cards:
  - latest mock score,
  - predicted listening score,
  - predicted reading score,
  - weakest question type,
  - recommended next practice.
- [x] Connect dashboard/report cards to live local API data instead of static
  sample data.

**Acceptance:** After several attempts, dashboard and analytics show stable history, accuracy, weak points, and predicted band ranges.

## Phase 8: Baidu Cloud Sync and Backup

**Outcome:** Mac and Windows devices can share history without putting SQLite in the sync folder.

- [x] Implement sync folder config:
  - Mac default: `/Users/musheng/Desktop/同步空间/IELTS-Sync`.
  - Windows: user-selected Baidu Cloud sync path.
- [x] Create sync files when missing:
  - `attempts.jsonl`,
  - `answers.jsonl`,
  - `mistakes.jsonl`,
  - `stats.jsonl`,
  - `frequency.jsonl`,
  - `imports.jsonl`,
  - `devices.json`.
- [x] Append events after local database writes.
- [x] Import remote events on startup and on manual sync.
- [x] Connect the Mac dashboard Manual sync action to `POST /api/sync/import`
  and render imported, skipped, and conflict counts.
- [x] Dedupe by `eventId`.
- [x] Merge attempts and answers by `attemptId`, `questionId`, `deviceId`, and `createdAt`.
- [x] Never overwrite a local answer with a remote answer for the same submitted attempt; store both and mark conflict in review.
- [x] Add manual backup export and import from `data/backups`.

**Acceptance:** A record created on one device can appear on another after Baidu Cloud sync completes, without copying `ielts.db`.

## Phase 9: Packaging and Cross-Platform Verification

**Outcome:** V1 can be used on Mac and Windows.

**Current priority note:** Per the 2026-06-02 instruction, Windows hands-on work is
deferred for now. The Mac implementation is verified independently through
`pnpm mac:check`; the cross-platform `pnpm v1:check` gate still requires the final
real Windows runtime report before V1 is globally complete.

- [x] Verify local web mode on Mac.
- [x] Verify local web mode on Windows via GitHub Actions `windows-2022` smoke test.
- [x] Add production build command:
  - `pnpm build`.
- [x] Add desktop packaging with Tauri after web mode is stable:
  - [x] Mac `.dmg`,
  - [x] Windows `.exe` via GitHub Actions artifact `ielts-local-practice-windows-nsis`.
- [ ] Verify file picker, audio playback, PDF viewing, SQLite path, and sync folder path on both systems:
  - [x] Mac packaged runtime diagnostic confirms SQLite path, sync folder path, and file/audio/PDF modes.
  - [x] Mac hands-on file picker, audio playback, and PDF viewing with real imported assets.
  - [x] Mac-only V1 readiness gate `pnpm mac:check` verifies unit tests, Playwright, production build, desktop diagnostics, and Mac DMG packaging.
  - [x] Windows packaged runtime silent install and launch smoke via GitHub Actions.
  - [x] Windows packaged app data path creation smoke via GitHub Actions.
  - [x] Windows packaged runtime diagnostic field construction via `desktop:check` Rust test on GitHub Actions.
  - [x] Windows verification kit can write a structured manual runtime report JSON.
  - [x] Windows CI uploads the generated runtime report as a GitHub Actions artifact.
  - [x] Windows CI validates the generated runtime report JSON before upload.
  - [x] Windows hands-on verification guide documents the artifact download, PowerShell command, manual UI checklist, and report completion rule.
  - [x] Windows runtime report validator can reject incomplete manual evidence before Phase 9 is closed.
  - [x] Windows verification kit ships the runtime report validator with the PowerShell verifier.
  - [ ] Windows packaged runtime diagnostic and hands-on verification.

**Acceptance:** The same app can run on both systems, use local data, import question files, and sync history through the selected Baidu Cloud folder.

## Phase 10: V1 Hardening

**Outcome:** The app is reliable enough for daily exam preparation.

- [x] Add import failure report page.
- [x] Add question-bank completeness page:
  - missing answer key,
  - missing explanation,
  - missing audio,
  - missing transcript,
  - missing listening cues,
  - missing frequency entry.
- [x] Add backup reminder when many attempts exist and no backup has been created recently.
- [x] Add UI empty states for no imported data, no history, and incomplete parsing.
- [x] Add Playwright regression suite:
  - dashboard,
  - import,
  - practice,
  - mock exam,
  - review,
  - history,
  - sync settings.
- [x] Add V1 readiness gate:
  - requires a completed real Windows packaged runtime report,
  - requires observed evidence text for every passed Windows manual checklist item,
  - validates that report before V1 can be treated as complete.
- [x] Add Mac-only readiness gate while Windows hands-on evidence is deferred:
  - `pnpm mac:check`.
- [x] Ensure Playwright Mac dashboard coverage starts both the local API and web
  app, waiting on `/health` before browser assertions.
- [x] Run final verification:
  - `pnpm test`,
  - `pnpm test:e2e`,
  - `pnpm build`.
  - `pnpm desktop:check`,
  - `pnpm desktop:build:mac`.

**Acceptance:** V1 supports the full personal study loop: import, practice, mock exam, review, intensive study, history, prediction, report export, and cross-device record sync.

## Development Order

Build in this order to get usable value early:

1. Phase 0: bootstrap.
2. Phase 1: database and schemas.
3. Phase 3 with seed data: practice loop before complex import.
4. Phase 4: exam simulation.
5. Phase 2: import real local resources.
6. Phase 5: frequency-weighted random tests.
7. Phase 6: intensive listening and reading.
8. Phase 7: analytics and reports.
9. Phase 8: Baidu Cloud sync.
10. Phase 9 and Phase 10: packaging and hardening.

This order ensures the app becomes useful before every importer and advanced feature is perfect.

## Definition of V1 Done

V1 is complete when all statements below are true:

- The program runs on Mac and Windows in local web mode.
- Listening ZIP files can be imported and tracked.
- Reading PDF files can be imported and tracked.
- Frequency entries can be imported or manually corrected.
- The user can complete listening and reading practice sessions.
- The user can complete strict listening and reading mock exams.
- The app calculates raw score and estimated band score.
- The app stores history and per-question answers.
- The app shows accuracy by part, question type, and frequency class.
- The app supports answer review with detailed explanation fields.
- The app supports reading answer-sentence highlight.
- The app supports listening segment repeat when cues are available.
- The app supports manual cue creation when cues are missing.
- The app stores mistake labels.
- The app predicts listening and reading score ranges from history.
- The app exports reports.
- The app syncs history through Baidu Cloud JSONL logs without syncing SQLite directly.
- The app has automated tests for scoring, sync merge, random test generation, and main UI flows.

## Risk Register

| Risk | Impact | V1 Mitigation |
| --- | --- | --- |
| Existing HTML/PDF formats vary by source | Import may be incomplete | Store raw assets, mark uncertain imports as `needs_review`, provide manual correction UI |
| Reading PDFs may not expose structured answer locations | Answer-sentence highlight cannot be automatic | Support manual answer-sentence selection in V1 |
| Listening audio lacks sentence timestamps | Single-sentence repeat cannot be automatic | Provide cue editor and A-B loop; sentence repeat activates once cues exist |
| Baidu Cloud may create conflict copies | Sync history may duplicate records | Use append-only JSONL, event ids, device ids, and conflict-aware merge |
| Exact IELTS band cutoffs vary | Score may appear overconfident | Label all bands as estimated and store configurable score tables |
| Full IELTS UI copying can create IP/branding issues | Legal/design risk | Recreate exam-like workflow without official logo or protected visual assets |

## Self-Review

- All user requirements are covered: timer, practice mode, free answering, mock mode, question-bank updates, frequency classification, frequency update, intensive listening, intensive reading, history, accuracy, detailed explanation, sentence repeat, answer-sentence highlight, mock score, predicted score, IELTS-style interface, Mac/Windows support, and Baidu Cloud sync.
- The plan separates local SQLite from sync logs to reduce cross-device corruption risk.
- The plan includes direct mitigations for the two hardest content problems: unstructured PDFs and missing audio sentence timestamps.
- The plan avoids account, cloud server, and multi-user work because the product is personal and local.
