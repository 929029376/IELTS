import { afterEach, describe, expect, it, vi } from "vitest";

describe("runtime paths host independence", () => {
  afterEach(() => {
    vi.doUnmock("node:path");
    vi.resetModules();
  });

  it("does not let the runner operating system change target-platform path output", async () => {
    vi.doMock("node:path", () => ({
      join: (...parts: string[]) => parts.join("\\")
    }));

    const { getDefaultDatabasePath, getDefaultSyncFolderPath } = await import("../config/runtimePaths");

    expect(getDefaultDatabasePath({ homeDir: "/Users/musheng", platform: "darwin" })).toBe(
      "/Users/musheng/Library/Application Support/IELTS Local Practice/ielts.db"
    );
    expect(getDefaultSyncFolderPath({ homeDir: "/Users/musheng", platform: "darwin" })).toBe(
      "/Users/musheng/Desktop/同步空间/IELTS-Sync"
    );
  });
});
