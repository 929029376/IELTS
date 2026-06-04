import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRuntimeServerOptions } from "../config/runtimeServerOptions";

describe("runtime server options", () => {
  it("uses persistent local database and default Mac Baidu sync folder for the real server", () => {
    const options = createRuntimeServerOptions(
      {
        HOME: "/Users/musheng",
        IELTS_DEVICE_NAME: undefined,
        IELTS_DB_PATH: undefined,
        IELTS_SYNC_FOLDER_PATH: undefined
      },
      "darwin"
    );

    expect(options.databasePath).toBe("/Users/musheng/Library/Application Support/IELTS Local Practice/ielts.db");
    expect(options.sync).toMatchObject({
      deviceId: "local-darwin-device",
      deviceName: "Mac local device",
      platform: "darwin",
      syncFolderPath: "/Users/musheng/Desktop/同步空间/IELTS-Sync"
    });
  });

  it("uses explicit database and sync paths when they are configured", () => {
    const options = createRuntimeServerOptions(
      {
        HOME: "/Users/musheng",
        IELTS_DB_PATH: "/Users/musheng/Desktop/IELTS/data/ielts.db",
        IELTS_DEVICE_NAME: "MacBook IELTS",
        IELTS_SYNC_FOLDER_PATH: "/Users/musheng/Desktop/同步空间"
      },
      "darwin"
    );

    expect(options.databasePath).toBe("/Users/musheng/Desktop/IELTS/data/ielts.db");
    expect(options.sync).toMatchObject({
      deviceName: "MacBook IELTS",
      syncFolderPath: "/Users/musheng/Desktop/同步空间"
    });
  });

  it("uses a saved sync folder path from the local runtime config file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-runtime-options-"));
    const syncConfigPath = join(tempDir, "sync-config.json");
    writeFileSync(syncConfigPath, JSON.stringify({ syncFolderPath: "/Users/musheng/Desktop/同步空间/IELTS-Saved" }));

    try {
      const options = createRuntimeServerOptions(
        {
          HOME: "/Users/musheng",
          IELTS_SYNC_CONFIG_PATH: syncConfigPath
        },
        "darwin"
      );

      expect(options.sync?.syncFolderPath).toBe("/Users/musheng/Desktop/同步空间/IELTS-Saved");
      expect(options.syncConfigPath).toBe(syncConfigPath);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
