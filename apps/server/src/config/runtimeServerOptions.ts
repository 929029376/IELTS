import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BuildServerOptions } from "../server";
import {
  getDefaultDataDir,
  getDefaultDatabasePath,
  getDefaultSyncFolderPath,
  normalizeUserSelectedPath
} from "./runtimePaths";

function readSavedSyncFolderPath(syncConfigPath: string): string | null {
  if (!existsSync(syncConfigPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(syncConfigPath, "utf8")) as { syncFolderPath?: unknown };
    return typeof parsed.syncFolderPath === "string" && parsed.syncFolderPath.trim()
      ? normalizeUserSelectedPath(parsed.syncFolderPath)
      : null;
  } catch {
    return null;
  }
}

export function createRuntimeServerOptions(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform | string = process.platform
): BuildServerOptions {
  const homeDir = env.HOME;
  const appDataDir = env.APPDATA;
  const selectedSyncPath = env.IELTS_SYNC_FOLDER_PATH;
  const syncConfigPath =
    env.IELTS_SYNC_CONFIG_PATH ??
    join(
      getDefaultDataDir({
        appDataDir,
        homeDir,
        platform
      }),
      "sync-config.json"
    );
  const savedSyncPath = selectedSyncPath ? null : readSavedSyncFolderPath(syncConfigPath);
  const deviceName =
    env.IELTS_DEVICE_NAME ?? (platform === "win32" ? "Windows local device" : "Mac local device");

  return {
    databasePath:
      env.IELTS_DB_PATH ??
      getDefaultDatabasePath({
        appDataDir,
        homeDir,
        platform
      }),
    sync: {
      deviceId: env.IELTS_DEVICE_ID ?? `local-${platform}-device`,
      deviceName,
      platform,
      syncFolderPath: selectedSyncPath
        ? normalizeUserSelectedPath(selectedSyncPath)
        : savedSyncPath ??
          getDefaultSyncFolderPath({
            appDataDir,
            homeDir,
            platform
          })
    },
    syncConfigPath
  };
}
