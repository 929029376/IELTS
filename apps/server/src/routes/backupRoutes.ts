import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DatabaseHandle } from "../db/database";
import { createBackupService, type BackupServiceOptions } from "../sync/backupService";

const importBackupSchema = z.object({
  filePath: z.string().min(1)
});

export function registerBackupRoutes(
  server: FastifyInstance,
  db: DatabaseHandle,
  options: BackupServiceOptions = {}
): void {
  const backups = createBackupService(db, options);

  server.post("/api/backups/export", async (request, reply) => reply.send(backups.exportBackup()));

  server.post("/api/backups/import", async (request, reply) => {
    const input = importBackupSchema.parse(request.body);
    return reply.send(backups.importBackup(input.filePath));
  });
}
