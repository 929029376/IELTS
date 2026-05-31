import type { FastifyInstance } from "fastify";
import type { DatabaseHandle } from "../db/database";
import { createAnalyticsService, type AnalyticsServiceOptions } from "../services/analyticsService";

export function registerReportsRoutes(
  server: FastifyInstance,
  db: DatabaseHandle,
  options: AnalyticsServiceOptions = {}
): void {
  const reports = createAnalyticsService(db, options);

  server.get("/api/reports/history", async (request, reply) => reply.send(reports.listHistory()));

  server.get("/api/reports/analytics", async (request, reply) => reply.send(reports.getAccuracyAnalytics()));

  server.get("/api/reports/dashboard", async (request, reply) => reply.send(reports.getDashboardReport()));

  server.post("/api/reports/export", async (request, reply) => reply.send(reports.exportReports()));
}
