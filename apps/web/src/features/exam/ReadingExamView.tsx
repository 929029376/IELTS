import type { ReactNode } from "react";
import { useMemo, useState } from "react";

export interface ReadingExamViewProps {
  passageTitle: string;
  passageText: string;
  pdfPath?: string | null;
  highlightedText?: string;
  questions: ReactNode;
}

function localAssetUrl(path: string): string {
  return `/api/assets/local?path=${encodeURIComponent(path)}`;
}

function renderHighlightedText(text: string, highlightedText?: string) {
  if (!highlightedText) {
    return text;
  }

  const index = text.indexOf(highlightedText);
  if (index === -1) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className="ielts-highlight">{highlightedText}</mark>
      {text.slice(index + highlightedText.length)}
    </>
  );
}

export function ReadingExamView({
  passageTitle,
  passageText,
  pdfPath,
  highlightedText,
  questions
}: ReadingExamViewProps) {
  const [fontScale, setFontScale] = useState<"small" | "regular" | "large">("regular");
  const [leftPanePercent, setLeftPanePercent] = useState(52);
  const renderedText = useMemo(
    () => renderHighlightedText(passageText, highlightedText),
    [passageText, highlightedText]
  );

  return (
    <div className={`reading-exam-view font-${fontScale}`}>
      <div className="reading-toolbar" aria-label="Reading settings">
        <button type="button" onClick={() => setFontScale("small")}>
          Small font
        </button>
        <button type="button" onClick={() => setFontScale("regular")}>
          Regular font
        </button>
        <button type="button" onClick={() => setFontScale("large")}>
          Large font
        </button>
      </div>
      <div
        className="reading-split"
        style={{ gridTemplateColumns: `${leftPanePercent}% 8px minmax(0, 1fr)` }}
      >
        <article className="reading-passage" aria-label="Reading Passage">
          <h3>{passageTitle}</h3>
          {pdfPath ? (
            <div className="reading-pdf-asset" aria-label="Local reading PDF asset">
              <p>{pdfPath}</p>
              <object
                className="reading-pdf-object"
                data={localAssetUrl(pdfPath)}
                title="Local reading PDF"
                type="application/pdf"
              >
                Local reading PDF
              </object>
            </div>
          ) : null}
          <p>{renderedText}</p>
        </article>
        <button
          aria-label="Resize reading panes"
          className="reading-divider"
          role="separator"
          type="button"
          onClick={() => setLeftPanePercent(leftPanePercent === 52 ? 58 : 52)}
        />
        <aside className="reading-questions" aria-label="Reading questions">
          {questions}
          <label className="notes-label">
            Notes
            <textarea aria-label="Notes" rows={6} />
          </label>
        </aside>
      </div>
    </div>
  );
}
