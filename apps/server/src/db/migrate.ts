import { openDatabase } from "./database";

export function migrate(databasePath?: string): void {
  const db = openDatabase(databasePath);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate(process.env.IELTS_DB_PATH);
  console.log("Database migrations applied.");
}
