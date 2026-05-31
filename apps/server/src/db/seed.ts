import { academicReadingBandTable, estimateBand } from "@ielts/shared";
import { openDatabase } from "./database";
import { migrate } from "./migrate";
import { createAttemptRepo } from "./attemptRepo";
import { createFrequencyRepo } from "./frequencyRepo";
import { createQuestionRepo } from "./questionRepo";

export function seed(databasePath?: string): void {
  const db = openDatabase(databasePath);

  try {
    migrate(db);
    const questions = createQuestionRepo(db);
    const frequencies = createFrequencyRepo(db);
    const attempts = createAttemptRepo(db);

    const listeningSource = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/phase-1-sample-listening.json",
      checksum: `seed-listening-${Date.now()}`,
      importStatus: "imported",
      version: 1
    });
    const listeningPassage = questions.createPassage({
      sourceId: listeningSource.id,
      subject: "listening",
      part: "P1",
      title: "Sample Booking Call",
      frequencyClass: "high"
    });
    questions.createListeningAudio({
      passageId: listeningPassage.id,
      filePath: "seed/audio/sample-booking-call.mp3",
      durationSeconds: 180,
      checksum: "seed-listening-audio"
    });
    const listeningQuestion = questions.createQuestion({
      passageId: listeningPassage.id,
      questionNumber: 1,
      questionType: "fill_blank",
      prompt: "Booking name: ____",
      answerRules: { maxWords: 2 }
    });
    questions.createAnswerKey({
      questionId: listeningQuestion.id,
      acceptedAnswers: ["Green Park"],
      answerSentence: "The booking is under Green Park.",
      explanation: "The caller gives the booking name directly.",
      synonyms: ["reservation name"]
    });

    const source = questions.createSource({
      sourceType: "seed",
      originalPath: "seed/phase-1-sample-reading.json",
      checksum: `seed-reading-${Date.now()}`,
      importStatus: "imported",
      version: 1
    });
    const passage = questions.createPassage({
      sourceId: source.id,
      subject: "reading",
      part: "P1",
      title: "The History of Tea",
      frequencyClass: "high"
    });
    const question = questions.createQuestion({
      passageId: passage.id,
      questionNumber: 1,
      questionType: "short_answer",
      prompt: "What drink is discussed in the passage?",
      answerRules: { maxWords: 2 }
    });
    questions.createAnswerKey({
      questionId: question.id,
      acceptedAnswers: ["tea"],
      answerSentence: "The passage discusses the history of tea.",
      explanation: "The title and opening sentence identify tea as the topic.",
      synonyms: ["drink", "beverage"]
    });
    frequencies.upsertFrequencyEntry({
      sourceMonth: "2026-05",
      subject: "reading",
      part: "P1",
      englishTitle: "The History of Tea",
      chineseTitle: "茶叶的历史",
      frequencyClass: "high",
      difficulty: 2.5
    });
    const attempt = attempts.createAttempt({
      mode: "practice",
      subject: "reading",
      startedAt: new Date().toISOString()
    });
    attempts.saveAnswer({
      attemptId: attempt.id,
      questionId: question.id,
      rawAnswer: "tea",
      normalizedAnswer: "tea",
      isCorrect: true,
      timeSpentSeconds: 12,
      markedForReview: false
    });
    attempts.submitAttempt({
      attemptId: attempt.id,
      submittedAt: new Date().toISOString(),
      rawScore: 1,
      estimatedBand: estimateBand(10, academicReadingBandTable)
    });
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed(process.env.IELTS_DB_PATH);
  console.log("Seed data inserted.");
}
