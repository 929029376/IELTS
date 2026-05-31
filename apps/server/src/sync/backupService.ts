import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataDir } from "../config/paths";
import type { DatabaseHandle } from "../db/database";

export interface BackupServiceOptions {
  backupDir?: string;
  now?: string;
}

type Row = Record<string, unknown>;

const backupTables = [
  "sources",
  "source_assets",
  "passages",
  "questions",
  "answer_keys",
  "listening_audio",
  "listening_cues",
  "frequency_entries",
  "attempts",
  "attempt_answers",
  "mistake_labels",
  "attempt_answer_conflicts",
  "stats_snapshots",
  "sync_events",
  "devices"
] as const;

type BackupTable = (typeof backupTables)[number];
type BackupPayload = Record<BackupTable, Row[]> & {
  exportedAt: string;
  schemaVersion: 1;
};

function backupFileName(now: string) {
  return `ielts-backup-${now.replace(/[:.]/g, "-")}.json`;
}

function listRows(db: DatabaseHandle, table: BackupTable): Row[] {
  return db.prepare(`SELECT * FROM ${table}`).all() as Row[];
}

function insertRows(db: DatabaseHandle, table: BackupTable, rows: Row[]) {
  for (const row of rows) {
    const columns = Object.keys(row);
    if (columns.length === 0) {
      continue;
    }

    const columnSql = columns.join(", ");
    const valueSql = columns.map((column) => `@${column}`).join(", ");
    db.prepare(`INSERT OR IGNORE INTO ${table} (${columnSql}) VALUES (${valueSql})`).run(row);
  }
}

export function createBackupService(db: DatabaseHandle, options: BackupServiceOptions = {}) {
  const now = options.now ?? new Date().toISOString();
  const backupDir = options.backupDir ?? join(dataDir, "backups");

  function exportBackup() {
    mkdirSync(backupDir, { recursive: true });
    const payload = backupTables.reduce(
      (backup, table) => ({
        ...backup,
        [table]: listRows(db, table)
      }),
      { exportedAt: now, schemaVersion: 1 } as BackupPayload
    );
    const filePath = join(backupDir, backupFileName(now));

    writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
    return {
      filePath,
      rowCounts: Object.fromEntries(backupTables.map((table) => [table, payload[table].length]))
    };
  }

  function importBackup(filePath: string) {
    if (!existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }

    const payload = JSON.parse(readFileSync(filePath, "utf8")) as Partial<BackupPayload>;
    for (const table of backupTables) {
      insertRows(db, table, payload[table] ?? []);
    }

    return {
      importedTables: backupTables.length,
      rowCounts: Object.fromEntries(backupTables.map((table) => [table, payload[table]?.length ?? 0]))
    };
  }

  return {
    exportBackup,
    importBackup
  };
}
