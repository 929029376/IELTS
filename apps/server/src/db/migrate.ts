import { openDatabase, type DatabaseHandle } from "./database";

export function migrate(target?: string | DatabaseHandle): void {
  const db = typeof target === "object" && target !== null ? target : openDatabase(target);
  const shouldClose = !(typeof target === "object" && target !== null);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        first_seen_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        original_path TEXT NOT NULL,
        checksum TEXT NOT NULL UNIQUE,
        import_status TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS source_assets (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        asset_kind TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT,
        text_content TEXT,
        checksum TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS passages (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        part TEXT NOT NULL,
        title TEXT NOT NULL,
        frequency_class TEXT NOT NULL DEFAULT 'unknown',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS listening_audio (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        duration_seconds REAL,
        checksum TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        question_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        answer_rules_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (passage_id, question_number)
      );

      CREATE TABLE IF NOT EXISTS answer_keys (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        accepted_answers_json TEXT NOT NULL,
        answer_sentence TEXT,
        explanation TEXT,
        synonyms_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS listening_cues (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
        start_seconds REAL NOT NULL,
        end_seconds REAL NOT NULL,
        label TEXT,
        transcript TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dictation_attempts (
        id TEXT PRIMARY KEY,
        cue_id TEXT NOT NULL REFERENCES listening_cues(id) ON DELETE CASCADE,
        user_text TEXT NOT NULL,
        normalized_text TEXT NOT NULL,
        is_correct INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS frequency_entries (
        id TEXT PRIMARY KEY,
        source_month TEXT NOT NULL,
        subject TEXT NOT NULL,
        part TEXT NOT NULL,
        english_title TEXT NOT NULL,
        chinese_title TEXT,
        frequency_class TEXT NOT NULL,
        difficulty REAL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (source_month, subject, part, english_title)
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        subject TEXT NOT NULL,
        started_at TEXT NOT NULL,
        submitted_at TEXT,
        raw_score INTEGER,
        estimated_band REAL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attempt_questions (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        question_order INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (attempt_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS attempt_answers (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        raw_answer TEXT NOT NULL,
        normalized_answer TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        time_spent_seconds INTEGER NOT NULL,
        marked_for_review INTEGER NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (attempt_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS mistake_labels (
        id TEXT PRIMARY KEY,
        attempt_answer_id TEXT NOT NULL REFERENCES attempt_answers(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (attempt_answer_id, label)
      );

      CREATE TABLE IF NOT EXISTS attempt_answer_conflicts (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        local_answer_id TEXT NOT NULL REFERENCES attempt_answers(id) ON DELETE CASCADE,
        remote_answer_id TEXT NOT NULL,
        remote_device_id TEXT NOT NULL,
        remote_created_at TEXT NOT NULL,
        remote_raw_answer TEXT NOT NULL,
        remote_normalized_answer TEXT NOT NULL,
        remote_is_correct INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'conflict',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (attempt_id, question_id, remote_device_id, remote_created_at)
      );

      CREATE TABLE IF NOT EXISTS stats_snapshots (
        id TEXT PRIMARY KEY,
        snapshot_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_events (
        event_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.prepare("INSERT OR IGNORE INTO migrations (name) VALUES (?)").run("0001_v1_core_schema");
  } finally {
    if (shouldClose) {
      db.close();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate(process.env.IELTS_DB_PATH);
  console.log("Database migrations applied.");
}
