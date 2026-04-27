import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { PiRpcProcess, probePiExtensions } from "./PiRpc";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map(async (entry) => {
      await FS.promises.rm(entry, { recursive: true, force: true }).catch(() => undefined);
    }),
  );
});

describe("probePiExtensions", () => {
  it("discovers inherited user and project-local Pi extensions", async () => {
    const tempDir = await FS.promises.mkdtemp(Path.join(OS.tmpdir(), "pi-ext-test-"));
    tempPaths.push(tempDir);

    const userAgentDir = Path.join(tempDir, "user-agent");
    const userExtensionDir = Path.join(userAgentDir, "extensions", "user-extension");
    const projectDir = Path.join(tempDir, "project");
    const projectExtensionDir = Path.join(projectDir, ".pi", "extensions");

    await FS.promises.mkdir(userExtensionDir, { recursive: true });
    await FS.promises.mkdir(projectExtensionDir, { recursive: true });
    await FS.promises.writeFile(Path.join(userExtensionDir, "index.ts"), "export default {};\n");
    await FS.promises.writeFile(
      Path.join(projectExtensionDir, "autoresearch-soul.ts"),
      "export default {};\n",
    );
    await FS.promises.writeFile(Path.join(userAgentDir, "settings.json"), "{}\n");

    const extensions = await probePiExtensions({
      env: { PI_CODING_AGENT_DIR: userAgentDir },
      cwd: projectDir,
      inheritExtensions: true,
    });

    expect(extensions).toEqual([
      {
        name: "autoresearch-soul",
        path: Path.join(projectExtensionDir, "autoresearch-soul.ts"),
        source: "project",
      },
      {
        name: "user-extension",
        path: Path.join(userExtensionDir, "index.ts"),
        source: "user",
      },
    ]);
  });

  it("returns no extensions when inheritance is disabled", async () => {
    const tempDir = await FS.promises.mkdtemp(Path.join(OS.tmpdir(), "pi-ext-test-"));
    tempPaths.push(tempDir);

    const extensions = await probePiExtensions({
      env: { PI_CODING_AGENT_DIR: tempDir },
      cwd: tempDir,
      inheritExtensions: false,
    });

    expect(extensions).toEqual([]);
  });
});

describe("PiRpcProcess.close", () => {
  it("forces shutdown when the child ignores stdin close and SIGTERM", async () => {
    const tempDir = await FS.promises.mkdtemp(Path.join(OS.tmpdir(), "pi-rpc-test-"));
    tempPaths.push(tempDir);

    const launcherPath = Path.join(tempDir, "fake-pi.mjs");
    const sessionFile = Path.join(tempDir, "session.jsonl");

    await FS.promises.writeFile(
      launcherPath,
      [
        "#!/usr/bin/env node",
        'process.on("SIGTERM", () => undefined);',
        'process.on("SIGINT", () => undefined);',
        'import * as readline from "node:readline";',
        "const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });",
        'rl.on("line", (line) => {',
        "  const payload = JSON.parse(line);",
        '  if (payload.type !== "get_state") return;',
        "  process.stdout.write(JSON.stringify({",
        '    type: "response",',
        '    command: "get_state",',
        "    success: true,",
        "    id: payload.id,",
        "    data: {",
        '      thinkingLevel: "medium",',
        "      isStreaming: false,",
        "      isCompacting: false,",
        '      steeringMode: "all",',
        '      followUpMode: "all",',
        `      sessionFile: ${JSON.stringify(sessionFile)},`,
        '      sessionId: "fake-session",',
        "      autoCompactionEnabled: true,",
        "      messageCount: 0,",
        "      pendingMessageCount: 0,",
        "    },",
        '  }) + "\\n");',
        "});",
        'rl.on("close", () => {',
        "  setInterval(() => undefined, 1_000);",
        "});",
      ].join("\n"),
      { mode: 0o755 },
    );

    const process = await PiRpcProcess.start({
      binaryPath: launcherPath,
      cwd: tempDir,
      sessionFile,
    });

    const startedAt = Date.now();
    await process.close(25, 25);
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1_500);
  });
});
