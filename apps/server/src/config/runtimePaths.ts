export interface RuntimePathOptions {
  appDataDir?: string;
  homeDir?: string;
  platform: NodeJS.Platform | string;
  selectedSyncPath?: string;
}

export function normalizeUserSelectedPath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/");
}

function appendPath(basePath: string, ...segments: string[]): string {
  const normalizedBase = normalizeUserSelectedPath(basePath).replace(/\/+$/g, "");
  const normalizedSegments = segments.map((segment) => normalizeUserSelectedPath(segment).replace(/^\/+|\/+$/g, ""));
  return [normalizedBase, ...normalizedSegments].filter(Boolean).join("/");
}

export function getDefaultDataDir(options: RuntimePathOptions): string {
  if (options.platform === "win32") {
    const appDataDir = normalizeUserSelectedPath(options.appDataDir ?? "%APPDATA%");
    return appendPath(appDataDir, "IELTS Local Practice");
  }

  const homeDir = options.homeDir ?? process.env.HOME ?? ".";
  return appendPath(homeDir, "Library/Application Support/IELTS Local Practice");
}

export function getDefaultDatabasePath(options: RuntimePathOptions): string {
  return appendPath(getDefaultDataDir(options), "ielts.db");
}

export function getDefaultSyncFolderPath(options: RuntimePathOptions): string {
  if (options.platform === "win32") {
    return normalizeUserSelectedPath(options.selectedSyncPath ?? "%USERPROFILE%/BaiduNetdiskWorkspace/IELTS-Sync");
  }

  const homeDir = options.homeDir ?? process.env.HOME ?? ".";
  return appendPath(homeDir, "Desktop/同步空间/IELTS-Sync");
}
