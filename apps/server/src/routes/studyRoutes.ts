import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createAttemptRepo } from "../db/attemptRepo";
import type { DatabaseHandle } from "../db/database";
import { createIntensiveRepo } from "../db/intensiveRepo";
import { createStudyService } from "../services/studyService";
import type { SyncService } from "../sync/syncService";

const createCueBody = z.object({
  endSeconds: z.number(),
  label: z.string().nullable().optional(),
  passageId: z.string().min(1),
  startSeconds: z.number(),
  transcript: z.string().nullable().optional()
});

const createDictationBody = z.object({
  cueId: z.string().min(1),
  userText: z.string()
});

const createMistakeLabelBody = z.object({
  attemptAnswerId: z.string().min(1),
  label: z.string().min(1)
});

export function registerStudyRoutes(server: FastifyInstance, db: DatabaseHandle, sync?: SyncService): void {
  const study = createStudyService(db);
  const intensive = createIntensiveRepo(db);
  const attempts = createAttemptRepo(db);

  server.get("/api/study/overview", async (_request, reply) => reply.send(study.getOverview()));
  server.get("/api/study/intensive", async (_request, reply) => reply.send(study.getIntensivePreview()));
  server.post("/api/study/listening-cues", async (request, reply) => {
    const body = createCueBody.parse(request.body);
    const cue = intensive.createListeningCue({
      endSeconds: body.endSeconds,
      label: body.label ?? null,
      passageId: body.passageId,
      startSeconds: body.startSeconds,
      transcript: body.transcript ?? null
    });

    return reply.code(201).send(cue);
  });
  server.post("/api/study/dictation-attempts", async (request, reply) => {
    const body = createDictationBody.parse(request.body);
    const attempt = intensive.saveDictationAttempt(body);

    return reply.code(201).send(attempt);
  });
  server.post("/api/study/mistake-labels", async (request, reply) => {
    const body = createMistakeLabelBody.parse(request.body);
    const label = attempts.addMistakeLabel(body);
    sync?.appendMistakeEvent({ ...label, attemptAnswerId: body.attemptAnswerId }, new Date().toISOString());

    return reply.code(201).send(label);
  });
}
