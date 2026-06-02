import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DesktopRuntimeDiagnostics } from "../features/desktop/DesktopRuntimeDiagnostics";

describe("desktop runtime diagnostics", () => {
  it("renders packaged runtime paths and capability checks", () => {
    render(
      <DesktopRuntimeDiagnostics
        status={{
          appDataDir: "/Users/musheng/Library/Application Support/local.ielts.practice",
          audioMode: "html-audio",
          databasePath: "/Users/musheng/Library/Application Support/local.ielts.practice/ielts.db",
          filePickerMode: "web-file-input",
          isDesktop: true,
          pdfMode: "webview-pdf",
          platform: "macos",
          syncPath: "/Users/musheng/Desktop/同步空间/IELTS-Sync"
        }}
      />
    );

    expect(screen.getByRole("region", { name: "Desktop runtime diagnostics" })).toHaveTextContent(
      "Packaged desktop runtime"
    );
    expect(screen.getByText("macos")).toBeInTheDocument();
    expect(screen.getByText("/Users/musheng/Library/Application Support/local.ielts.practice/ielts.db")).toBeInTheDocument();
    expect(screen.getByText("/Users/musheng/Desktop/同步空间/IELTS-Sync")).toBeInTheDocument();
    expect(screen.getByText("web-file-input")).toBeInTheDocument();
    expect(screen.getByText("html-audio")).toBeInTheDocument();
    expect(screen.getByText("webview-pdf")).toBeInTheDocument();
  });

  it("shows browser fallback when Tauri runtime is not available", () => {
    render(<DesktopRuntimeDiagnostics status={null} />);

    expect(screen.getByText("Browser/local web runtime")).toBeInTheDocument();
    expect(screen.getByText("Desktop diagnostics appear inside the packaged app.")).toBeInTheDocument();
  });
});
