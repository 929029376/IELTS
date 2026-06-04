import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncSettingsPreview } from "../features/sync/SyncSettingsPreview";

describe("SyncSettingsPreview", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs a manual sync import and shows the imported, skipped, and conflict counts", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-04T10:15:00.000Z"));
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
    expect(screen.getByText("2026-06-04 10:15")).toBeInTheDocument();
    expect(screen.queryByText("Not synced yet")).not.toBeInTheDocument();
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

  it("fills the backup import path from a packaged JSON file picker selection", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SyncSettingsPreview
        deviceName="MacBook"
        lastSyncAt={null}
        syncFiles={["attempts.jsonl", "answers.jsonl"]}
        syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
      />
    );

    const backupFile = new File(["{}"], "ielts-backup-2026-06-04.json", { type: "application/json" });
    Object.defineProperty(backupFile, "path", {
      value: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json"
    });

    fireEvent.change(screen.getByLabelText("Choose backup JSON file"), {
      target: { files: [backupFile] }
    });

    expect(screen.getByLabelText("Backup file path")).toHaveValue(
      "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves an edited Baidu sync folder path", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/sync/config") {
        return {
          ok: true,
          json: async () => ({
            deviceId: "macbook",
            deviceName: "MacBook",
            platform: "darwin",
            syncFolderPath: "/Users/musheng/Desktop/同步空间"
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

    fireEvent.change(screen.getByLabelText("Sync folder path"), {
      target: { value: "/Users/musheng/Desktop/同步空间" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save sync folder" }));

    expect(await screen.findByText("Sync folder saved")).toBeInTheDocument();
    expect(screen.getByText("/Users/musheng/Desktop/同步空间")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sync/config",
      expect.objectContaining({
        body: JSON.stringify({ syncFolderPath: "/Users/musheng/Desktop/同步空间" }),
        method: "PUT"
      })
    );
  });

  it("fills the sync folder path from a selected JSONL sync file", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SyncSettingsPreview
        deviceName="MacBook"
        lastSyncAt={null}
        syncFiles={["attempts.jsonl", "answers.jsonl"]}
        syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
      />
    );

    const syncFile = new File(["{}"], "attempts.jsonl", { type: "application/jsonl" });
    Object.defineProperty(syncFile, "path", {
      value: "/Users/musheng/Desktop/同步空间/IELTS-Sync/attempts.jsonl"
    });

    fireEvent.change(screen.getByLabelText("Choose sync JSONL or devices file"), {
      target: { files: [syncFile] }
    });

    expect(screen.getByLabelText("Sync folder path")).toHaveValue("/Users/musheng/Desktop/同步空间/IELTS-Sync");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
