import type { DatabaseHandle } from "./database";

export interface SyncEventRecord {
  eventId: string;
  deviceId: string;
  eventType: string;
  payloadJson: string;
  createdAt: string;
}

export function createSyncRepo(db: DatabaseHandle) {
  return {
    recordSyncEvent(input: SyncEventRecord): { inserted: boolean } {
      const result = db
        .prepare(
          `
          INSERT OR IGNORE INTO sync_events (
            event_id,
            device_id,
            event_type,
            payload_json,
            created_at
          )
          VALUES (@eventId, @deviceId, @eventType, @payloadJson, @createdAt)
        `
        )
        .run(input);

      return { inserted: result.changes === 1 };
    },

    hasSyncEvent(eventId: string): boolean {
      const row = db.prepare("SELECT event_id FROM sync_events WHERE event_id = ?").get(eventId);
      return Boolean(row);
    }
  };
}
