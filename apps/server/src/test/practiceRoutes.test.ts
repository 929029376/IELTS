import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { buildServer } from "../server";

function seedFortyQuestions(databasePath: string) {
  const db = openDatabase(databasePath);
  migrate(db);
  const questions = createQuestionRepo(db);

  try {
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/forty-reading.json",
      checksum: "forty-reading-seed",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "Forty Question Practice Set",
      frequencyClass: "high"
    });

    for (let index = 1; index <= 40; index += 1) {
      const question = questions.createQuestion({
        passageId: passage.id,
        questionNumber: index,
        questionType: "fill_blank",
        prompt: `Question ${index}`,
        answerRules: { maxWords: 2 }
      });
      questions.createAnswerKey({
        questionId: question.id,
        acceptedAnswers: [`answer ${index}`],
        answerSentence: `The answer is answer ${index}.`,
        explanation: `Question ${index} is answered directly in the sample text.`,
        synonyms: []
      });
    }
  } finally {
    db.close();
  }
}

describe("practice routes", () => {
  it("starts, answers, submits, reviews, and reloads a 40-question practice attempt", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-practice-routes-"));
    const databasePath = join(tempDir, "ielts.db");
    seedFortyQuestions(databasePath);

    const server = buildServer({ databasePath });

    try {
      const start = await server.inject({
        method: "POST",
        url: "/api/practice/start",
        payload: { mode: "practice", subject: "reading" }
      });
      expect(start.statusCode).toBe(200);
      const started = start.json<{
        attemptId: string;
        questions: Array<{ id: string; questionNumber: number }>;
      }>();
      expect(started.questions).toHaveLength(40);

      const firstQuestion = started.questions[0];
      const answer = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/answer`,
        payload: {
          questionId: firstQuestion.id,
          rawAnswer: " Answer 1 ",
          timeSpentSeconds: 11,
          markedForReview: true
        }
      });
      expect(answer.statusCode).toBe(200);
      expect(answer.json()).toMatchObject({
        normalizedAnswer: "answer 1",
        isCorrect: true,
        markedForReview: true
      });

      const submit = await server.inject({
        method: "POST",
        url: `/api/practice/${started.attemptId}/submit`
      });
      expect(submit.statusCode).toBe(200);
      expect(submit.json()).toMatchObject({
        rawScore: 1,
        estimatedBand: 0
      });

      const review = await server.inject({
        method: "GET",
        url: `/api/practice/${started.attemptId}/review`
      });
      expect(review.statusCode).toBe(200);
      expect(review.json()).toMatchObject({
        id: started.attemptId,
        answers: [
          expect.objectContaining({
            questionId: firstQuestion.id,
            rawAnswer: " Answer 1 ",
            isCorrect: true
          })
        ]
      });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
