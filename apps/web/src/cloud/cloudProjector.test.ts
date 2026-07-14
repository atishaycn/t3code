import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import { describe, expect, it } from "vite-plus/test";

import { projectThreadStatus, projectUnboundThread } from "./cloudProjector";

function thread(overrides: Partial<EnvironmentThreadShell> = {}): EnvironmentThreadShell {
  return {
    id: "thread-1",
    environmentId: "environment-1",
    projectId: "project-1",
    title: "Independent task",
    modelSelection: { instanceId: "pi", model: "test-model", options: {} },
    runtimeMode: "approval-required",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    latestTurn: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    archivedAt: null,
    session: null,
    latestUserMessageAt: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    hasActionableProposedPlan: false,
    ...overrides,
  } as EnvironmentThreadShell;
}

describe("cloud projector", () => {
  it("keeps canonical threads unbound instead of inventing workflow topology", () => {
    const projected = projectUnboundThread(thread());

    expect(projected.parentThreadId).toBeNull();
    expect(projected.role).toBe("provider thread");
    expect(projected.threadId).toBe("thread-1");
  });

  it("prioritizes human gates over turn activity", () => {
    const value = thread({
      hasPendingApprovals: true,
      latestTurn: {
        turnId: "turn-1",
        state: "running",
        requestedAt: "2026-07-13T00:00:00.000Z",
        startedAt: "2026-07-13T00:00:00.000Z",
        completedAt: null,
        assistantMessageId: null,
      } as EnvironmentThreadShell["latestTurn"],
    });

    expect(projectThreadStatus(value)).toBe("waiting");
    expect(projectUnboundThread(value).activity).toBe("Approval required");
  });
});
