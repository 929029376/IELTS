import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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

interface HighlightRange {
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

  return new RegExp(parts.map(escapeRegExp).join("\\s+"), "i");
}

function addHighlightRange(ranges: HighlightRange[], text: string, target: string, className: string) {
  const pattern = buildTargetPattern(target);

  if (!pattern) {
    return;
  }

  const match = pattern.exec(text);
  if (!match) {
    return;
  }

  const start = match.index;
  const end = start + match[0].length;
  if (ranges.some((range) => start < range.end && end > range.start)) {
    return;
  }

  ranges.push({ className, end, start });
}

function renderHighlightedText(text: string, answerHighlight?: string, userHighlights: string[] = []) {
  const ranges: HighlightRange[] = [];
  if (answerHighlight) {
    addHighlightRange(ranges, text, answerHighlight, "ielts-highlight");
  }
  userHighlights.forEach((highlight) => addHighlightRange(ranges, text, highlight, "user-highlight"));

  if (ranges.length === 0) {
    return text;
  }

  ranges.sort((left, right) => left.start - right.start);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor) {
      nodes.push(text.slice(cursor, range.start));
    }
    nodes.push(
      <mark className={range.className} key={`${range.className}-${range.start}-${range.end}`}>
        {text.slice(range.start, range.end)}
      </mark>
    );
    cursor = range.end;
  });
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function clampPanePercent(value: number): number {
  return Math.min(70, Math.max(35, Math.round(value)));
}

export function ReadingExamView({
  passageTitle,
  passageText,
  pdfPath,
  highlightedText,
  questions
}: ReadingExamViewProps) {
  const didDragDividerRef = useRef(false);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [fontScale, setFontScale] = useState<"small" | "regular" | "large">("regular");
  const [leftPanePercent, setLeftPanePercent] = useState(52);
  const [notesByPassage, setNotesByPassage] = useState<Record<string, string>>({});
  const [userHighlights, setUserHighlights] = useState<string[]>([]);
  const passageNoteKey = `${passageTitle}\n${passageText}`;
  const renderedText = useMemo(
    () => renderHighlightedText(passageText, highlightedText, userHighlights),
    [passageText, highlightedText, userHighlights]
  );

  useEffect(() => {
    setUserHighlights([]);
  }, [passageText, passageTitle]);

  function highlightSelection() {
    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText || !passageText.includes(selectedText)) {
      return;
    }

    setUserHighlights((current) => (current.includes(selectedText) ? current : [...current, selectedText]));
  }

  function updatePanePercentFromClientX(clientX: number) {
    const split = splitRef.current;
    if (!split) {
      return;
    }

    const rect = split.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    setLeftPanePercent(clampPanePercent(((clientX - rect.left) / rect.width) * 100));
  }

  function handleDividerMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
    const startX = event.clientX;
    didDragDividerRef.current = false;
    event.preventDefault();
    updatePanePercentFromClientX(event.clientX);

    function handleMouseMove(moveEvent: MouseEvent) {
      if (Math.abs(moveEvent.clientX - startX) > 2) {
        didDragDividerRef.current = true;
      }
      updatePanePercentFromClientX(moveEvent.clientX);
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleDividerClick() {
    if (didDragDividerRef.current) {
      didDragDividerRef.current = false;
      return;
    }

    setLeftPanePercent(leftPanePercent === 52 ? 58 : 52);
  }

  function handleDividerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setLeftPanePercent((current) => clampPanePercent(current - 5));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setLeftPanePercent((current) => clampPanePercent(current + 5));
    }
    if (event.key === "Home") {
      event.preventDefault();
      setLeftPanePercent(35);
    }
    if (event.key === "End") {
      event.preventDefault();
      setLeftPanePercent(70);
    }
  }

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
        <button type="button" onClick={highlightSelection}>
          Highlight selected text
        </button>
        <button type="button" onClick={() => setUserHighlights([])}>
          Clear highlights
        </button>
      </div>
      <div
        ref={splitRef}
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
          aria-orientation="vertical"
          aria-valuemax={70}
          aria-valuemin={35}
          aria-valuenow={leftPanePercent}
          className="reading-divider"
          role="separator"
          type="button"
          onClick={handleDividerClick}
          onKeyDown={handleDividerKeyDown}
          onMouseDown={handleDividerMouseDown}
        />
        <aside className="reading-questions" aria-label="Reading questions">
          {questions}
          <label className="notes-label">
            Notes
            <textarea
              aria-label="Notes"
              rows={6}
              value={notesByPassage[passageNoteKey] ?? ""}
              onChange={(event) => {
                const nextValue = event.target.value;
                setNotesByPassage((current) => ({ ...current, [passageNoteKey]: nextValue }));
              }}
            />
          </label>
        </aside>
      </div>
    </div>
  );
}
