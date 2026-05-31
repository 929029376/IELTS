import type { FastifyInstance } from "fastify";
import type { DatabaseHandle } from "../db/database";
import { createHardeningService, type HardeningServiceOptions } from "../services/hardeningService";

export function registerHardeningRoutes(
  server: FastifyInstance,
  db: DatabaseHandle,
  options: HardeningServiceOptions = {}
): void {
  const hardening = createHardeningService(db, options);

  server.get("/api/hardening/import-failures", async (request, reply) =>
    reply.send(hardening.getImportFailureReport())
  );

  server.get("/api/hardening/question-bank-completeness", async (request, reply) =>
    reply.send(hardening.getQuestionBankCompleteness())
  );

  server.get("/api/hardening/backup-reminder", async (request, reply) => reply.send(hardening.getBackupReminder()));

  server.get("/api/hardening/status", async (request, reply) => reply.send(hardening.getStatus()));
}
