import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { collectThreadStatusRecords } from "./threadStatusDiagnostics";
import type { AppState, EnvironmentState } from "./store";
import { useUiStateStore } from "./uiStateStore";

const environmentId = EnvironmentId.make("environment-local");
const projectId = "project-1" as never;
const threadId = ThreadId.make("thread-1");
const threadKey = scopedThreadKey(scopeThreadRef(environmentId, threadId));

function makeRunningLatestTurn(state: "running" | "completed") {
  return {
    turnId: "turn-1" as never,
    state,
    startedAt: "2026-04-15T12:00:30.000Z",
    completedAt: state === "completed" ? "2026-04-15T12:01:00.000Z" : null,
    requestedAt: "2026-04-15T12:00:30.000Z",
    assistantMessageId: null,
  } as never;
}

function makeEnvironmentState(): EnvironmentState {
  const session = {
    provider: "pi",
    status: "running",
    activeTurnId: "turn-1" as never,
    createdAt: "2026-04-15T12:00:00.000Z",
    updatedAt: "2026-04-15T12:01:00.000Z",
    orchestrationStatus: "running",
  };

  return {
    projectIds: [],
    projectById: {},
    threadIds: [threadId],
    threadIdsByProjectId: { [projectId]: [threadId] },
    threadShellById: {
      [threadId]: {
        id: threadId,
        environmentId,
        codexThreadId: null,
        projectId,
        title: "Fix status logging",
        modelSelection: { provider: "pi", model: "default" },
        runtimeMode: "full-access",
        interactionMode: "default",
        error: null,
        createdAt: "2026-04-15T12:00:00.000Z",
        archivedAt: null,
        updatedAt: "2026-04-15T12:00:00.000Z",
        branch: null,
        worktreePath: null,
        isPinned: false,
      },
    },
    threadSessionById: {
      [threadId]: session,
    },
    threadTurnStateById: {
      [threadId]: {
        latestTurn: makeRunningLatestTurn("running"),
      },
    },
    messageIdsByThreadId: { [threadId]: ["message-1" as never] },
    messageByThreadId: {
      [threadId]: {
        ["message-1" as never]: {
          id: "message-1" as never,
          role: "user",
          text: "Please add thread diagnostics logging.",
          createdAt: "2026-04-15T12:00:00.000Z",
          streaming: false,
          attachments: [],
        },
      },
    },
    activityIdsByThreadId: { [threadId]: ["activity-1"] },
    activityByThreadId: {
      [threadId]: {
        "activity-1": {
          id: "activity-1" as never,
          kind: "tool.started",
          summary: "Started bash",
          payload: { title: "bash", state: "running" },
          turnId: "turn-1" as never,
          createdAt: "2026-04-15T12:00:40.000Z",
          tone: "info",
        },
      },
    },
    proposedPlanIdsByThreadId: {},
    proposedPlanByThreadId: {},
    turnDiffIdsByThreadId: {},
    turnDiffSummaryByThreadId: {},
    sidebarThreadSummaryById: {
      [threadId]: {
        id: threadId,
        environmentId,
        projectId,
        title: "Fix status logging",
        interactionMode: "default",
        session,
        createdAt: "2026-04-15T12:00:00.000Z",
        archivedAt: null,
        updatedAt: "2026-04-15T12:01:00.000Z",
        latestTurn: makeRunningLatestTurn("running"),
        branch: null,
        worktreePath: null,
        isPinned: false,
        latestUserMessageAt: "2026-04-15T12:00:00.000Z",
        hasPendingApprovals: false,
        hasPendingUserInput: false,
        hasActionableProposedPlan: false,
      },
    },
    bootstrapComplete: true,
  } as unknown as EnvironmentState;
}

function makeAppState(): AppState {
  return {
    activeEnvironmentId: environmentId,
    environmentStateById: {
      [environmentId]: makeEnvironmentState(),
    },
  } as unknown as AppState;
}

function makeUiState(partial?: Partial<ReturnType<typeof useUiStateStore.getState>>) {
  return {
    ...useUiStateStore.getState(),
    projectExpandedById: {},
    projectOrder: [],
    threadLastVisitedAtById: {},
    threadChangedFilesExpandedById: {},
    ...partial,
  };
}

describe("threadStatusDiagnostics", () => {
  it("emits a first diagnostic record for a visible thread status", () => {
    const writes = collectThreadStatusRecords({
      appState: makeAppState(),
      uiState: makeUiState(),
      terminalState: {
        terminalStateByThreadKey: {},
      } as never,
      previousSnapshots: new Map(),
      trigger: "initial-evaluation",
    });

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]?.recordJson ?? "{}")).toMatchObject({
      threadId: "thread-1",
      transition: {
        previousLabel: null,
        nextLabel: "Working",
        nextReason: "actively-running",
      },
      derived: {
        label: "Working",
        isRunningTurn: true,
      },
    });
  });

  it("suppresses duplicate writes when the snapshot is unchanged", () => {
    const previousSnapshots = new Map();

    const first = collectThreadStatusRecords({
      appState: makeAppState(),
      uiState: makeUiState(),
      terminalState: {
        terminalStateByThreadKey: {},
      } as never,
      previousSnapshots: previousSnapshots as never,
      trigger: "initial-evaluation",
    });
    const second = collectThreadStatusRecords({
      appState: makeAppState(),
      uiState: makeUiState(),
      terminalState: {
        terminalStateByThreadKey: {},
      } as never,
      previousSnapshots: previousSnapshots as never,
      trigger: "app-store-change",
    });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it("emits a transition when last visited time hides completed status", () => {
    const appState = makeAppState();
    const envState = appState.environmentStateById[environmentId] as EnvironmentState;
    envState.threadSessionById[threadId] = {
      provider: "pi",
      status: "ready",
      createdAt: "2026-04-15T12:00:00.000Z",
      updatedAt: "2026-04-15T12:02:00.000Z",
      orchestrationStatus: "idle" as never,
    };
    envState.threadTurnStateById[threadId] = {
      latestTurn: makeRunningLatestTurn("completed"),
    };
    envState.sidebarThreadSummaryById[threadId] = {
      ...envState.sidebarThreadSummaryById[threadId],
      session: envState.threadSessionById[threadId],
      latestTurn: envState.threadTurnStateById[threadId]?.latestTurn ?? null,
    } as never;

    const previousSnapshots = new Map();
    const unseenWrites = collectThreadStatusRecords({
      appState,
      uiState: makeUiState(),
      terminalState: { terminalStateByThreadKey: {} } as never,
      previousSnapshots,
      trigger: "initial-evaluation",
    });
    const seenWrites = collectThreadStatusRecords({
      appState,
      uiState: makeUiState({
        threadLastVisitedAtById: {
          [threadKey]: "2026-04-15T12:03:00.000Z",
        },
      }),
      terminalState: { terminalStateByThreadKey: {} } as never,
      previousSnapshots,
      trigger: "ui-store-change",
    });

    expect(unseenWrites).toHaveLength(1);
    expect(JSON.parse(unseenWrites[0]?.recordJson ?? "{}")).toMatchObject({
      transition: { nextLabel: "Completed", nextReason: "unseen-completion" },
    });
    expect(seenWrites).toHaveLength(1);
    expect(JSON.parse(seenWrites[0]?.recordJson ?? "{}")).toMatchObject({
      transition: {
        previousLabel: "Completed",
        nextLabel: null,
        previousReason: "unseen-completion",
        nextReason: "idle",
      },
      derived: {
        label: null,
        hasUnseenCompletion: false,
      },
    });
  });
});
