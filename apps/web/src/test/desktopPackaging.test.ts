import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(__dirname, "../..");
const workspaceRoot = resolve(webRoot, "../..");

describe("desktop packaging configuration", () => {
  it("exposes Tauri packaging scripts from the web workspace", () => {
    const packageJson = JSON.parse(readFileSync(resolve(webRoot, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(packageJson.devDependencies["@tauri-apps/cli"]).toBeDefined();
    expect(packageJson.scripts["desktop:build:mac"]).toContain("--bundles dmg --ci");
    expect(packageJson.scripts["desktop:build:win"]).toContain("--bundles nsis");
  });

  it("configures Tauri to bundle Mac dmg and Windows nsis targets from the Vite dist", () => {
    const config = JSON.parse(readFileSync(resolve(webRoot, "src-tauri/tauri.conf.json"), "utf8")) as {
      build: { beforeBuildCommand: string; frontendDist: string };
      bundle: { icon: string[]; targets: string[] };
      identifier: string;
    };
    const cargoToml = readFileSync(resolve(webRoot, "src-tauri/Cargo.toml"), "utf8");

    expect(config.identifier).toBe("local.ielts.practice");
    expect(config.build.beforeBuildCommand).toBe("pnpm build");
    expect(config.build.frontendDist).toBe("../dist");
    expect(config.bundle.targets).toEqual(expect.arrayContaining(["dmg", "nsis"]));
    expect(config.bundle.icon).toEqual(
      expect.arrayContaining(["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"])
    );
    expect(cargoToml).toContain("tauri =");
  });

  it("keeps a root command for production build and desktop packaging checks", () => {
    const packageJson = JSON.parse(readFileSync(resolve(workspaceRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const desktopCheck = readFileSync(resolve(workspaceRoot, "scripts/desktop-check.mjs"), "utf8");

    expect(packageJson.scripts.build).toBe("pnpm -r --if-present build");
    expect(packageJson.scripts["desktop:check"]).toBe("node scripts/desktop-check.mjs");
    expect(desktopCheck).toContain("cargo");
    expect(desktopCheck).toContain(".cargo/bin/cargo");
    expect(desktopCheck).toContain("runtime_status_includes_packaged_modes");
  });

  it("includes the Tauri icon required by generate_context", () => {
    expect(existsSync(resolve(webRoot, "src-tauri/icons/32x32.png"))).toBe(true);
    expect(existsSync(resolve(webRoot, "src-tauri/icons/128x128.png"))).toBe(true);
    expect(existsSync(resolve(webRoot, "src-tauri/icons/128x128@2x.png"))).toBe(true);
    expect(existsSync(resolve(webRoot, "src-tauri/icons/icon.icns"))).toBe(true);
    expect(existsSync(resolve(webRoot, "src-tauri/icons/icon.ico"))).toBe(true);
    expect(existsSync(resolve(webRoot, "src-tauri/icons/icon.png"))).toBe(true);
  });

  it("keeps a GitHub Actions workflow for Windows NSIS packaging evidence", () => {
    const workflowPath = resolve(workspaceRoot, ".github/workflows/windows-desktop-package.yml");

    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("runs-on: windows-2022");
    expect(workflow).toContain("pnpm/action-setup");
    expect(workflow).toContain("dtolnay/rust-toolchain@stable");
    expect(workflow).toContain("npx pnpm@9.15.4 test");
    expect(workflow).toContain("npx pnpm@9.15.4 build");
    expect(workflow).toContain("Verify Windows local web mode");
    expect(workflow).toContain("Start-Job");
    expect(workflow).toContain("http://127.0.0.1:5174/health");
    expect(workflow).toContain("http://127.0.0.1:5173/");
    expect(workflow).toContain("npx pnpm@9.15.4 desktop:check");
    expect(workflow).toContain("npx pnpm@9.15.4 desktop:build:win");
    expect(workflow).toContain("apps/web/src-tauri/target/release/bundle/nsis/*.exe");
  });

  it("ships a Windows packaged runtime verification kit with the installer workflow", () => {
    const workflowPath = resolve(workspaceRoot, ".github/workflows/windows-desktop-package.yml");
    const scriptPath = resolve(workspaceRoot, "scripts/windows-packaged-runtime-check.ps1");

    expect(existsSync(scriptPath)).toBe(true);

    const workflow = readFileSync(workflowPath, "utf8");
    const script = readFileSync(scriptPath, "utf8");

    expect(workflow).toContain("Create Windows verification kit");
    expect(workflow).toContain("windows-package-manifest.json");
    expect(workflow).toContain("manualReportName");
    expect(workflow).toContain("windows-packaged-runtime-report.json");
    expect(workflow).toContain("ielts-local-practice-windows-verification-kit");
    expect(workflow).toContain("scripts/windows-packaged-runtime-check.ps1");
    expect(workflow).toContain("Verify Windows packaged runtime install");
    expect(workflow).toContain("-ReportPath");
    expect(workflow).toContain("Validate Windows runtime report");
    expect(workflow).toContain("ConvertFrom-Json");
    expect(workflow).toContain("manualChecklist");
    expect(workflow).toContain("processStayedRunning");
    expect(workflow).toContain("expectedDatabase");
    expect(workflow).toContain("hashVerified");
    expect(workflow).toContain("Upload Windows runtime report");
    expect(workflow).toContain("ielts-local-practice-windows-runtime-report");
    expect(workflow).toContain("/S");
    expect(workflow).toContain("-RequireInstalledApp");
    expect(workflow).toContain("-RequireAppDataDir");
    expect(workflow).toContain("Start-Sleep -Seconds 10");
    expect(workflow).not.toContain("-SkipLaunch");

    const uploadIndex = workflow.indexOf("Upload Windows installer");
    const installVerificationIndex = workflow.indexOf("Verify Windows packaged runtime install");
    const reportValidationIndex = workflow.indexOf("Validate Windows runtime report");
    const reportUploadIndex = workflow.indexOf("Upload Windows runtime report");
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(installVerificationIndex).toBeGreaterThan(-1);
    expect(reportValidationIndex).toBeGreaterThan(-1);
    expect(reportUploadIndex).toBeGreaterThan(-1);
    expect(uploadIndex).toBeLessThan(installVerificationIndex);
    expect(installVerificationIndex).toBeLessThan(reportValidationIndex);
    expect(reportValidationIndex).toBeLessThan(reportUploadIndex);

    expect(script).toContain("Desktop runtime diagnostics");
    expect(script).toContain("SQLite path");
    expect(script).toContain("Baidu Cloud sync folder");
    expect(script).toContain("file picker");
    expect(script).toContain("audio playback");
    expect(script).toContain("PDF viewing");
    expect(script).toContain("Get-FileHash");
    expect(script).toContain("InstallerPath");
    expect(script).toContain("ReportPath");
    expect(script).toContain("BaiduSyncPath");
    expect(script).toContain("ListeningZipPath");
    expect(script).toContain("AudioPath");
    expect(script).toContain("ReadingPdfPath");
    expect(script).toContain("RequireBaiduSyncPath");
    expect(script).toContain("manualChecklist");
    expect(script).toContain("windows-packaged-runtime-report.json");
    expect(script).toContain("ConvertTo-Json -Depth 6");
    expect(script).toContain("IELTS Local Practice.exe");
    expect(script).toContain("ielts-local-practice.exe");
    expect(script).toContain("Where-Object");
    expect(script).toContain("Start-Process");
    expect(script).toContain("Get-Process");
    expect(script).toContain("Stop-Process");
    expect(script).toContain("Get-AppDataDirectory");
    expect(script).toContain("$appDataCandidates");
    expect(script).toContain("RequireAppDataDir");
    expect(script).toContain("local.ielts.practice");
    expect(script).toContain("RequireInstalledApp");
  });

  it("documents the Windows hands-on packaged runtime verification workflow", () => {
    const guidePath = resolve(workspaceRoot, "docs/superpowers/windows-packaged-runtime-verification.md");

    expect(existsSync(guidePath)).toBe(true);

    const guide = readFileSync(guidePath, "utf8");

    expect(guide).toContain("ielts-local-practice-windows-nsis");
    expect(guide).toContain("ielts-local-practice-windows-verification-kit");
    expect(guide).toContain("ielts-local-practice-windows-runtime-report");
    expect(guide).toContain("windows-packaged-runtime-check.ps1");
    expect(guide).toContain("-BaiduSyncPath");
    expect(guide).toContain("-ListeningZipPath");
    expect(guide).toContain("-AudioPath");
    expect(guide).toContain("-ReadingPdfPath");
    expect(guide).toContain("-RequireBaiduSyncPath");
    expect(guide).toContain("Desktop runtime diagnostics");
    expect(guide).toContain("SQLite path");
    expect(guide).toContain("file picker");
    expect(guide).toContain("audio playback");
    expect(guide).toContain("PDF viewing");
    expect(guide).toContain("manualChecklist");
    expect(guide).toContain("status = \"passed\"");
    expect(guide).toContain("Phase 9");
  });

  it("validates completed Windows runtime reports before Phase 9 is closed", () => {
    const validatorPath = resolve(workspaceRoot, "scripts/validate-windows-runtime-report.mjs");

    expect(existsSync(validatorPath)).toBe(true);

    const tempDir = mkdtempSync(resolve(tmpdir(), "ielts-runtime-report-"));
    const passingReportPath = resolve(tempDir, "passing-report.json");
    const failingReportPath = resolve(tempDir, "failing-report.json");
    const baseReport = {
      installer: { hashVerified: true },
      installedApp: { found: true, processStayedRunning: true },
      appData: {
        detectedPath: "C:\\Users\\tester\\AppData\\Roaming\\local.ielts.practice",
        expectedDatabase: "C:\\Users\\tester\\AppData\\Roaming\\local.ielts.practice\\ielts.db"
      },
      baiduSync: { provided: true, exists: true, status: "exists" },
      assetChecks: [
        { label: "Listening ZIP", provided: true, exists: true, status: "exists" },
        { label: "Listening audio", provided: true, exists: true, status: "exists" },
        { label: "Reading PDF", provided: true, exists: true, status: "exists" }
      ],
      manualChecklist: [
        { id: "runtime-platform", status: "passed" },
        { id: "runtime-sqlite-path", status: "passed" },
        { id: "runtime-sync-path", status: "passed" },
        { id: "listening-zip-picker", status: "passed" },
        { id: "listening-audio-playback", status: "passed" },
        { id: "reading-pdf-preview", status: "passed" }
      ]
    };

    writeFileSync(passingReportPath, JSON.stringify(baseReport), "utf8");
    writeFileSync(
      failingReportPath,
      JSON.stringify({
        ...baseReport,
        manualChecklist: [{ id: "runtime-platform", status: "manual" }]
      }),
      "utf8"
    );

    expect(execFileSync("node", [validatorPath, passingReportPath], { encoding: "utf8" })).toContain("Windows runtime report is complete");
    expect(() => execFileSync("node", [validatorPath, failingReportPath], { encoding: "utf8", stdio: "pipe" })).toThrow(
      /manualChecklist/
    );
  });
});
