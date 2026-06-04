import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionBankImportPanel } from "../features/import/QuestionBankImportPanel";

describe("QuestionBankImportPanel", () => {
  afterEach(() => {
    cleanup();
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

  it("imports a single listening ZIP and a single reading PDF from local paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ importedCount: 1 })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<QuestionBankImportPanel />);

    fireEvent.change(screen.getByLabelText("Listening ZIP path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/listening/P1/高频/1. P1 Enquiry.zip" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import listening ZIP" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/import/listening-zip",
        expect.objectContaining({
          body: JSON.stringify({ zipPath: "/Users/musheng/Desktop/IELTS/listening/P1/高频/1. P1 Enquiry.zip" }),
          method: "POST"
        })
      );
    });

    fireEvent.change(screen.getByLabelText("Reading PDF path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/18. P1 - Tea.pdf" }
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Import reading PDF" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Import reading PDF" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/import/reading-pdf",
        expect.objectContaining({
          body: JSON.stringify({ pdfPath: "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/18. P1 - Tea.pdf" }),
          method: "POST"
        })
      );
    });
  });

  it("fills file import paths from packaged file picker selections", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ importedCount: 1 })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<QuestionBankImportPanel />);

    const listeningZip = new File(["zip"], "1. P1 Enquiry.zip", { type: "application/zip" });
    Object.defineProperty(listeningZip, "path", {
      value: "/Users/musheng/Desktop/IELTS/listening/P1/高频/1. P1 Enquiry.zip"
    });
    fireEvent.change(screen.getByLabelText("Choose listening ZIP file"), {
      target: { files: [listeningZip] }
    });
    expect(screen.getByLabelText("Listening ZIP path")).toHaveValue(
      "/Users/musheng/Desktop/IELTS/listening/P1/高频/1. P1 Enquiry.zip"
    );

    const readingPdf = new File(["pdf"], "18. P1 - Tea.pdf", { type: "application/pdf" });
    Object.defineProperty(readingPdf, "path", {
      value: "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/18. P1 - Tea.pdf"
    });
    fireEvent.change(screen.getByLabelText("Choose reading PDF file"), {
      target: { files: [readingPdf] }
    });
    expect(screen.getByLabelText("Reading PDF path")).toHaveValue(
      "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/18. P1 - Tea.pdf"
    );

    const frequencyFile = new File(["title,frequency"], "reading-frequency.csv", { type: "text/csv" });
    Object.defineProperty(frequencyFile, "path", {
      value: "/Users/musheng/Desktop/IELTS/reading/frequency/reading-frequency.csv"
    });
    fireEvent.change(screen.getByLabelText("Choose frequency CSV or XLSX file"), {
      target: { files: [frequencyFile] }
    });
    expect(screen.getByLabelText("Frequency CSV/XLSX path")).toHaveValue(
      "/Users/musheng/Desktop/IELTS/reading/frequency/reading-frequency.csv"
    );
  });
});
