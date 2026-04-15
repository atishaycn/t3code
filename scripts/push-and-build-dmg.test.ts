import { assert, describe, it } from "@effect/vitest";

import { buildPushAndBuildDmgPlan, parsePushAndBuildDmgArgs } from "./push-and-build-dmg.ts";

describe("push-and-build-dmg", () => {
  describe("parsePushAndBuildDmgArgs", () => {
    it("parses explicit push and build options", () => {
      const result = parsePushAndBuildDmgArgs([
        "--remote",
        "upstream",
        "--branch",
        "release/test",
        "--arch",
        "arm64",
        "--signed",
        "--verbose",
      ]);

      assert.deepStrictEqual(result, {
        remote: "upstream",
        branch: "release/test",
        arch: "arm64",
        signed: true,
        verbose: true,
        skipPush: false,
        skipBuild: false,
        dryRun: false,
      });
    });

    it("uses sane defaults", () => {
      const result = parsePushAndBuildDmgArgs([]);

      assert.deepStrictEqual(result, {
        remote: "origin",
        branch: null,
        arch: null,
        signed: false,
        verbose: false,
        skipPush: false,
        skipBuild: false,
        dryRun: false,
      });
    });

    it("rejects invalid architectures", () => {
      assert.throws(() => parsePushAndBuildDmgArgs(["--arch", "universal"]), /arm64|x64/);
    });
  });

  describe("buildPushAndBuildDmgPlan", () => {
    it("pushes the current branch then builds the dmg", () => {
      const plan = buildPushAndBuildDmgPlan(parsePushAndBuildDmgArgs([]), "main");

      assert.deepStrictEqual(plan, [
        {
          command: "git",
          args: ["push", "origin", "HEAD:main"],
          description: "Push current HEAD to origin/main",
        },
        {
          command: "bun",
          args: ["run", "dist:desktop:dmg"],
          description: "Build the macOS DMG artifact",
        },
      ]);
    });

    it("forwards build flags to the dmg build", () => {
      const plan = buildPushAndBuildDmgPlan(
        parsePushAndBuildDmgArgs(["--arch", "x64", "--signed", "--verbose"]),
        "main",
      );

      assert.deepStrictEqual(plan[1], {
        command: "bun",
        args: ["run", "dist:desktop:dmg", "--arch", "x64", "--signed", "--verbose"],
        description: "Build the macOS DMG artifact",
      });
    });

    it("supports skipping push or build", () => {
      const pushOnly = buildPushAndBuildDmgPlan(parsePushAndBuildDmgArgs(["--skip-build"]), "main");
      const buildOnly = buildPushAndBuildDmgPlan(parsePushAndBuildDmgArgs(["--skip-push"]), "main");

      assert.equal(pushOnly.length, 1);
      assert.equal(pushOnly[0]?.command, "git");
      assert.equal(buildOnly.length, 1);
      assert.equal(buildOnly[0]?.command, "bun");
    });
  });
});
