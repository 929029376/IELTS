import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DatabaseHandle } from "../db/database";
import { createPracticeService } from "../services/practiceService";

const startPracticeSchema = z.object({
  mode: z.enum(["practice", "mock", "intensive"]),
  subject: z.enum(["listening", "reading"])
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  rawAnswer: z.string(),
  timeSpentSeconds: z.number().int().nonnegative(),
  markedForReview: z.boolean()
});

export function registerPracticeRoutes(server: FastifyInstance, db: DatabaseHandle): void {
  const practice = createPracticeService(db);

  server.post("/api/practice/start", async (request, reply) => {
    const input = startPracticeSchema.parse(request.body);
    return reply.send(practice.startPractice(input));
  });

  server.post("/api/practice/:attemptId/answer", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    const input = answerSchema.parse(request.body);
    return reply.send(
      practice.answerQuestion({
        attemptId: params.attemptId,
        ...input
      })
    );
  });

  server.post("/api/practice/:attemptId/submit", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    return reply.send(practice.submitPractice(params.attemptId));
  });

  server.get("/api/practice/:attemptId/review", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    return reply.send(practice.reviewPractice(params.attemptId));
  });
}
