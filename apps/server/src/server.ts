import cors from "@fastify/cors";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { openDatabase } from "./db/database";
import { migrate } from "./db/migrate";
import { registerPracticeRoutes } from "./routes/practiceRoutes";
import { registerReportsRoutes } from "./routes/reportsRoutes";

export interface BuildServerOptions {
  databasePath?: string;
  exportDir?: string;
  now?: string;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: false
  });

  const db = openDatabase(options.databasePath ?? process.env.IELTS_DB_PATH ?? ":memory:");
  migrate(db);

  server.addHook("onClose", async () => {
    db.close();
  });

  void server.register(cors, {
    origin: true
  });

  server.get("/health", async () => ({ ok: true }));
  registerPracticeRoutes(server, db);
  registerReportsRoutes(server, db, {
    exportDir: options.exportDir,
    now: options.now
  });

  return server;
}
