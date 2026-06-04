import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesktopAssetVerifier } from "../features/desktop/DesktopAssetVerifier";

describe("desktop asset verifier", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows selected local ZIP, audio, and PDF files for packaged interaction checks", () => {
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:audio-sample")
      .mockReturnValueOnce("blob:pdf-sample");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(<DesktopAssetVerifier />);

    fireEvent.change(screen.getByLabelText("Select listening ZIP"), {
      target: { files: [new File(["zip bytes"], "52. P4 Underwater Archaeological Sites.zip", { type: "application/zip" })] }
    });
    fireEvent.change(screen.getByLabelText("Select audio asset"), {
      target: { files: [new File(["audio bytes"], "audio.mp3", { type: "audio/mpeg" })] }
    });
    fireEvent.change(screen.getByLabelText("Select reading PDF"), {
      target: { files: [new File(["pdf bytes"], "18. P1 - The History of Tea.pdf", { type: "application/pdf" })] }
    });

    expect(screen.getByRole("region", { name: "Desktop asset interaction verifier" })).toBeInTheDocument();
    expect(screen.getByText("52. P4 Underwater Archaeological Sites.zip")).toBeInTheDocument();
    expect(screen.getByText("audio.mp3")).toBeInTheDocument();
    expect(screen.getByText("18. P1 - The History of Tea.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Selected audio preview")).toHaveAttribute("src", "blob:audio-sample");
    expect(screen.getByTitle("Selected PDF preview")).toHaveAttribute("data", "blob:pdf-sample");
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
  });

  it("shows fallback labels when selected desktop asset names are blank", () => {
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:blank-audio").mockReturnValueOnce("blob:blank-pdf");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(<DesktopAssetVerifier />);

    fireEvent.change(screen.getByLabelText("Select listening ZIP"), {
      target: { files: [new File(["zip bytes"], "", { type: "application/zip" })] }
    });
    fireEvent.change(screen.getByLabelText("Select audio asset"), {
      target: { files: [new File(["audio bytes"], "", { type: "audio/mpeg" })] }
    });
    fireEvent.change(screen.getByLabelText("Select reading PDF"), {
      target: { files: [new File(["pdf bytes"], "", { type: "application/pdf" })] }
    });

    expect(screen.getByText("Unknown ZIP file")).toBeInTheDocument();
    expect(screen.getByText("Unknown audio file")).toBeInTheDocument();
    expect(screen.getByText("Unknown PDF file")).toBeInTheDocument();
    expect(screen.getByLabelText("Selected audio preview")).toHaveAttribute("src", "blob:blank-audio");
    expect(screen.getByTitle("Selected PDF preview")).toHaveAttribute("data", "blob:blank-pdf");
  });
});
