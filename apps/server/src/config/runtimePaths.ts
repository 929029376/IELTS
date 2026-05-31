import { join } from "node:path";

export interface RuntimePathOptions {
  appDataDir?: string;
  homeDir?: string;
  platform: NodeJS.Platform | string;
  selectedSyncPath?: string;
}

export function normalizeUserSelectedPath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/");
}

export function getDefaultDataDir(options: RuntimePathOptions): string {
  if (options.platform === "win32") {
    const appDataDir = normalizeUserSelectedPath(options.appDataDir ?? "%APPDATA%");
    return `${appDataDir}/IELTS Local Practice`;
  }

  const homeDir = options.homeDir ?? process.env.HOME ?? ".";
  return join(homeDir, "Library/Application Support/IELTS Local Practice");
}

export function getDefaultDatabasePath(options: RuntimePathOptions): string {
  return join(getDefaultDataDir(options), "ielts.db");
}

export function getDefaultSyncFolderPath(options: RuntimePathOptions): string {
  if (options.platform === "win32") {
    return normalizeUserSelectedPath(options.selectedSyncPath ?? "%USERPROFILE%/BaiduNetdiskWorkspace/IELTS-Sync");
  }

  const homeDir = options.homeDir ?? process.env.HOME ?? ".";
  return join(homeDir, "Desktop/同步空间/IELTS-Sync");
}
