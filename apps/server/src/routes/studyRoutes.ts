import type { FastifyInstance } from "fastify";
import type { DatabaseHandle } from "../db/database";
import { createStudyService } from "../services/studyService";

export function registerStudyRoutes(server: FastifyInstance, db: DatabaseHandle): void {
  const study = createStudyService(db);

  server.get("/api/study/overview", async (_request, reply) => reply.send(study.getOverview()));
  server.get("/api/study/intensive", async (_request, reply) => reply.send(study.getIntensivePreview()));
}
