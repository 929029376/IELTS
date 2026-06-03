import cors from "@fastify/cors";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { openDatabase } from "./db/database";
import { migrate } from "./db/migrate";
import { dataDir } from "./config/paths";
import { registerBackupRoutes } from "./routes/backupRoutes";
import { registerHardeningRoutes } from "./routes/hardeningRoutes";
import { registerImportRoutes } from "./routes/importRoutes";
import { registerPracticeRoutes } from "./routes/practiceRoutes";
import { registerReportsRoutes } from "./routes/reportsRoutes";
import { registerStudyRoutes } from "./routes/studyRoutes";
import { registerSyncRoutes } from "./routes/syncRoutes";
import { createSyncService, type SyncServiceOptions } from "./sync/syncService";

export interface BuildServerOptions {
  assetRoot?: string;
  backupDir?: string;
  backupReminderAttemptThreshold?: number;
  databasePath?: string;
  exportDir?: string;
  now?: string;
  sync?: SyncServiceOptions;
  testBuilderRandom?: () => number;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: false
  });

  const db = openDatabase(options.databasePath ?? process.env.IELTS_DB_PATH ?? ":memory:");
  migrate(db);
  server.decorate("db", db);

  server.addHook("onClose", async () => {
    db.close();
  });

  void server.register(cors, {
    origin: true
  });

  const sync = options.sync ? createSyncService(db, options.sync) : undefined;
  if (sync) {
    sync.ensureSyncFolder();
    sync.importRemoteEvents();
  }

  server.get("/health", async () => ({ ok: true }));
  registerImportRoutes(server, db, {
    assetRoot: options.assetRoot ?? `${dataDir}/assets`
  });
  registerPracticeRoutes(server, db, sync, {
    random: options.testBuilderRandom
  });
  registerStudyRoutes(server, db);
  registerReportsRoutes(server, db, {
    exportDir: options.exportDir,
    now: options.now
  });
  registerBackupRoutes(server, db, {
    backupDir: options.backupDir,
    now: options.now
  });
  registerHardeningRoutes(server, db, {
    backupDir: options.backupDir,
    backupReminderAttemptThreshold: options.backupReminderAttemptThreshold,
    now: options.now
  });
  if (sync && options.sync) {
    registerSyncRoutes(server, sync, options.sync);
  }

  return server;
}
