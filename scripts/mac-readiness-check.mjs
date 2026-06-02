#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const pnpmVersion = "9.15.4";

const checks = [
  {
    label: "Unit and component coverage for import, practice, mock exam, intensive study, sync, reports, hardening, and desktop evidence",
    pnpmArgs: ["test"]
  },
  {
    label: "Playwright main UI flow coverage on Mac local web mode",
    pnpmArgs: ["test:e2e"]
  },
  {
    label: "Production TypeScript and Vite build",
    pnpmArgs: ["build"]
  },
  {
    label: "Desktop runtime diagnostics and packaging configuration check",
    pnpmArgs: ["desktop:check"]
  },
  {
    label: "Mac DMG packaging",
    pnpmArgs: ["desktop:build:mac"]
  }
];

function commandText(pnpmArgs) {
  return ["pnpm", ...pnpmArgs].join(" ");
}

function canRun(command, args) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    env: {
      ...process.env,
      PATH: process.env.HOME ? `${process.env.HOME}/.cargo/bin:${process.env.PATH ?? ""}` : process.env.PATH
    }
  });

  return result.status === 0;
}

function resolvePnpmCommand() {
  if (process.env.PNPM_EXECUTABLE) {
    return [process.env.PNPM_EXECUTABLE];
  }

  if (canRun("pnpm", ["--version"])) {
    return ["pnpm"];
  }

  return ["npx", `pnpm@${pnpmVersion}`];
}

function listChecks() {
  const lines = ["Mac V1 readiness checks:"];
  for (const check of checks) {
    lines.push(`- ${check.label}`);
    lines.push(`  ${commandText(check.pnpmArgs)}`);
  }
  return `${lines.join("\n")}\n`;
}

function runCheck(check) {
  const pnpmCommand = resolvePnpmCommand();
  const command = [...pnpmCommand, ...check.pnpmArgs];

  console.log(`\n==> ${check.label}`);
  console.log(commandText(check.pnpmArgs));

  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: process.env.HOME ? `${process.env.HOME}/.cargo/bin:${process.env.PATH ?? ""}` : process.env.PATH
    },
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Mac readiness check failed: ${check.label}`);
  }
}

function main() {
  if (process.argv.includes("--list")) {
    process.stdout.write(listChecks());
    return;
  }

  console.log("Running Mac V1 readiness checks. Windows evidence is intentionally deferred.");
  for (const check of checks) {
    runCheck(check);
  }
  console.log("\nMac V1 readiness checks passed.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
