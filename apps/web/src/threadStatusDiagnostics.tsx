import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type {
  EnvironmentId,
  ServerAppendThreadStatusLogInput,
  ThreadStatusDiagnosticActivitySummary,
  ThreadStatusDiagnosticMessageSummary,
  ThreadStatusDiagnosticRecord,
  ThreadStatusDiagnosticTrigger,
  ThreadStatusLabel,
  ThreadStatusReason,
} from "@t3tools/contracts";
import { useEffect } from "react";

import {
  deriveThreadStatusDecision,
  hasUnseenCompletion,
  isThreadActivelyWorking,
} from "./components/Sidebar.logic";
import { readLocalApi } from "./localApi";
import { isLatestTurnSettled } from "./session-logic";
import { type AppState, type EnvironmentState, useStore } from "./store";
import { getThreadFromEnvironmentState } from "./threadDerivation";
import { type Thread } from "./types";
import { useTerminalStateStore } from "./terminalStateStore";
import { useUiStateStore } from "./uiStateStore";

const MAX_ACTIVITY_SUMMARIES = 5;
const TEXT_PREVIEW_MAX_LENGTH = 160;

interface ThreadStatusDiagnosticSnapshot {
  readonly label: ThreadStatusLabel | null;
  readonly reason: ThreadStatusReason;
  readonly derived: ThreadStatusDiagnosticRecord["derived"];
  readonly latestTurn: ThreadStatusDiagnosticRecord["latestTurn"];
  readonly latestSession: ThreadStatusDiagnosticRecord["latestSession"];
  readonly inputs: ThreadStatusDiagnosticRecord["inputs"];
  readonly decisionContext: ThreadStatusDiagnosticRecord["decisionContext"];
}

