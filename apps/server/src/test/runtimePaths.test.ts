import { describe, expect, it } from "vitest";
import {
  getDefaultDataDir,
  getDefaultDatabasePath,
  getDefaultSyncFolderPath,
  normalizeUserSelectedPath
} from "../config/runtimePaths";

describe("cross-platform runtime paths", () => {
  it("resolves Mac local data and Baidu sync paths", () => {
    expect(getDefaultDataDir({ homeDir: "/Users/musheng", platform: "darwin" })).toBe(
      "/Users/musheng/Library/Application Support/IELTS Local Practice"
    );
    expect(getDefaultDatabasePath({ homeDir: "/Users/musheng", platform: "darwin" })).toBe(
      "/Users/musheng/Library/Application Support/IELTS Local Practice/ielts.db"
    );
    expect(getDefaultSyncFolderPath({ homeDir: "/Users/musheng", platform: "darwin" })).toBe(
      "/Users/musheng/Desktop/同步空间/IELTS-Sync"
    );
  });

  it("resolves Windows local data and selected Baidu sync paths", () => {
    expect(getDefaultDataDir({ appDataDir: "C:/Users/musheng/AppData/Roaming", platform: "win32" })).toBe(
      "C:/Users/musheng/AppData/Roaming/IELTS Local Practice"
    );
    expect(
      getDefaultSyncFolderPath({
        platform: "win32",
        selectedSyncPath: "D:\\BaiduNetdiskWorkspace\\IELTS-Sync"
      })
    ).toBe("D:/BaiduNetdiskWorkspace/IELTS-Sync");
  });

  it("normalizes file picker paths without changing drive letters", () => {
    expect(normalizeUserSelectedPath("D:\\IELTS\\audio.mp3")).toBe("D:/IELTS/audio.mp3");
  });
});
