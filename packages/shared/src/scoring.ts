export interface BandRange {
  min: number;
  max: number;
  band: number;
}

export const listeningBandTable: BandRange[] = [
  { min: 39, max: 40, band: 9 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8 },
  { min: 32, max: 34, band: 7.5 },
  { min: 30, max: 31, band: 7 },
  { min: 26, max: 29, band: 6.5 },
  { min: 23, max: 25, band: 6 },
  { min: 18, max: 22, band: 5.5 },
  { min: 16, max: 17, band: 5 },
  { min: 13, max: 15, band: 4.5 },
  { min: 10, max: 12, band: 4 }
];

export const academicReadingBandTable: BandRange[] = [
  { min: 39, max: 40, band: 9 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4 }
];

export function estimateBand(rawScore: number, table: BandRange[]): number {
  const match = table.find((range) => rawScore >= range.min && rawScore <= range.max);
  return match?.band ?? 0;
}

export function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, "\"")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export interface WordLimitOptions {
  allowNumber?: boolean;
}

function isNumberToken(token: string): boolean {
  return /^[+-]?\d[\d,.:/-]*(st|nd|rd|th)?$/i.test(token);
}

export function wordCountWithinLimit(answer: string, maxWords?: number, options: WordLimitOptions = {}): boolean {
  if (!maxWords) {
    return true;
  }

  const normalized = normalizeAnswer(answer);
  if (normalized.length === 0) {
    return true;
  }

  const words = normalized.split(/\s+/).filter((token) => !(options.allowNumber && isNumberToken(token)));
  return words.length <= maxWords;
}

export function isAnswerCorrect(
  rawAnswer: string,
  acceptedAnswers: string[],
  options: { allowNumber?: boolean; maxWords?: number } = {}
): boolean {
  if (!wordCountWithinLimit(rawAnswer, options.maxWords, { allowNumber: options.allowNumber })) {
    return false;
  }

  const normalizedAnswer = normalizeAnswer(rawAnswer);
  return acceptedAnswers.some((acceptedAnswer) => normalizeAnswer(acceptedAnswer) === normalizedAnswer);
}