function summarizeTextPreview(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length <= TEXT_PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, TEXT_PREVIEW_MAX_LENGTH - 1)}…`;
}

function summarizeMessage(
  message: Thread["messages"][number] | null | undefined,
): ThreadStatusDiagnosticMessageSummary | null {
  if (!message) {
    return null;
  }
  return {
    id: message.id ?? null,
    role: message.role ?? null,
    createdAt: message.createdAt ?? null,
    textPreview: summarizeTextPreview(message.text),
    hasImages: (message.attachments ?? []).some((attachment) => attachment.type === "image"),
  };
}

function summarizeActivity(
  activity: Thread["activities"][number],
): ThreadStatusDiagnosticActivitySummary {
  const payload =
    activity.payload && typeof activity.payload === "object"
      ? (activity.payload as Record<string, unknown>)
      : null;
  const state = typeof payload?.state === "string" ? payload.state : null;
  const title =
    typeof payload?.title === "string"
      ? payload.title
      : typeof payload?.label === "string"
        ? payload.label
        : null;
  return {
    id: activity.id ?? null,
    type: activity.kind,
    createdAt: activity.createdAt ?? null,
    state,
    title,
  };
}

function derivePendingApprovalSummary(
  thread: Thread,
): ThreadStatusDiagnosticRecord["inputs"]["pendingApproval"] {
  const requested = thread.activities
    .toReversed()
    .find((activity) => activity.kind === "approval.requested");
  if (!requested) {
    return null;
  }
  const payload =
    requested.payload && typeof requested.payload === "object"
      ? (requested.payload as Record<string, unknown>)
      : null;
  const kind =
    typeof payload?.requestKind === "string"
      ? payload.requestKind
      : typeof payload?.requestType === "string"
        ? payload.requestType
        : requested.kind;
  const id = typeof payload?.requestId === "string" ? payload.requestId : null;
  return {
    kind,
    id,
    createdAt: requested.createdAt ?? null,
    source: typeof payload?.source === "string" ? payload.source : null,
  };
}

function derivePendingUserInputSummary(
  thread: Thread,
): ThreadStatusDiagnosticRecord["inputs"]["pendingUserInput"] {
  const requested = thread.activities
    .toReversed()
    .find((activity) => activity.kind === "user-input.requested");
  if (!requested) {
    return null;
  }
  const payload =
    requested.payload && typeof requested.payload === "object"
      ? (requested.payload as Record<string, unknown>)
      : null;
  const id = typeof payload?.requestId === "string" ? payload.requestId : null;
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const firstQuestion = questions.find(
    (question): question is Record<string, unknown> => !!question && typeof question === "object",
  );
  const kind = typeof firstQuestion?.kind === "string" ? firstQuestion.kind : requested.kind;
  return {
    kind,
    id,
    createdAt: requested.createdAt ?? null,
  };
}

function deriveThreadStatusDiagnosticSnapshot(input: {
  environmentId: EnvironmentId;
  environmentState: EnvironmentState;
  threadId: Thread["id"];
  lastVisitedAt: string | null;
  runningTerminalIds: readonly string[];
}): ThreadStatusDiagnosticSnapshot | null {
  const thread = getThreadFromEnvironmentState(input.environmentState, input.threadId);
  if (!thread) {
    return null;
  }

  const summary = input.environmentState.sidebarThreadSummaryById[input.threadId];
  if (!summary) {
    return null;
  }

  const threadDecision = deriveThreadStatusDecision({
    thread: {
      ...summary,
      lastVisitedAt: input.lastVisitedAt ?? undefined,
    },
  });
  const latestTurnSettled = isLatestTurnSettled(thread.latestTurn, thread.session);
  const isRunningTurn = isThreadActivelyWorking(thread) === "working";
  const latestActivity = thread.activities.at(-1) ?? null;
  const hasRecentRuntimeActivity = latestActivity !== null;
  const recentActivities = thread.activities.slice(-MAX_ACTIVITY_SUMMARIES).map(summarizeActivity);
  const messages = thread.messages;
  const anchorMessage = messages.at(-1) ?? null;
  const previousMessage = messages.length > 1 ? (messages.at(-2) ?? null) : null;

  return {
    label: threadDecision.label,
    reason: threadDecision.reason,
    derived: {
      label: threadDecision.label,
      reason: threadDecision.reason,
      isRunningTurn,
      isLatestTurnSettled: latestTurnSettled,
      hasPendingApproval: summary.hasPendingApprovals,
      hasPendingUserInput: summary.hasPendingUserInput,
      hasManualCompletionOverride: false,
      hasActiveTerminal: input.runningTerminalIds.length > 0,
      hasRecentRuntimeActivity,
      hasUnseenCompletion: hasUnseenCompletion({
        ...summary,
        lastVisitedAt: input.lastVisitedAt ?? undefined,
      }),
    },
    latestTurn: {
      id: thread.latestTurn?.turnId ?? null,
      state: thread.latestTurn?.state ?? null,
      startedAt: thread.latestTurn?.startedAt ?? null,
      completedAt: thread.latestTurn?.completedAt ?? null,
      providerSessionId: null,
      providerTurnId: null,
    },
    latestSession: {
      id: null,
      state: thread.session?.orchestrationStatus ?? thread.session?.status ?? null,
      provider: thread.session?.provider ?? null,
      model: thread.modelSelection?.model ?? null,
      updatedAt: thread.session?.updatedAt ?? null,
    },
    inputs: {
      pendingApproval: derivePendingApprovalSummary(thread),
      pendingUserInput: derivePendingUserInputSummary(thread),
      manualCompletion: {
        overridden: false,
        completedAt: null,
        lastVisitedAt: input.lastVisitedAt,
      },
      terminal: {
        activeCount: input.runningTerminalIds.length,
        lastActivityAt: null,
      },
      activities: {
        totalCount: thread.activities.length,
        recent: recentActivities,
      },
      messages: {
        totalCount: messages.length,
        previous: summarizeMessage(previousMessage),
        anchor: summarizeMessage(anchorMessage),
        next: null,
      },
    },
    decisionContext: {
      selectedThreadId: null,
      visibleThreadId: null,
      environmentId: input.environmentId,
    },
  };
}

function toRecord(input: {
  threadId: Thread["id"];
  trigger: ThreadStatusDiagnosticTrigger;
  previous: ThreadStatusDiagnosticSnapshot | null;
  next: ThreadStatusDiagnosticSnapshot;
}): ThreadStatusDiagnosticRecord {
  return {
    version: 1,
    recordedAt: new Date().toISOString(),
    threadId: input.threadId,
    source: {
      area: "sidebar",
      trigger: input.trigger,
    },
    transition: {
      changed:
        input.previous?.label !== input.next.label || input.previous?.reason !== input.next.reason,
      previousLabel: input.previous?.label ?? null,
      nextLabel: input.next.label,
      previousReason: input.previous?.reason ?? null,
      nextReason: input.next.reason,
    },
    derived: input.next.derived,
    latestTurn: input.next.latestTurn,
    latestSession: input.next.latestSession,
    inputs: input.next.inputs,
    decisionContext: input.next.decisionContext,
  };
}

function snapshotKey(snapshot: ThreadStatusDiagnosticSnapshot): string {
  return JSON.stringify(snapshot);
}

function collectThreadStatusRecords(input: {
  appState: AppState;
  uiState: ReturnType<typeof useUiStateStore.getState>;
  terminalState: ReturnType<typeof useTerminalStateStore.getState>;
  previousSnapshots: Map<string, ThreadStatusDiagnosticSnapshot>;
  trigger: ThreadStatusDiagnosticTrigger;
}): ServerAppendThreadStatusLogInput[] {
  const nextKeys = new Set<string>();
  const writes: ServerAppendThreadStatusLogInput[] = [];

  for (const [environmentId, environmentState] of Object.entries(
    input.appState.environmentStateById,
  )) {
    for (const threadId of Object.keys(environmentState.sidebarThreadSummaryById)) {
      const threadRef = scopeThreadRef(environmentId as EnvironmentId, threadId as Thread["id"]);
      const threadKey = scopedThreadKey(threadRef);
      nextKeys.add(threadKey);
      const lastVisitedAt = input.uiState.threadLastVisitedAtById[threadKey] ?? null;
      const runningTerminalIds =
        input.terminalState.terminalStateByThreadKey[threadKey]?.runningTerminalIds ?? [];
      const nextSnapshot = deriveThreadStatusDiagnosticSnapshot({
        environmentId: environmentId as EnvironmentId,
        environmentState,
        threadId: threadId as Thread["id"],
        lastVisitedAt,
        runningTerminalIds,
      });
      if (!nextSnapshot) {
        continue;
      }

      const previousSnapshot = input.previousSnapshots.get(threadKey) ?? null;
      input.previousSnapshots.set(threadKey, nextSnapshot);

      if (previousSnapshot && snapshotKey(previousSnapshot) === snapshotKey(nextSnapshot)) {
        continue;
      }

      const record = toRecord({
        threadId: threadId as Thread["id"],
        trigger: input.trigger,
        previous: previousSnapshot,
        next: nextSnapshot,
      });
      writes.push({
        threadId: record.threadId,
        recordJson: JSON.stringify(record),
      });
    }
  }

  for (const existingKey of input.previousSnapshots.keys()) {
    if (!nextKeys.has(existingKey)) {
      input.previousSnapshots.delete(existingKey);
    }
  }

  return writes;
}

export function ThreadStatusDiagnosticsCoordinator() {
  useEffect(() => {
    const api = readLocalApi();
    if (!api) {
      return;
    }

    let disposed = false;
    let evaluateScheduled = false;
    let flushScheduled = false;
    let flushing = false;
    let pendingTrigger: ThreadStatusDiagnosticTrigger = "initial-evaluation";
    const previousSnapshots = new Map<string, ThreadStatusDiagnosticSnapshot>();
    const pendingWrites: ServerAppendThreadStatusLogInput[] = [];

    const flushWrites = async () => {
      flushScheduled = false;
      if (flushing || disposed) {
        return;
      }

      flushing = true;
      try {
        while (pendingWrites.length > 0) {
          if (disposed) {
            break;
          }
          const nextWrite = pendingWrites.shift();
          if (!nextWrite) {
            continue;
          }
          try {
            await api.server.appendThreadStatusLog(nextWrite);
          } catch (error) {
            console.warn("[thread-status-diagnostics] failed to append thread status log", {
              threadId: nextWrite.threadId,
              error,
            });
          }
        }
      } finally {
        flushing = false;
        if (!disposed && pendingWrites.length > 0 && !flushScheduled) {
          flushScheduled = true;
          queueMicrotask(() => {
            void flushWrites();
          });
        }
      }
    };

    const evaluate = () => {
      evaluateScheduled = false;
      if (disposed) {
        return;
      }
      const writes = collectThreadStatusRecords({
        appState: useStore.getState(),
        uiState: useUiStateStore.getState(),
        terminalState: useTerminalStateStore.getState(),
        previousSnapshots,
        trigger: pendingTrigger,
      });
      pendingTrigger = "app-store-change";
      if (writes.length === 0) {
        return;
      }
      pendingWrites.push(...writes);
      if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(() => {
          void flushWrites();
        });
      }
    };

    const scheduleEvaluate = (trigger: ThreadStatusDiagnosticTrigger) => {
      pendingTrigger = trigger;
      if (evaluateScheduled) {
        return;
      }
      evaluateScheduled = true;
      queueMicrotask(evaluate);
    };

    const unsubscribes = [
      useStore.subscribe(() => scheduleEvaluate("app-store-change")),
      useUiStateStore.subscribe(() => scheduleEvaluate("ui-store-change")),
      useTerminalStateStore.subscribe(() => scheduleEvaluate("terminal-store-change")),
    ];

    scheduleEvaluate("initial-evaluation");

    return () => {
      disposed = true;
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }, []);

  return null;
}

export {
  collectThreadStatusRecords,
  deriveThreadStatusDiagnosticSnapshot,
  summarizeActivity,
  summarizeMessage,
};
