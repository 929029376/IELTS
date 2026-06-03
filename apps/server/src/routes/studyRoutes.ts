import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DatabaseHandle } from "../db/database";
import { createIntensiveRepo } from "../db/intensiveRepo";
import { createStudyService } from "../services/studyService";

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

export function registerStudyRoutes(server: FastifyInstance, db: DatabaseHandle): void {
  const study = createStudyService(db);
  const intensive = createIntensiveRepo(db);

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
}
