#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");

function fail(message) {
  throw new Error(message);
}

function usage() {
  return [
    "Usage: node scripts/v1-readiness-check.mjs --windows-report <windows-packaged-runtime-report.json>",
    "",
    "The Windows hands-on report must come from a real Windows packaged-runtime run."
  ].join("\n");
}

function getFlagValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function requireFile(relativePath) {
  const absolutePath = resolve(workspaceRoot, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`Required V1 evidence file is missing: ${relativePath}`);
  }

  return absolutePath;
}

function requireText(relativePath, expectedText) {
  const absolutePath = requireFile(relativePath);
  const contents = readFileSync(absolutePath, "utf8");
  if (!contents.includes(expectedText)) {
    fail(`Required V1 evidence text is missing from ${relativePath}: ${expectedText}`);
  }
}

function resolveReportPath(reportPath) {
  if (!reportPath) {
    fail(`Windows hands-on packaged runtime report is required before V1 can close.\n${usage()}`);
  }

  const absolutePath = resolve(process.cwd(), reportPath);
  if (!existsSync(absolutePath)) {
    fail(`Windows hands-on packaged runtime report does not exist: ${absolutePath}`);
  }

  return absolutePath;
}

function validateWindowsReport(reportPath) {
  const validatorPath = requireFile("scripts/validate-windows-runtime-report.mjs");
  try {
    execFileSync("node", [validatorPath, reportPath], { encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    const stderr = error.stderr?.toString() ?? "";
    const stdout = error.stdout?.toString() ?? "";
    fail(`Windows hands-on packaged runtime report is incomplete.\n${stdout}${stderr}`.trim());
  }
}

try {
  requireText("docs/superpowers/plans/2026-05-31-ielts-v1-local-app.md", "Windows packaged runtime diagnostic and hands-on verification");
  requireText("docs/superpowers/windows-packaged-runtime-verification.md", "Phase 9 Completion Rule");
  requireText("docs/superpowers/summaries/phase-9-packaging-cross-platform-progress.md", "Windows packaged runtime diagnostics, file picker, audio playback, PDF viewing, SQLite path, and sync folder path still need a real Windows environment.");
  requireText("docs/superpowers/summaries/phase-10-v1-hardening.md", "Windows packaged runtime diagnostics, file picker, audio playback, PDF viewing");

  const reportPath = resolveReportPath(getFlagValue("--windows-report"));
  validateWindowsReport(reportPath);

  console.log("V1 readiness evidence is complete.");
  console.log(`Windows hands-on report: ${reportPath}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
