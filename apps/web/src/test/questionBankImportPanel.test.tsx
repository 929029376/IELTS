import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionBankImportPanel } from "../features/import/QuestionBankImportPanel";

describe("QuestionBankImportPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits local import paths and corrected frequency rows to the import API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ importedCount: 1 })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<QuestionBankImportPanel />);

    fireEvent.change(screen.getByLabelText("Listening directory path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/listening" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import listening directory" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/import/listening-directory",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ rootDir: "/Users/musheng/Desktop/IELTS/listening" })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Import reading directory" })).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Reading PDF directory path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import reading directory" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/import/reading-directory",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ rootDir: "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF" })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Import corrected frequency rows" })).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Frequency source month"), {
      target: { value: "2026-06" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import corrected frequency rows" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/import/frequency-rows",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"sourceMonth\":\"2026-06\"")
        })
      );
    });
    expect(await screen.findByText("Imported 1 item into the local question bank.")).toBeInTheDocument();
  });
});
