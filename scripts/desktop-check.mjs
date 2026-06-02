import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const workspaceRoot = resolve(import.meta.dirname, "..");
const webRoot = resolve(workspaceRoot, "apps/web");
const tauriRoot = resolve(webRoot, "src-tauri");
const cargoBinary = process.env.CARGO ?? (process.env.HOME ? resolve(process.env.HOME, ".cargo/bin/cargo") : "cargo");
const requiredFiles = [
  "tauri.conf.json",
  "Cargo.toml",
  "build.rs",
  "src/lib.rs",
  "src/main.rs",
  "icons/32x32.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon.icns",
  "icons/icon.ico",
  "icons/icon.png"
];

for (const file of requiredFiles) {
  const path = resolve(tauriRoot, file);
  if (!existsSync(path)) {
    throw new Error(`Missing Tauri file: ${path}`);
  }
}

const config = JSON.parse(readFileSync(resolve(tauriRoot, "tauri.conf.json"), "utf8"));
const targets = new Set(config.bundle?.targets ?? []);
if (!targets.has("dmg") || !targets.has("nsis")) {
  throw new Error("Tauri bundle targets must include both dmg and nsis.");
}

if (config.build?.frontendDist !== "../dist") {
  throw new Error("Tauri frontendDist must point to ../dist.");
}

const cargoTest = spawnSync(
  cargoBinary,
  ["test", "--manifest-path", resolve(tauriRoot, "Cargo.toml"), "runtime_status_includes_packaged_modes"],
  {
    encoding: "utf8",
    stdio: "inherit"
  }
);

if (cargoTest.status !== 0) {
  throw new Error("Tauri runtime diagnostics cargo test failed.");
}

console.log("Desktop packaging configuration is present for dmg and nsis targets.");
