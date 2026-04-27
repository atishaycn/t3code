#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const LAST_PUSH_DMG_VERSION = "0.0.37";
const SERVER_PACKAGE_JSON_PATH = new URL("../apps/server/package.json", import.meta.url);
const DESKTOP_PACKAGE_JSON_PATH = new URL("../apps/desktop/package.json", import.meta.url);
const PUSH_AND_BUILD_DMG_SCRIPT_PATH = new URL("./push-and-build-dmg.ts", import.meta.url);

export interface PushAndBuildDmgOptions {
  readonly remote: string;
  readonly branch: string | null;
  readonly arch: "arm64" | "x64" | null;
  readonly signed: boolean;
  readonly verbose: boolean;
  readonly skipPush: boolean;
  readonly skipBuild: boolean;
  readonly dryRun: boolean;
}

export interface PlannedCommand {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly description: string;
}

export interface VersionBumpResult {
  readonly previousVersion: string;
  readonly nextVersion: string;
}

export function getNextPatchVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    throw new Error(`Invalid version: ${version}`);
  }

  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  if (!major || !minor || !patch) {
    throw new Error(`Invalid version: ${version}`);
  }

  return `${major}.${minor}.${Number.parseInt(patch, 10) + 1}`;
}

export function updateVersionInPackageJson(content: string, version: string): string {
  return content.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`);
}

export function updateStoredPushDmgVersion(content: string, version: string): string {
  return content.replace(
    /const LAST_PUSH_DMG_VERSION = "[^"]+";/,
    `const LAST_PUSH_DMG_VERSION = "${version}";`,
  );
}

export function bumpPushDmgVersionOnDisk(): VersionBumpResult {
  const nextVersion = getNextPatchVersion(LAST_PUSH_DMG_VERSION);

  const serverPackageJson = readFileSync(SERVER_PACKAGE_JSON_PATH, "utf8");
  const desktopPackageJson = readFileSync(DESKTOP_PACKAGE_JSON_PATH, "utf8");
  const scriptSource = readFileSync(PUSH_AND_BUILD_DMG_SCRIPT_PATH, "utf8");

  writeFileSync(
    SERVER_PACKAGE_JSON_PATH,
    updateVersionInPackageJson(serverPackageJson, nextVersion),
    "utf8",
  );
  writeFileSync(
    DESKTOP_PACKAGE_JSON_PATH,
    updateVersionInPackageJson(desktopPackageJson, nextVersion),
    "utf8",
  );
  writeFileSync(
    PUSH_AND_BUILD_DMG_SCRIPT_PATH,
    updateStoredPushDmgVersion(scriptSource, nextVersion),
    "utf8",
  );

  return {
    previousVersion: LAST_PUSH_DMG_VERSION,
    nextVersion,
  };
}

export function parsePushAndBuildDmgArgs(argv: ReadonlyArray<string>): PushAndBuildDmgOptions {
  const options: {
    remote: string;
    branch: string | null;
    arch: "arm64" | "x64" | null;
    signed: boolean;
    verbose: boolean;
    skipPush: boolean;
    skipBuild: boolean;
    dryRun: boolean;
  } = {
    remote: "origin",
    branch: null,
    arch: null,
    signed: false,
    verbose: false,
    skipPush: false,
    skipBuild: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--remote") {
      if (!next) {
        throw new Error("Missing value for --remote.");
      }
      options.remote = next;
      index += 1;
      continue;
    }

    if (arg === "--branch") {
      if (!next) {
        throw new Error("Missing value for --branch.");
      }
      options.branch = next;
      index += 1;
      continue;
    }

    if (arg === "--arch") {
      if (next !== "arm64" && next !== "x64") {
        throw new Error("--arch must be either 'arm64' or 'x64'.");
      }
      options.arch = next;
      index += 1;
      continue;
    }

    if (arg === "--signed") {
      options.signed = true;
      continue;
    }

    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }

    if (arg === "--skip-push") {
      options.skipPush = true;
      continue;
    }

    if (arg === "--skip-build") {
      options.skipBuild = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function resolveCurrentGitBranch(run = runCommandOrThrow): string {
  const result = run("git", ["branch", "--show-current"], { captureOutput: true });
  const branch = result.stdout.trim();
  if (!branch) {
    throw new Error("Could not determine the current git branch.");
  }
  return branch;
}

export function buildPushAndBuildDmgPlan(
  input: PushAndBuildDmgOptions,
  currentBranch: string,
): ReadonlyArray<PlannedCommand> {
  const branch = input.branch ?? currentBranch;
  const commands: PlannedCommand[] = [];

  if (!input.skipPush) {
    commands.push({
      command: "git",
      args: ["push", input.remote, `HEAD:${branch}`],
      description: `Push current HEAD to ${input.remote}/${branch}`,
    });
  }

  if (!input.skipBuild) {
    const buildArgs = ["run", "dist:desktop:dmg"];
    if (input.arch) {
      buildArgs.push("--arch", input.arch);
    }
    if (input.signed) {
      buildArgs.push("--signed");
    }
    if (input.verbose) {
      buildArgs.push("--verbose");
    }

    commands.push({
      command: "bun",
      args: buildArgs,
      description: "Build the macOS DMG artifact",
    });
  }

  return commands;
}

interface RunCommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

function runCommandOrThrow(
  command: string,
  args: ReadonlyArray<string>,
  options?: { readonly captureOutput?: boolean },
): RunCommandResult {
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
    stdio: options?.captureOutput ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed (${result.status ?? "unknown"}): ${[command, ...args].join(" ")}`,
    );
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function printHelp() {
  console.log(
    `Usage: bun run push:dmg [options]\n\nOptions:\n  --remote <name>   Git remote to push to (default: origin)\n  --branch <name>   Branch to push to (default: current branch)\n  --arch <arch>     DMG build arch: arm64 or x64\n  --signed          Pass --signed to the DMG build\n  --verbose         Pass --verbose to the DMG build\n  --skip-push       Skip git push\n  --skip-build      Skip DMG build\n  --dry-run         Print commands without running them\n  -h, --help        Show this help text`,
  );
}

function assertHostPlatform() {
  if (process.platform !== "darwin") {
    throw new Error("DMG builds must be run on macOS.");
  }
}

if (import.meta.main) {
  try {
    const options = parsePushAndBuildDmgArgs(process.argv.slice(2));

    if (!options.skipBuild && !options.dryRun) {
      assertHostPlatform();
    }

    if (!options.skipBuild && !options.dryRun) {
      const versionBump = bumpPushDmgVersionOnDisk();
      console.log(
        `✓ Bumped desktop version ${versionBump.previousVersion} → ${versionBump.nextVersion} in apps/server/package.json, apps/desktop/package.json, and scripts/push-and-build-dmg.ts`,
      );
    }

    const currentBranch = options.branch ?? resolveCurrentGitBranch();
    const plan = buildPushAndBuildDmgPlan(options, currentBranch);

    if (plan.length === 0) {
      console.log("Nothing to do.");
      process.exit(0);
    }

    for (const step of plan) {
      const renderedCommand = [step.command, ...step.args].join(" ");
      console.log(`→ ${step.description}`);
      console.log(`  ${renderedCommand}`);
      if (!options.dryRun) {
        runCommandOrThrow(step.command, step.args);
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
