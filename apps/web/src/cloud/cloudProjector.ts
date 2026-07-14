import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";

import type { AgentRecord, AgentStatus } from "./types";

export function projectThreadStatus(thread: EnvironmentThreadShell): AgentStatus {
  if (thread.hasPendingApprovals || thread.hasPendingUserInput) return "waiting";
  if (thread.latestTurn?.state === "running") return "running";
  if (thread.latestTurn?.state === "error") return "failed";
  if (thread.latestTurn?.state === "interrupted") return "interrupted";
  if (thread.latestTurn?.state === "completed") return "completed";
  return "idle";
}

/**
 * Canonical provider threads stay unbound until the cloud backend supplies
 * explicit workflow metadata. Array order is never treated as topology.
 */
export function projectUnboundThread(thread: EnvironmentThreadShell): AgentRecord {
  return {
    threadId: thread.id,
    parentThreadId: null,
    name: thread.title,
    role: "provider thread",
    status: projectThreadStatus(thread),
    model: thread.modelSelection.model,
    currentTurnId: thread.latestTurn?.turnId ?? null,
    runId: null,
    lastMessage: "",
    activity: thread.hasPendingApprovals
      ? "Approval required"
      : thread.hasPendingUserInput
        ? "Waiting for input"
        : thread.latestTurn?.state === "running"
          ? "Working through the current turn"
          : thread.latestTurn?.state === "error"
            ? "The last turn failed"
            : "Ready",
    updatedAt: thread.updatedAt,
  };
}
