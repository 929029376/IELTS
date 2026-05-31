import cors from "@fastify/cors";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { openDatabase } from "./db/database";

export interface BuildServerOptions {
  databasePath?: string;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: false
  });

  const db = openDatabase(options.databasePath ?? process.env.IELTS_DB_PATH ?? ":memory:");

  server.addHook("onClose", async () => {
    db.close();
  });

  void server.register(cors, {
    origin: true
  });

  server.get("/health", async () => ({ ok: true }));

  return server;
}
