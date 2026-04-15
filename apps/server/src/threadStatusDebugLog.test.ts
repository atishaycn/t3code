import fs from "node:fs";
import path from "node:path";

import {
  type ServerAppendThreadStatusLogInput,
  ThreadId,
  type ThreadStatusDiagnosticRecord,
} from "@t3tools/contracts";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";

import { appendThreadStatusDebugLog, resolveThreadStatusLogPath } from "./threadStatusDebugLog";

function makeRecord(threadId: string): ThreadStatusDiagnosticRecord {
  return {
    version: 1,
    recordedAt: "2026-04-15T12:00:00.000Z",
    threadId: ThreadId.make(threadId),
    source: {
      area: "sidebar",
      trigger: "initial-evaluation",
    },
    transition: {
      changed: true,
      previousLabel: null,
      nextLabel: "Working",
      previousReason: null,
      nextReason: "actively-running",
    },
    derived: {
      label: "Working",
      reason: "actively-running",
      isRunningTurn: true,
      isLatestTurnSettled: false,
      hasPendingApproval: false,
      hasPendingUserInput: false,
      hasManualCompletionOverride: false,
      hasActiveTerminal: false,
      hasRecentRuntimeActivity: true,
      hasUnseenCompletion: false,
    },
    latestTurn: {
      id: "turn-1",
      state: "running",
      startedAt: "2026-04-15T11:59:00.000Z",
      completedAt: null,
      providerSessionId: "provider-session-1",
      providerTurnId: "provider-turn-1",
    },
    latestSession: {
      id: "session-1",
      state: "running",
      provider: "pi",
      model: "gpt-5",
      updatedAt: "2026-04-15T12:00:00.000Z",
    },
    inputs: {
      pendingApproval: null,
      pendingUserInput: null,
      manualCompletion: {
        overridden: false,
        completedAt: null,
        lastVisitedAt: null,
      },
      terminal: {
        activeCount: 0,
        lastActivityAt: null,
      },
      activities: {
        totalCount: 1,
        recent: [
          {
            id: "activity-1",
            type: "tool.started",
            createdAt: "2026-04-15T11:59:30.000Z",
            state: "running",
            title: "bash",
          },
        ],
      },
      messages: {
        totalCount: 1,
        previous: null,
        anchor: {
          id: "message-1",
          role: "user",
          createdAt: "2026-04-15T11:58:00.000Z",
          textPreview: "Please update the implementation.",
          hasImages: false,
        },
        next: null,
      },
    },
    decisionContext: {
      selectedThreadId: null,
      visibleThreadId: null,
      environmentId: null,
    },
  };
}

function makeInput(threadId: string): ServerAppendThreadStatusLogInput {
  return {
    threadId: ThreadId.make(threadId),
    recordJson: JSON.stringify(makeRecord(threadId)),
  };
}

describe("threadStatusDebugLog", () => {
  it("appends ndjson records to a thread-scoped log file", async () => {
    const logsDir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "t3-thread-status-"));
    const threadId = ThreadId.make("thread-1");

    try {
      await Effect.runPromise(
        appendThreadStatusDebugLog({
          logsDir,
          payload: makeInput("thread-1"),
        }),
      );
      await Effect.runPromise(
        appendThreadStatusDebugLog({
          logsDir,
          payload: makeInput("thread-1"),
        }),
      );

      const filePath = resolveThreadStatusLogPath(logsDir, threadId);
      const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({ threadId: "thread-1" });
      expect(JSON.parse(lines[1] ?? "{}")).toMatchObject({ threadId: "thread-1" });
    } finally {
      fs.rmSync(logsDir, { recursive: true, force: true });
    }
  });

  it("rejects mismatched thread ids", async () => {
    const logsDir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "t3-thread-status-"));

    try {
      const record = makeRecord("thread-a");
      const input: ServerAppendThreadStatusLogInput = {
        threadId: ThreadId.make("thread-b"),
        recordJson: JSON.stringify(record),
      };

      await expect(
        Effect.runPromise(
          appendThreadStatusDebugLog({
            logsDir,
            payload: input,
          }),
        ),
      ).rejects.toThrow(/threadId does not match/i);
    } finally {
      fs.rmSync(logsDir, { recursive: true, force: true });
    }
  });
});
