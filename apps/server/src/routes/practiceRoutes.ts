import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createAttemptRepo } from "../db/attemptRepo";
import type { DatabaseHandle } from "../db/database";
import { createPracticeService } from "../services/practiceService";
import type { SyncService } from "../sync/syncService";

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

export function registerPracticeRoutes(server: FastifyInstance, db: DatabaseHandle, sync?: SyncService): void {
  const practice = createPracticeService(db);
  const attempts = createAttemptRepo(db);

  server.post("/api/practice/start", async (request, reply) => {
    const input = startPracticeSchema.parse(request.body);
    const result = practice.startPractice(input);
    const attempt = attempts.getAttemptWithAnswers(result.attemptId);
    if (attempt) {
      sync?.appendAttemptEvent("attempt.created", attempt, attempt.startedAt);
    }
    return reply.send(result);
  });

  server.post("/api/practice/:attemptId/answer", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    const input = answerSchema.parse(request.body);
    const result = practice.answerQuestion({
        attemptId: params.attemptId,
        ...input
      });
    sync?.appendAnswerEvent(result, new Date().toISOString());
    return reply.send(result);
  });

  server.post("/api/practice/:attemptId/submit", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    const result = practice.submitPractice(params.attemptId);
    const attempt = attempts.getAttemptWithAnswers(params.attemptId);
    if (attempt) {
      sync?.appendAttemptEvent("attempt.submitted", attempt, result.submittedAt);
    }
    return reply.send(result);
  });

  server.get("/api/practice/:attemptId/review", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    return reply.send(practice.reviewPractice(params.attemptId));
  });
}
