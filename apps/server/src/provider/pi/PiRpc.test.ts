import * as FS from "node:fs";
import * as OS from "node:os";
import * as Path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { PiRpcProcess } from "./PiRpc";

const tempPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map(async (entry) => {
      await FS.promises.rm(entry, { recursive: true, force: true }).catch(() => undefined);
    }),
  );
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
