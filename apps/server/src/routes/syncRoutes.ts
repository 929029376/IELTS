import type { FastifyInstance } from "fastify";
import type { SyncService } from "../sync/syncService";

export interface SyncRouteConfig {
  deviceId: string;
  deviceName: string;
  platform: string;
  syncFolderPath: string;
}

export function registerSyncRoutes(server: FastifyInstance, sync: SyncService, config: SyncRouteConfig): void {
  server.get("/api/sync/config", async (request, reply) => {
    sync.ensureSyncFolder();
    return reply.send(config);
  });

  server.post("/api/sync/import", async (request, reply) => reply.send(sync.importRemoteEvents()));
}
