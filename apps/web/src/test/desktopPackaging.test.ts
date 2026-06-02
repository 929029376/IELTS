import { existsSync, readFileSync } from "node:fs";
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

    expect(packageJson.scripts.build).toBe("pnpm -r --if-present build");
    expect(packageJson.scripts["desktop:check"]).toBe("node scripts/desktop-check.mjs");
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
    expect(workflow).toContain("runs-on: windows-latest");
    expect(workflow).toContain("pnpm/action-setup");
    expect(workflow).toContain("dtolnay/rust-toolchain@stable");
    expect(workflow).toContain("npx pnpm@9.15.4 test");
    expect(workflow).toContain("npx pnpm@9.15.4 build");
    expect(workflow).toContain("npx pnpm@9.15.4 desktop:check");
    expect(workflow).toContain("npx pnpm@9.15.4 desktop:build:win");
    expect(workflow).toContain("apps/web/src-tauri/target/release/bundle/nsis/*.exe");
  });
});
