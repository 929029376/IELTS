import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeUserSelectedPath } from "../config/runtimePaths";
import type { SyncService } from "../sync/syncService";

export interface SyncRouteOptions {
  syncConfigPath?: string;
}

export function registerSyncRoutes(server: FastifyInstance, sync: SyncService, options: SyncRouteOptions = {}): void {
  const updateSyncConfigSchema = z.object({
    syncFolderPath: z.string().trim().min(1)
  });

  server.get("/api/sync/config", async (request, reply) => {
    sync.ensureSyncFolder();
    return reply.send(sync.getOptions());
  });

  server.put("/api/sync/config", async (request, reply) => {
    const parsed = updateSyncConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "syncFolderPath is required" });
    }

    const nextConfig = sync.updateOptions({
      syncFolderPath: normalizeUserSelectedPath(parsed.data.syncFolderPath)
    });
    if (options.syncConfigPath) {
      mkdirSync(dirname(options.syncConfigPath), { recursive: true });
      writeFileSync(options.syncConfigPath, `${JSON.stringify({ syncFolderPath: nextConfig.syncFolderPath }, null, 2)}\n`);
    }
    return reply.send(nextConfig);
  });

  server.post("/api/sync/import", async (request, reply) => reply.send(sync.importRemoteEvents()));
}
