import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncSettingsPreview } from "../features/sync/SyncSettingsPreview";

describe("SyncSettingsPreview", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("runs a manual sync import and shows the imported, skipped, and conflict counts", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        conflicts: 1,
        imported: 3,
        skipped: 2
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SyncSettingsPreview
        deviceName="MacBook"
        lastSyncAt={null}
        syncFiles={["attempts.jsonl", "answers.jsonl"]}
        syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Manual sync" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Manual sync complete");
    expect(screen.getByText("3 imported")).toBeInTheDocument();
    expect(screen.getByText("2 skipped")).toBeInTheDocument();
    expect(screen.getByText("1 conflicts")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/sync/import", expect.objectContaining({ method: "POST" }));
  });

  it("exports and imports manual backups from the sync settings panel", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/backups/export") {
        return {
          ok: true,
          json: async () => ({
            filePath: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json",
            rowCounts: {
              attempt_answers: 40,
              attempts: 1,
              dictation_attempts: 2,
              listening_cues: 3
            }
          })
        };
      }
      if (path === "/api/backups/import") {
        return {
          ok: true,
          json: async () => ({
            importedTables: 16,
            rowCounts: {
              attempt_answers: 40,
              attempts: 1,
              dictation_attempts: 2,
              listening_cues: 3
            }
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SyncSettingsPreview
        deviceName="MacBook"
        lastSyncAt={null}
        syncFiles={["attempts.jsonl", "answers.jsonl"]}
        syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));

    expect(await screen.findByText("Backup exported")).toBeInTheDocument();
    expect(screen.getByText("/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json")).toBeInTheDocument();
    expect(screen.getByText("1 attempts")).toBeInTheDocument();
    expect(screen.getByText("40 answers")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Backup file path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import backup" }));

    expect(await screen.findByText("Backup imported")).toBeInTheDocument();
    expect(screen.getByText("16 tables")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/backups/export", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backups/import",
      expect.objectContaining({
        body: JSON.stringify({ filePath: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json" }),
        method: "POST"
      })
    );
  });
});
