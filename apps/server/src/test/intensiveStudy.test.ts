import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAttemptRepo } from "../db/attemptRepo";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { createIntensiveRepo } from "../db/intensiveRepo";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";

describe("intensive study persistence", () => {
  let db: DatabaseHandle;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  function seedListeningPassage() {
    const questions = createQuestionRepo(db);
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/listening-intensive.json",
      checksum: "listening-intensive",
      importStatus: "imported",
      version: 1
    });
    return questions.createPassage({
      sourceId: source.id,
      subject: "listening",
      part: "P1",
      title: "Listening Intensive",
      frequencyClass: "high"
    });
  }

  it("creates, updates, and lists listening cues for sentence repeat", () => {
    const passage = seedListeningPassage();
    const repo = createIntensiveRepo(db);

    const cue = repo.createListeningCue({
      passageId: passage.id,
      startSeconds: 12.5,
      endSeconds: 16.2,
      label: "Sentence 1",
      transcript: "The booking is under Green Park."
    });
    repo.updateListeningCue({
      id: cue.id,
      startSeconds: 13,
      endSeconds: 17,
      label: "Corrected sentence",
      transcript: "The booking is under Green Park."
    });

    expect(repo.listListeningCues(passage.id)).toEqual([
      expect.objectContaining({
        id: cue.id,
        startSeconds: 13,
        endSeconds: 17,
        label: "Corrected sentence",
        transcript: "The booking is under Green Park."
      })
    ]);
  });

  it("stores dictation attempts and compares against transcript when available", () => {
    const passage = seedListeningPassage();
    const repo = createIntensiveRepo(db);
    const cue = repo.createListeningCue({
      passageId: passage.id,
      startSeconds: 0,
      endSeconds: 4,
      label: "Sentence 1",
      transcript: "Green Park"
    });

    const correct = repo.saveDictationAttempt({
      cueId: cue.id,
      userText: " green   park "
    });
    const incorrect = repo.saveDictationAttempt({
      cueId: cue.id,
      userText: "blue park"
    });

    expect(correct).toMatchObject({ normalizedText: "green park", isCorrect: true });
    expect(incorrect).toMatchObject({ normalizedText: "blue park", isCorrect: false });
    expect(repo.listDictationAttempts(cue.id)).toHaveLength(2);
  });

  it("saves mistake labels for wrong answers", () => {
    const questions = createQuestionRepo(db);
    const attempts = createAttemptRepo(db);
    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/reading-intensive.json",
      checksum: "reading-intensive",
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P2",
      title: "Reading Intensive",
      frequencyClass: "medium"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "matching",
      prompt: "Match the heading",
      answerRules: {}
    });
    const attempt = attempts.createAttempt({
      mode: "intensive",
      subject: "reading",
      startedAt: "2026-05-31T12:00:00.000Z"
    });
    const answer = attempts.saveAnswer({
      attemptId: attempt.id,
      questionId: question.id,
      rawAnswer: "wrong",
      normalizedAnswer: "wrong",
      isCorrect: false,
      timeSpentSeconds: 30,
      markedForReview: false
    });

    attempts.addMistakeLabel({ attemptAnswerId: answer.id, label: "定位失败" });

    expect(attempts.listMistakeLabels(answer.id)).toEqual(["定位失败"]);
  });
});
