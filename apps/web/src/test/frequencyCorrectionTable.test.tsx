import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FrequencyCorrectionTable } from "../features/import/FrequencyCorrectionTable";

describe("FrequencyCorrectionTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("allows OCR frequency rows to be corrected before import", () => {
    const onRowsChange = vi.fn();
    const onImport = vi.fn();
    const rows = [
      {
        subject: "reading" as const,
        part: "P1" as const,
        englishTitle: "Hist0ry of Tea",
        chineseTitle: "茶叶的历史",
        frequencyClass: "unknown" as const,
        difficulty: "2.5",
        sourceMonth: "2026-05"
      }
    ];

    render(<FrequencyCorrectionTable rows={rows} onRowsChange={onRowsChange} onImport={onImport} />);

    fireEvent.change(screen.getByLabelText("English title row 1"), {
      target: { value: "History of Tea" }
    });
    fireEvent.change(screen.getByLabelText("Frequency row 1"), {
      target: { value: "high" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import corrected frequency rows" }));

    expect(onRowsChange).toHaveBeenCalledWith([
      expect.objectContaining({ englishTitle: "History of Tea" })
    ]);
    expect(onRowsChange).toHaveBeenCalledWith([
      expect.objectContaining({ frequencyClass: "high" })
    ]);
    expect(onImport).toHaveBeenCalledWith(rows);
  });

  it("adds another manual correction row for batch frequency updates", () => {
    const onRowsChange = vi.fn();
    const rows = [
      {
        subject: "reading" as const,
        part: "P1" as const,
        englishTitle: "History of Tea",
        chineseTitle: "茶叶的历史",
        frequencyClass: "high" as const,
        difficulty: "2.5",
        sourceMonth: "2026-06"
      }
    ];

    render(<FrequencyCorrectionTable rows={rows} onRowsChange={onRowsChange} onImport={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "Add frequency row" }));

    expect(onRowsChange).toHaveBeenCalledWith([
      rows[0],
      expect.objectContaining({
        difficulty: "",
        englishTitle: "",
        frequencyClass: "unknown",
        part: "P1",
        sourceMonth: "2026-06",
        subject: "reading"
      })
    ]);
  });
});
