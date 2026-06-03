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
});
