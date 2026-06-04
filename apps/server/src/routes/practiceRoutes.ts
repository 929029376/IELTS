import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { frequencyClassSchema, partSchema, questionTypeSchema } from "@ielts/shared";
import { createAttemptRepo } from "../db/attemptRepo";
import type { DatabaseHandle } from "../db/database";
import {
  createPracticeService,
  EmptyPracticeStartError,
  PracticeAttemptNotFoundError
} from "../services/practiceService";
import { MissingMockCandidateError, type TestBuilderOptions } from "../services/testBuilder";
import type { SyncService } from "../sync/syncService";

const startPracticeSchema = z.object({
  frequencyClass: frequencyClassSchema.optional(),
  mistakeLabel: z.string().min(1).optional(),
  mode: z.enum(["practice", "mock", "intensive"]),
  part: partSchema.optional(),
  questionType: questionTypeSchema.optional(),
  subject: z.enum(["listening", "reading"])
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  rawAnswer: z.string(),
  timeSpentSeconds: z.number().int().nonnegative(),
  markedForReview: z.boolean()
});

export function registerPracticeRoutes(
  server: FastifyInstance,
  db: DatabaseHandle,
  sync?: SyncService,
  testBuilderOptions: TestBuilderOptions = {}
): void {
  const practice = createPracticeService(db, testBuilderOptions);
  const attempts = createAttemptRepo(db);

  server.post("/api/practice/start", async (request, reply) => {
    const input = startPracticeSchema.parse(request.body);
    let result: ReturnType<typeof practice.startPractice>;
    try {
      result = practice.startPractice(input);
    } catch (error) {
      if (error instanceof EmptyPracticeStartError) {
        return reply.code(409).send({ error: error.message });
      }
      if (error instanceof MissingMockCandidateError) {
        return reply.code(409).send({ error: error.message });
      }
      throw error;
    }
    const attempt = attempts.getAttemptWithAnswers(result.attemptId);
    if (attempt) {
      sync?.appendAttemptEvent("attempt.created", attempt, attempt.startedAt);
    }
    return reply.send(result);
  });

  server.post("/api/practice/:attemptId/answer", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    const input = answerSchema.parse(request.body);
    let result: ReturnType<typeof practice.answerQuestion>;
    try {
      result = practice.answerQuestion({
        attemptId: params.attemptId,
        ...input
      });
    } catch (error) {
      if (error instanceof PracticeAttemptNotFoundError) {
        return reply.code(404).send({ error: error.message });
      }
      throw error;
    }
    sync?.appendAnswerEvent(result, new Date().toISOString());
    return reply.send(result);
  });

  server.post("/api/practice/:attemptId/submit", async (request, reply) => {
    const params = z.object({ attemptId: z.string().min(1) }).parse(request.params);
    let result: ReturnType<typeof practice.submitPractice>;
    try {
      result = practice.submitPractice(params.attemptId);
    } catch (error) {
      if (error instanceof PracticeAttemptNotFoundError) {
        return reply.code(404).send({ error: error.message });
      }
      throw error;
    }
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
