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
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^\(([^()]+)\)$/g, "$1")
    .replace(/^[.,;:：!?]+|[.,;:：!?]+$/g, "")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export interface WordLimitOptions {
  allowNumber?: boolean;
}

export interface AnswerCorrectOptions extends WordLimitOptions {
  maxWords?: number;
  unorderedChoices?: boolean;
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

function choiceTokens(answer: string): string[] {
  return normalizeAnswer(answer)
    .replace(/[;,/|&+]+/g, " ")
    .split(/\s+/)
    .filter((token) => token !== "and")
    .flatMap((token) => (/^[a-z]+$/.test(token) && token.length > 1 ? token.split("") : [token]))
    .filter(Boolean)
    .sort();
}

function unorderedChoiceMatch(rawAnswer: string, acceptedAnswer: string): boolean {
  const rawTokens = choiceTokens(rawAnswer);
  const acceptedTokens = choiceTokens(acceptedAnswer);
  if (rawTokens.length === 0 || rawTokens.length !== acceptedTokens.length) {
    return false;
  }

  return rawTokens.every((token, index) => token === acceptedTokens[index]);
}

function slashAliasParts(token: string): string[] | null {
  if (!token.includes("/")) {
    return null;
  }

  const parts = token
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2 || !parts.every((part) => /^[a-z][a-z'-]*$/.test(part))) {
    return null;
  }

  return parts;
}

function isAlphabeticPhrase(phrase: string): boolean {
  return phrase
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => /^[a-z][a-z'-]*$/.test(token));
}

function phraseSlashAliasParts(variant: string): string[] | null {
  if (!variant.includes("/") || !/\s\/\s|\s\/|\/\s/.test(variant)) {
    return null;
  }

  const parts = variant
    .split(/\s*\/\s*/)
    .map((part) => normalizeAnswer(part))
    .filter(Boolean);

  if (parts.length < 2 || !parts.every(isAlphabeticPhrase)) {
    return null;
  }

  return parts;
}

function expandSlashAliases(variant: string): string[] {
  const phraseAliases = phraseSlashAliasParts(variant);
  if (phraseAliases) {
    return phraseAliases;
  }

  const tokens = variant.split(/\s+/).filter(Boolean);
  let variants: string[][] = [[]];
  let hasSlashAlias = false;

  for (const token of tokens) {
    const alternatives = slashAliasParts(token);
    if (alternatives) {
      hasSlashAlias = true;
    }

    variants = variants.flatMap((prefix) => (alternatives ?? [token]).map((alternative) => [...prefix, alternative]));
  }

  if (!hasSlashAlias) {
    return [variant];
  }

  return variants.map((parts) => normalizeAnswer(parts.join(" ")));
}

function stripImportedAnswerNumberingPrefix(acceptedAnswer: string): string {
  return acceptedAnswer.replace(/^(?:q\s*)?\d{1,2}[.):]\s+/i, "");
}

function stripImportedAnswerLabelPrefix(acceptedAnswer: string): string {
  return acceptedAnswer.replace(/^(?:answer|ans|答案)\s*(?:[:：.]|-)\s*/i, "");
}

function acceptedAnswerVariants(acceptedAnswer: string): string[] {
  const optionalPattern = /\(([^()]+)\)/;
  const normalizedAcceptedAnswer = normalizeAnswer(acceptedAnswer);
  const variants = [
    normalizedAcceptedAnswer,
    stripImportedAnswerNumberingPrefix(normalizedAcceptedAnswer),
    stripImportedAnswerLabelPrefix(normalizedAcceptedAnswer)
  ];

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const match = variant.match(optionalPattern);
    if (!match) {
      continue;
    }

    variants.push(normalizeAnswer(variant.replace(optionalPattern, " ")));
    variants.push(normalizeAnswer(variant.replace(optionalPattern, match[1])));
  }

  return Array.from(
    new Set(variants.filter((variant) => !optionalPattern.test(variant)).flatMap(expandSlashAliases))
  );
}

export function isAnswerCorrect(
  rawAnswer: string,
  acceptedAnswers: string[],
  options: AnswerCorrectOptions = {}
): boolean {
  if (!wordCountWithinLimit(rawAnswer, options.maxWords, { allowNumber: options.allowNumber })) {
    return false;
  }

  const normalizedAnswer = normalizeAnswer(rawAnswer);
  if (options.unorderedChoices) {
    return acceptedAnswers.some((acceptedAnswer) => unorderedChoiceMatch(rawAnswer, acceptedAnswer));
  }

  return acceptedAnswers.some((acceptedAnswer) =>
    acceptedAnswerVariants(acceptedAnswer).some((variant) => variant === normalizedAnswer)
  );
}
