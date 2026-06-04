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

  it("trims last sync timestamps and falls back when the saved timestamp is blank", () => {
    const { rerender } = render(
      <SyncSettingsPreview
        deviceName="MacBook"
        lastSyncAt="  2026-06-04T10:15:00.000Z  "
        syncFiles={["attempts.jsonl", "answers.jsonl"]}
        syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
      />
    );

    expect(screen.getByText("2026-06-04 10:15")).toBeInTheDocument();

    rerender(
      <SyncSettingsPreview
        deviceName="MacBook"
        lastSyncAt="   "
        syncFiles={["attempts.jsonl", "answers.jsonl"]}
        syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
      />
    );

    expect(screen.getByText("Not synced yet")).toBeInTheDocument();
  });

  it("clears stale manual sync counts when a later sync fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conflicts: 1,
          imported: 3,
          skipped: 2
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
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

    fireEvent.click(screen.getByRole("button", { name: "Manual sync" }));

    expect(await screen.findByText("Manual sync complete")).toBeInTheDocument();
    expect(screen.getByText("3 imported")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manual sync" }));

    expect(await screen.findByText("Could not complete manual sync.")).toBeInTheDocument();
    expect(screen.queryByText("Manual sync complete")).not.toBeInTheDocument();
    expect(screen.queryByText("3 imported")).not.toBeInTheDocument();
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

  it("shows a fallback when an exported backup path is blank", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        filePath: "   ",
        rowCounts: {
          attempt_answers: 0,
          attempts: 0,
          dictation_attempts: 0,
          listening_cues: 0
        }
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

    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));

    expect(await screen.findByText("Backup exported")).toBeInTheDocument();
    expect(screen.getByText("Backup path unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Backup file path")).toHaveValue("");
  });

  it("clears stale backup export results when a later export fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filePath: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-old.json",
          rowCounts: {
            attempt_answers: 40,
            attempts: 1,
            dictation_attempts: 2,
            listening_cues: 3
          }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
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
    expect(screen.getByText("/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-old.json")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));

    expect(await screen.findByText("Could not export local backup.")).toBeInTheDocument();
    expect(screen.queryByText("Backup exported")).not.toBeInTheDocument();
    expect(screen.queryByText("/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-old.json")).not.toBeInTheDocument();
  });

  it("clears stale backup import results when a later import fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          importedTables: 16,
          rowCounts: {
            attempt_answers: 40,
            attempts: 1
          }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
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

    fireEvent.change(screen.getByLabelText("Backup file path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import backup" }));

    expect(await screen.findByText("Backup imported")).toBeInTheDocument();
    expect(screen.getByText("16 tables")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import backup" }));

    expect(await screen.findByText("Could not import local backup.")).toBeInTheDocument();
    expect(screen.queryByText("Backup imported")).not.toBeInTheDocument();
    expect(screen.queryByText("16 tables")).not.toBeInTheDocument();
  });

  it("clears stale backup import feedback when the restore path changes", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        importedTables: 16,
        rowCounts: {
          attempt_answers: 40,
          attempts: 1
        }
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

    fireEvent.change(screen.getByLabelText("Backup file path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-2026-06-04.json" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import backup" }));

    expect(await screen.findByText("Backup imported")).toBeInTheDocument();
    expect(screen.getByText("16 tables")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Backup file path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-next.json" }
    });

    expect(screen.queryByText("Backup imported")).not.toBeInTheDocument();
    expect(screen.queryByText("16 tables")).not.toBeInTheDocument();
  });

  it("clears stale backup import feedback when exporting a new backup", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path === "/api/backups/import") {
        return {
          ok: true,
          json: async () => ({
            importedTables: 16,
            rowCounts: {
              attempt_answers: 40,
              attempts: 1
            }
          })
        };
      }
      if (path === "/api/backups/export") {
        return {
          ok: true,
          json: async () => ({
            filePath: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-after-restore.json",
            rowCounts: {
              attempt_answers: 41,
              attempts: 2,
              dictation_attempts: 0,
              listening_cues: 0
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

    fireEvent.change(screen.getByLabelText("Backup file path"), {
      target: { value: "/Users/musheng/Desktop/IELTS/data/backups/ielts-backup-before-export.json" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import backup" }));

    expect(await screen.findByText("Backup imported")).toBeInTheDocument();
    expect(screen.getByText("16 tables")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export backup" }));

    expect(await screen.findByText("Backup exported")).toBeInTheDocument();
    expect(screen.queryByText("Backup imported")).not.toBeInTheDocument();
    expect(screen.queryByText("16 tables")).not.toBeInTheDocument();
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

  it("clears stale sync-folder saved feedback when a later save fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceId: "macbook",
          deviceName: "MacBook",
          platform: "darwin",
          syncFolderPath: "/Users/musheng/Desktop/同步空间"
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
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

    fireEvent.change(screen.getByLabelText("Sync folder path"), {
      target: { value: "/Users/musheng/Desktop/同步空间-失败" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save sync folder" }));

    expect(await screen.findByText("Could not save sync folder.")).toBeInTheDocument();
    expect(screen.queryByText("Sync folder saved")).not.toBeInTheDocument();
  });

  it("clears stale sync-folder saved feedback when the folder path is edited", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        deviceId: "macbook",
        deviceName: "MacBook",
        platform: "darwin",
        syncFolderPath: "/Users/musheng/Desktop/同步空间"
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

    fireEvent.change(screen.getByLabelText("Sync folder path"), {
      target: { value: "/Users/musheng/Desktop/同步空间" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save sync folder" }));

    expect(await screen.findByText("Sync folder saved")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sync folder path"), {
      target: { value: "/Users/musheng/Desktop/同步空间/IELTS-Sync-2" }
    });

    expect(screen.queryByText("Sync folder saved")).not.toBeInTheDocument();
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

  it("shows fallback names when selected sync and backup files expose no local path", () => {
    render(
      <SyncSettingsPreview
        deviceName="MacBook"
        lastSyncAt={null}
        syncFiles={["attempts.jsonl", "answers.jsonl"]}
        syncPath="/Users/musheng/Desktop/同步空间/IELTS-Sync"
      />
    );

    fireEvent.change(screen.getByLabelText("Choose sync JSONL or devices file"), {
      target: { files: [new File(["{}"], "   ", { type: "application/json" })] }
    });
    expect(
      screen.getByText(
        "Unknown sync file selected, but the local folder path was not exposed. Paste the full folder path before saving."
      )
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Choose backup JSON file"), {
      target: { files: [new File(["{}"], "   ", { type: "application/json" })] }
    });
    expect(
      screen.getByText("Unknown backup file selected, but the local path was not exposed. Paste the full path before importing.")
    ).toBeInTheDocument();
  });

  it("shows fallback labels for blank sync configuration metadata", () => {
    render(
      <SyncSettingsPreview
        deviceName="   "
        lastSyncAt={null}
        syncFiles={["attempts.jsonl", "   "]}
        syncPath="   "
      />
    );

    expect(screen.getByText("Sync folder not configured")).toBeInTheDocument();
    expect(screen.getByText("Unknown device")).toBeInTheDocument();
    expect(screen.getByText("Unknown sync file")).toBeInTheDocument();
    expect(screen.getByText("attempts.jsonl")).toBeInTheDocument();
  });
});
