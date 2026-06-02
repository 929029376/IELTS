#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredManualIds = [
  "runtime-platform",
  "runtime-sqlite-path",
  "runtime-sync-path",
  "listening-zip-picker",
  "listening-audio-playback",
  "reading-pdf-preview"
];

const requiredAssetLabels = ["Listening ZIP", "Listening audio", "Reading PDF"];

function usage() {
  return "Usage: node scripts/validate-windows-runtime-report.mjs <windows-packaged-runtime-report.json>";
}

function fail(message) {
  throw new Error(message);
}

function requireTruthy(value, label) {
  if (!value) {
    fail(`${label} is missing or false.`);
  }
}

function readReport(reportPath) {
  if (!reportPath) {
    fail(usage());
  }

  const resolvedPath = resolve(reportPath);
  try {
    return JSON.parse(readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    fail(`Could not read Windows runtime report at ${resolvedPath}: ${error.message}`);
  }
}

function validatePathCheck(check, label) {
  if (!check) {
    fail(`${label} check is missing.`);
  }

  if (check.provided !== true) {
    fail(`${label} check was not provided.`);
  }

  if (check.exists !== true || check.status !== "exists") {
    fail(`${label} check did not resolve to an existing path.`);
  }
}

function validateManualChecklist(report) {
  if (!Array.isArray(report.manualChecklist)) {
    fail("manualChecklist is missing or not an array.");
  }

  for (const id of requiredManualIds) {
    const item = report.manualChecklist.find((candidate) => candidate?.id === id);
    if (!item) {
      fail(`manualChecklist item ${id} is missing.`);
    }

    if (item.status !== "passed") {
      fail(`manualChecklist item ${id} must be passed before Phase 9 can close.`);
    }

    if (typeof item.observedEvidence !== "string" || item.observedEvidence.trim().length === 0) {
      fail(`manualChecklist item ${id} must include observedEvidence before Phase 9 can close.`);
    }
  }
}

function validateReport(report) {
  requireTruthy(report?.installer?.hashVerified, "installer.hashVerified");
  requireTruthy(report?.installedApp?.found, "installedApp.found");
  requireTruthy(report?.installedApp?.processStayedRunning, "installedApp.processStayedRunning");
  requireTruthy(report?.appData?.detectedPath, "appData.detectedPath");
  requireTruthy(report?.appData?.expectedDatabase, "appData.expectedDatabase");

  validatePathCheck(report.baiduSync, "Baidu Cloud sync folder");

  if (!Array.isArray(report.assetChecks)) {
    fail("assetChecks is missing or not an array.");
  }

  for (const label of requiredAssetLabels) {
    const check = report.assetChecks.find((candidate) => candidate?.label === label);
    validatePathCheck(check, label);
  }

  validateManualChecklist(report);
}

try {
  const report = readReport(process.argv[2]);
  validateReport(report);
  console.log("Windows runtime report is complete and Phase 9 evidence-ready.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
