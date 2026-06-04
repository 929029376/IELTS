import type { FastifyInstance } from "fastify";
import type { DatabaseHandle } from "../db/database";
import { createAnalyticsService, type AnalyticsServiceOptions } from "../services/analyticsService";
import type { SyncService } from "../sync/syncService";

export interface ReportRouteOptions extends AnalyticsServiceOptions {
  sync?: SyncService;
}

export function registerReportsRoutes(
  server: FastifyInstance,
  db: DatabaseHandle,
  options: ReportRouteOptions = {}
): void {
  const reports = createAnalyticsService(db, options);

  server.get("/api/reports/history", async (request, reply) => reply.send(reports.listHistory()));

  server.get("/api/reports/analytics", async (request, reply) => reply.send(reports.getAccuracyAnalytics()));

  server.get("/api/reports/dashboard", async (request, reply) => reply.send(reports.getDashboardReport()));

  server.post("/api/reports/export", async (request, reply) => reply.send(reports.exportReports()));

  server.post("/api/reports/snapshot", async (request, reply) => {
    const snapshot = reports.createDashboardSnapshot();
    options.sync?.appendStatsSnapshotEvent(snapshot, snapshot.createdAt);
    return reply.send(snapshot);
  });
}
