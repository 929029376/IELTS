#!/usr/bin/env node

import { readFileSync } from "node:fs";

const REQUIRED_ARTIFACTS = [
  "ielts-local-practice-windows-nsis",
  "ielts-local-practice-windows-verification-kit",
  "ielts-local-practice-windows-runtime-report"
];

function parseArgs(argv) {
  const args = {
    branch: "master",
    repo: "929029376/IELTS"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--from-artifacts-json") {
      args.fromArtifactsJson = next;
      index += 1;
    } else if (arg === "--branch") {
      args.branch = next;
      index += 1;
    } else if (arg === "--repo") {
      args.repo = next;
      index += 1;
    } else if (arg === "--help") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function headers() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} ${url}`);
  }

  return response.json();
}

function loadFixture(path) {
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  return {
    run: fixture.workflow_run ?? fixture.run ?? {},
    artifacts: fixture.artifacts ?? []
  };
}

async function loadLatestSuccessfulRun({ repo, branch }) {
  const runsUrl = `https://api.github.com/repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=30`;
  const runsPayload = await fetchJson(runsUrl);
  const run = (runsPayload.workflow_runs ?? []).find(
    (candidate) =>
      candidate.name === "Windows Desktop Package" &&
      candidate.head_branch === branch &&
      candidate.status === "completed" &&
      candidate.conclusion === "success"
  );

  if (!run) {
    throw new Error(`No successful Windows Desktop Package run found on ${branch}.`);
  }

  const artifactsPayload = await fetchJson(run.artifacts_url);
  return {
    run,
    artifacts: artifactsPayload.artifacts ?? []
  };
}

function requiredArtifacts(artifacts) {
  return REQUIRED_ARTIFACTS.map((name) => {
    const artifact = artifacts.find((candidate) => candidate.name === name);
    if (!artifact) {
      throw new Error(`Missing required artifact: ${name}`);
    }

    return artifact;
  });
}

function formatBytes(size) {
  if (!Number.isFinite(size)) {
    return "unknown size";
  }

  return `${size} bytes`;
}

function renderHandoff({ run, artifacts }) {
  const completeArtifacts = requiredArtifacts(artifacts);
  const lines = [
    `Latest successful Windows packaging run: ${run.id ?? "unknown"}`,
    `Run URL: ${run.html_url ?? "unknown"}`,
    `Commit: ${run.head_sha ?? "unknown"}`,
    `Title: ${run.display_title ?? "unknown"}`,
    "",
    "Download these artifacts from the run:"
  ];

  for (const artifact of completeArtifacts) {
    lines.push(`- ${artifact.name}`);
    lines.push(`  Size: ${formatBytes(artifact.size_in_bytes)}`);
    lines.push(`  Digest: ${artifact.digest ?? "unknown"}`);
    lines.push(`  API download URL: ${artifact.archive_download_url ?? "unknown"}`);
  }

  lines.push(
    "",
    "Windows verification steps:",
    "1. Unzip the NSIS installer and verification kit into one Windows folder.",
    "2. Run .\\windows-packaged-runtime-check.ps1 with -ReportPath and your Baidu/listening/audio/PDF paths.",
    "3. Open the packaged app and fill every manualChecklist item with status \"passed\" and observedEvidence.",
    "4. Run node .\\validate-windows-runtime-report.mjs .\\windows-packaged-runtime-report.json.",
    "5. Run pnpm v1:check -- --windows-report <completed-report-path> from the repo root."
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log("Usage: pnpm windows:handoff [--branch master] [--repo owner/repo]");
    console.log("       node scripts/windows-verification-handoff.mjs --from-artifacts-json fixture.json");
    return;
  }

  const handoff = args.fromArtifactsJson ? loadFixture(args.fromArtifactsJson) : await loadLatestSuccessfulRun(args);
  process.stdout.write(renderHandoff(handoff));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
