import type { ReactNode } from "react";

export interface CloseReadingViewProps {
  passageText: string;
  answerSentence: string;
  keywords: string[];
  synonyms: string[];
  explanation: string;
  question: ReactNode;
  isWrongAnswer: boolean;
  canSelectAnswerSentence?: boolean;
  onSelectAnswerSentence: () => void;
  onMistakeLabel: (label: string) => void;
}

interface HighlightToken {
  className: string;
  end: number;
  start: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTargetPattern(target: string): RegExp | null {
  const parts = target.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return new RegExp(parts.map(escapeRegExp).join("\\s+"), "gi");
}

function buildHighlightTokens(text: string, highlights: Array<{ className: string; target: string }>) {
  const tokens: HighlightToken[] = [];

  for (const highlight of highlights) {
    const pattern = buildTargetPattern(highlight.target);

    if (!pattern) {
      continue;
    }

    let match = pattern.exec(text);

    while (match) {
      const start = match.index;
      const end = start + match[0].length;
      const overlapsExistingToken = tokens.some((token) => start < token.end && end > token.start);
      if (!overlapsExistingToken) {
        tokens.push({ className: highlight.className, end, start });
      }
      match = pattern.exec(text);
    }
  }

  return tokens.sort((a, b) => a.start - b.start);
}

function renderHighlightedText(text: string, highlights: Array<{ className: string; target: string }>) {
  const tokens = buildHighlightTokens(text, highlights);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  tokens.forEach((token, index) => {
    if (token.start > cursor) {
      nodes.push(text.slice(cursor, token.start));
    }

    nodes.push(
      <mark className={token.className} key={`${token.className}-${index}`}>
        {text.slice(token.start, token.end)}
      </mark>
    );
    cursor = token.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

export function CloseReadingView({
  passageText,
  answerSentence,
  keywords,
  synonyms,
  explanation,
  question,
  isWrongAnswer,
  canSelectAnswerSentence = true,
  onSelectAnswerSentence,
  onMistakeLabel
}: CloseReadingViewProps) {
  const keywordHighlights = keywords.map((target) => ({ className: "keyword-highlight", target }));
  const visibleSynonyms = synonyms.map((synonym) => synonym.trim()).filter(Boolean);

  return (
    <section className="close-reading-view" aria-label="Close reading view">
      <article className="close-reading-passage">
        <h3>Passage</h3>
        <p>
          {renderHighlightedText(passageText, [
            { className: "ielts-highlight", target: answerSentence },
            ...keywordHighlights
          ])}
        </p>
      </article>
      <aside className="close-reading-tools">
        <div>{question}</div>
        <button type="button" disabled={!canSelectAnswerSentence} onClick={onSelectAnswerSentence}>
          Use selected sentence as answer evidence
        </button>
        <section aria-label="Synonym notes">
          <h4>Synonym notes</h4>
          {visibleSynonyms.length > 0 ? (
            <ul>
              {visibleSynonyms.map((synonym) => (
                <li key={synonym}>{synonym}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No synonym notes recorded yet.</p>
          )}
        </section>
        <details open>
          <summary>Explanation</summary>
          <p>{explanation}</p>
        </details>
        {isWrongAnswer ? (
          <section aria-label="Mistake labels">
            <h4>Mistake labels</h4>
            {["定位失败", "同义替换", "时间不足", "选项干扰"].map((label) => (
              <button key={label} type="button" onClick={() => onMistakeLabel(label)}>
                {label}
              </button>
            ))}
          </section>
        ) : null}
      </aside>
    </section>
  );
}
