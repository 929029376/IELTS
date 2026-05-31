import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const webRoot = resolve(workspaceRoot, "apps/web");
const tauriRoot = resolve(webRoot, "src-tauri");
const requiredFiles = [
  "tauri.conf.json",
  "Cargo.toml",
  "build.rs",
  "src/lib.rs",
  "src/main.rs"
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

console.log("Desktop packaging configuration is present for dmg and nsis targets.");
