import { Effect, Schema } from "effect";
import { ExecutionEnvironmentDescriptor } from "./environment";
import { ServerAuthDescriptor } from "./auth";
import {
  IsoDateTime,
  MessageId,
  NonNegativeInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas";
import { KeybindingRule, ResolvedKeybindingsConfig } from "./keybindings";
import { EditorId } from "./editor";
import { ModelCapabilities } from "./model";
import { ProviderKind } from "./orchestration";
import { ServerSettings } from "./settings";

const KeybindingsMalformedConfigIssue = Schema.Struct({
  kind: Schema.Literal("keybindings.malformed-config"),
  message: TrimmedNonEmptyString,
});

const KeybindingsInvalidEntryIssue = Schema.Struct({
  kind: Schema.Literal("keybindings.invalid-entry"),
  message: TrimmedNonEmptyString,
  index: Schema.Number,
});

export const ServerConfigIssue = Schema.Union([
  KeybindingsMalformedConfigIssue,
  KeybindingsInvalidEntryIssue,
]);
export type ServerConfigIssue = typeof ServerConfigIssue.Type;

const ServerConfigIssues = Schema.Array(ServerConfigIssue);

export const ServerProviderState = Schema.Literals(["ready", "warning", "error", "disabled"]);
export type ServerProviderState = typeof ServerProviderState.Type;

export const ServerProviderAuthStatus = Schema.Literals([
  "authenticated",
  "unauthenticated",
  "unknown",
]);
export type ServerProviderAuthStatus = typeof ServerProviderAuthStatus.Type;

export const ServerProviderAuth = Schema.Struct({
  status: ServerProviderAuthStatus,
  type: Schema.optional(TrimmedNonEmptyString),
  label: Schema.optional(TrimmedNonEmptyString),
});
export type ServerProviderAuth = typeof ServerProviderAuth.Type;

export const ServerProviderModel = Schema.Struct({
  slug: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString,
  isCustom: Schema.Boolean,
  capabilities: Schema.NullOr(ModelCapabilities),
});
export type ServerProviderModel = typeof ServerProviderModel.Type;

export const ServerProviderSlashCommandInput = Schema.Struct({
  hint: TrimmedNonEmptyString,
});
export type ServerProviderSlashCommandInput = typeof ServerProviderSlashCommandInput.Type;

export const ServerProviderSlashCommand = Schema.Struct({
  name: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
  input: Schema.optional(ServerProviderSlashCommandInput),
});
export type ServerProviderSlashCommand = typeof ServerProviderSlashCommand.Type;

export const ServerProviderSkill = Schema.Struct({
  name: TrimmedNonEmptyString,
  description: Schema.optional(TrimmedNonEmptyString),
  path: TrimmedNonEmptyString,
  scope: Schema.optional(TrimmedNonEmptyString),
  enabled: Schema.Boolean,
  displayName: Schema.optional(TrimmedNonEmptyString),
  shortDescription: Schema.optional(TrimmedNonEmptyString),
});
export type ServerProviderSkill = typeof ServerProviderSkill.Type;

export const ServerProviderExtension = Schema.Struct({
  name: TrimmedNonEmptyString,
  path: TrimmedNonEmptyString,
  source: Schema.Literals(["user", "project", "path", "package"]),
});
export type ServerProviderExtension = typeof ServerProviderExtension.Type;

export const ServerProvider = Schema.Struct({
  provider: ProviderKind,
  enabled: Schema.Boolean,
  installed: Schema.Boolean,
  version: Schema.NullOr(TrimmedNonEmptyString),
  status: ServerProviderState,
  auth: ServerProviderAuth,
  checkedAt: IsoDateTime,
  message: Schema.optional(TrimmedNonEmptyString),
  models: Schema.Array(ServerProviderModel),
  slashCommands: Schema.Array(ServerProviderSlashCommand).pipe(
    Schema.withDecodingDefault(Effect.succeed([])),
  ),
  skills: Schema.Array(ServerProviderSkill).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  extensions: Schema.optional(Schema.Array(ServerProviderExtension)),
});
export type ServerProvider = typeof ServerProvider.Type;

export const ServerProviders = Schema.Array(ServerProvider);
export type ServerProviders = typeof ServerProviders.Type;

export const ServerObservability = Schema.Struct({
  logsDirectoryPath: TrimmedNonEmptyString,
  localTracingEnabled: Schema.Boolean,
  otlpTracesUrl: Schema.optional(TrimmedNonEmptyString),
  otlpTracesEnabled: Schema.Boolean,
  otlpMetricsUrl: Schema.optional(TrimmedNonEmptyString),
  otlpMetricsEnabled: Schema.Boolean,
});
export type ServerObservability = typeof ServerObservability.Type;

export const PiQueueMode = Schema.Literals(["all", "one-at-a-time"]);
export type PiQueueMode = typeof PiQueueMode.Type;

export const ServerPiRuntimeModel = Schema.Struct({
  provider: TrimmedNonEmptyString,
  id: TrimmedNonEmptyString,
  contextWindow: Schema.optional(NonNegativeInt),
  reasoning: Schema.optional(Schema.Boolean),
});
export type ServerPiRuntimeModel = typeof ServerPiRuntimeModel.Type;

export const ServerPiThreadRuntimeState = Schema.Struct({
  model: Schema.NullOr(ServerPiRuntimeModel),
  thinkingLevel: TrimmedNonEmptyString,
  isStreaming: Schema.Boolean,
  isCompacting: Schema.Boolean,
  steeringMode: PiQueueMode,
  followUpMode: PiQueueMode,
  sessionFile: Schema.optional(TrimmedNonEmptyString),
  sessionId: TrimmedNonEmptyString,
  sessionName: Schema.optional(TrimmedNonEmptyString),
  autoCompactionEnabled: Schema.Boolean,
  messageCount: NonNegativeInt,
  pendingMessageCount: NonNegativeInt,
});
export type ServerPiThreadRuntimeState = typeof ServerPiThreadRuntimeState.Type;

export const ServerPiSessionStats = Schema.Struct({
  sessionFile: Schema.optional(TrimmedNonEmptyString),
  sessionId: TrimmedNonEmptyString,
  userMessages: NonNegativeInt,
  assistantMessages: NonNegativeInt,
  toolCalls: NonNegativeInt,
  toolResults: NonNegativeInt,
  totalMessages: NonNegativeInt,
  tokens: Schema.Struct({
    input: NonNegativeInt,
    output: NonNegativeInt,
    cacheRead: NonNegativeInt,
    cacheWrite: NonNegativeInt,
    total: NonNegativeInt,
  }),
  cost: Schema.Number,
  contextUsage: Schema.optional(
    Schema.Struct({
      tokens: Schema.NullOr(NonNegativeInt),
      contextWindow: NonNegativeInt,
      percent: Schema.NullOr(Schema.Number),
    }),
  ),
});
export type ServerPiSessionStats = typeof ServerPiSessionStats.Type;

export const ServerGetPiThreadRuntimeInput = Schema.Struct({
  threadId: ThreadId,
});
export type ServerGetPiThreadRuntimeInput = typeof ServerGetPiThreadRuntimeInput.Type;

export const ServerGetPiThreadRuntimeResult = Schema.Struct({
  state: ServerPiThreadRuntimeState,
  stats: Schema.optional(ServerPiSessionStats),
});
export type ServerGetPiThreadRuntimeResult = typeof ServerGetPiThreadRuntimeResult.Type;

export const ServerUpdatePiThreadRuntimeInput = Schema.Struct({
  threadId: ThreadId,
  steeringMode: Schema.optional(PiQueueMode),
  followUpMode: Schema.optional(PiQueueMode),
  autoCompactionEnabled: Schema.optional(Schema.Boolean),
  sessionName: Schema.optional(Schema.NullOr(TrimmedNonEmptyString)),
});
export type ServerUpdatePiThreadRuntimeInput = typeof ServerUpdatePiThreadRuntimeInput.Type;

export const ServerUpdatePiThreadRuntimeResult = Schema.Struct({
  state: ServerPiThreadRuntimeState,
});
export type ServerUpdatePiThreadRuntimeResult = typeof ServerUpdatePiThreadRuntimeResult.Type;

export const ServerCompactPiThreadInput = Schema.Struct({
  threadId: ThreadId,
  customInstructions: Schema.optional(TrimmedNonEmptyString),
});
export type ServerCompactPiThreadInput = typeof ServerCompactPiThreadInput.Type;

export const ServerCompactPiThreadResult = Schema.Struct({
  summary: Schema.optional(TrimmedNonEmptyString),
});
export type ServerCompactPiThreadResult = typeof ServerCompactPiThreadResult.Type;

export const ServerSendPiThreadPromptInput = Schema.Struct({
  threadId: ThreadId,
  messageId: MessageId,
  message: TrimmedNonEmptyString,
  streamingBehavior: Schema.Literals(["steer", "followUp"]),
  createdAt: IsoDateTime,
});
export type ServerSendPiThreadPromptInput = typeof ServerSendPiThreadPromptInput.Type;

export const ServerSendPiThreadPromptResult = Schema.Struct({});
export type ServerSendPiThreadPromptResult = typeof ServerSendPiThreadPromptResult.Type;

export class ServerPiThreadRuntimeError extends Schema.TaggedErrorClass<ServerPiThreadRuntimeError>()(
  "ServerPiThreadRuntimeError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const ThreadStatusDiagnosticArea = Schema.Literals([
  "sidebar",
  "thread-list",
  "thread-view",
]);
export type ThreadStatusDiagnosticArea = typeof ThreadStatusDiagnosticArea.Type;

export const ThreadStatusDiagnosticTrigger = Schema.Literals([
  "initial-evaluation",
  "app-store-change",
  "ui-store-change",
  "terminal-store-change",
]);
export type ThreadStatusDiagnosticTrigger = typeof ThreadStatusDiagnosticTrigger.Type;

export const ThreadStatusLabel = Schema.Literals([
  "Working",
  "Connecting",
  "Completed",
  "Pending Approval",
  "Awaiting Input",
  "Plan Ready",
]);
export type ThreadStatusLabel = typeof ThreadStatusLabel.Type;

export const ThreadStatusReason = Schema.Literals([
  "actively-running",
  "session-connecting",
  "pending-approval",
  "pending-user-input",
  "plan-ready",
  "unseen-completion",
  "idle",
]);
export type ThreadStatusReason = typeof ThreadStatusReason.Type;

export const ThreadStatusDiagnosticMessageSummary = Schema.Struct({
  id: Schema.NullOr(TrimmedNonEmptyString),
  role: Schema.NullOr(TrimmedNonEmptyString),
  createdAt: Schema.NullOr(IsoDateTime),
  textPreview: Schema.NullOr(Schema.String),
  hasImages: Schema.Boolean,
});
export type ThreadStatusDiagnosticMessageSummary = typeof ThreadStatusDiagnosticMessageSummary.Type;

export const ThreadStatusDiagnosticActivitySummary = Schema.Struct({
  id: Schema.NullOr(TrimmedNonEmptyString),
  type: TrimmedNonEmptyString,
  createdAt: Schema.NullOr(IsoDateTime),
  state: Schema.optional(Schema.NullOr(TrimmedNonEmptyString)),
  title: Schema.optional(Schema.NullOr(TrimmedNonEmptyString)),
});
export type ThreadStatusDiagnosticActivitySummary =
  typeof ThreadStatusDiagnosticActivitySummary.Type;

export const ThreadStatusDiagnosticRecord = Schema.Struct({
  version: Schema.Literal(1),
  recordedAt: IsoDateTime,
  threadId: ThreadId,
  source: Schema.Struct({
    area: ThreadStatusDiagnosticArea,
    trigger: ThreadStatusDiagnosticTrigger,
  }),
  transition: Schema.Struct({
    changed: Schema.Boolean,
    previousLabel: Schema.NullOr(ThreadStatusLabel),
    nextLabel: Schema.NullOr(ThreadStatusLabel),
    previousReason: Schema.NullOr(ThreadStatusReason),
    nextReason: ThreadStatusReason,
  }),
  derived: Schema.Struct({
    label: Schema.NullOr(ThreadStatusLabel),
    reason: ThreadStatusReason,
    isRunningTurn: Schema.Boolean,
    isLatestTurnSettled: Schema.Boolean,
    hasPendingApproval: Schema.Boolean,
    hasPendingUserInput: Schema.Boolean,
    hasManualCompletionOverride: Schema.Boolean,
    hasActiveTerminal: Schema.Boolean,
    hasRecentRuntimeActivity: Schema.Boolean,
    hasUnseenCompletion: Schema.Boolean,
  }),
  latestTurn: Schema.Struct({
    id: Schema.NullOr(TrimmedNonEmptyString),
    state: Schema.NullOr(TrimmedNonEmptyString),
    startedAt: Schema.NullOr(IsoDateTime),
    completedAt: Schema.NullOr(IsoDateTime),
    providerSessionId: Schema.NullOr(TrimmedNonEmptyString),
    providerTurnId: Schema.NullOr(TrimmedNonEmptyString),
  }),
  latestSession: Schema.Struct({
    id: Schema.NullOr(TrimmedNonEmptyString),
    state: Schema.NullOr(TrimmedNonEmptyString),
    provider: Schema.NullOr(TrimmedNonEmptyString),
    model: Schema.NullOr(TrimmedNonEmptyString),
    updatedAt: Schema.NullOr(IsoDateTime),
  }),
  inputs: Schema.Struct({
    pendingApproval: Schema.NullOr(
      Schema.Struct({
        kind: TrimmedNonEmptyString,
        id: Schema.NullOr(TrimmedNonEmptyString),
        createdAt: Schema.NullOr(IsoDateTime),
        source: Schema.NullOr(TrimmedNonEmptyString),
      }),
    ),
    pendingUserInput: Schema.NullOr(
      Schema.Struct({
        kind: TrimmedNonEmptyString,
        id: Schema.NullOr(TrimmedNonEmptyString),
        createdAt: Schema.NullOr(IsoDateTime),
      }),
    ),
    manualCompletion: Schema.Struct({
      overridden: Schema.Boolean,
      completedAt: Schema.NullOr(IsoDateTime),
      lastVisitedAt: Schema.NullOr(IsoDateTime),
    }),
    terminal: Schema.Struct({
      activeCount: NonNegativeInt,
      lastActivityAt: Schema.NullOr(IsoDateTime),
    }),
    activities: Schema.Struct({
      totalCount: NonNegativeInt,
      recent: Schema.Array(ThreadStatusDiagnosticActivitySummary),
    }),
    messages: Schema.Struct({
      totalCount: NonNegativeInt,
      previous: Schema.NullOr(ThreadStatusDiagnosticMessageSummary),
      anchor: Schema.NullOr(ThreadStatusDiagnosticMessageSummary),
      next: Schema.NullOr(ThreadStatusDiagnosticMessageSummary),
    }),
  }),
  decisionContext: Schema.Struct({
    selectedThreadId: Schema.NullOr(ThreadId),
    visibleThreadId: Schema.NullOr(ThreadId),
    environmentId: Schema.NullOr(TrimmedNonEmptyString),
  }),
});
export type ThreadStatusDiagnosticRecord = typeof ThreadStatusDiagnosticRecord.Type;

export const ServerAppendThreadStatusLogInput = Schema.Struct({
  threadId: ThreadId,
  recordJson: TrimmedNonEmptyString,
});
export type ServerAppendThreadStatusLogInput = typeof ServerAppendThreadStatusLogInput.Type;

export class ServerThreadStatusLogError extends Schema.TaggedErrorClass<ServerThreadStatusLogError>()(
  "ServerThreadStatusLogError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const ServerConfig = Schema.Struct({
  environment: ExecutionEnvironmentDescriptor,
  auth: ServerAuthDescriptor,
  cwd: TrimmedNonEmptyString,
  keybindingsConfigPath: TrimmedNonEmptyString,
  keybindings: ResolvedKeybindingsConfig,
  issues: ServerConfigIssues,
  providers: ServerProviders,
  availableEditors: Schema.Array(EditorId),
  observability: ServerObservability,
  settings: ServerSettings,
});
export type ServerConfig = typeof ServerConfig.Type;

export const ServerUpsertKeybindingInput = KeybindingRule;
export type ServerUpsertKeybindingInput = typeof ServerUpsertKeybindingInput.Type;

export const ServerUpsertKeybindingResult = Schema.Struct({
  keybindings: ResolvedKeybindingsConfig,
  issues: ServerConfigIssues,
});
export type ServerUpsertKeybindingResult = typeof ServerUpsertKeybindingResult.Type;

export const ServerConfigUpdatedPayload = Schema.Struct({
  issues: ServerConfigIssues,
  providers: ServerProviders,
  settings: Schema.optional(ServerSettings),
});
export type ServerConfigUpdatedPayload = typeof ServerConfigUpdatedPayload.Type;

export const ServerConfigKeybindingsUpdatedPayload = Schema.Struct({
  issues: ServerConfigIssues,
});
export type ServerConfigKeybindingsUpdatedPayload =
  typeof ServerConfigKeybindingsUpdatedPayload.Type;

export const ServerConfigProviderStatusesPayload = Schema.Struct({
  providers: ServerProviders,
});
export type ServerConfigProviderStatusesPayload = typeof ServerConfigProviderStatusesPayload.Type;

export const ServerConfigSettingsUpdatedPayload = Schema.Struct({
  settings: ServerSettings,
});
export type ServerConfigSettingsUpdatedPayload = typeof ServerConfigSettingsUpdatedPayload.Type;

export const ServerConfigStreamSnapshotEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("snapshot"),
  config: ServerConfig,
});
export type ServerConfigStreamSnapshotEvent = typeof ServerConfigStreamSnapshotEvent.Type;

export const ServerConfigStreamKeybindingsUpdatedEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("keybindingsUpdated"),
  payload: ServerConfigKeybindingsUpdatedPayload,
});
export type ServerConfigStreamKeybindingsUpdatedEvent =
  typeof ServerConfigStreamKeybindingsUpdatedEvent.Type;

export const ServerConfigStreamProviderStatusesEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("providerStatuses"),
  payload: ServerConfigProviderStatusesPayload,
});
export type ServerConfigStreamProviderStatusesEvent =
  typeof ServerConfigStreamProviderStatusesEvent.Type;

export const ServerConfigStreamSettingsUpdatedEvent = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("settingsUpdated"),
  payload: ServerConfigSettingsUpdatedPayload,
});
export type ServerConfigStreamSettingsUpdatedEvent =
  typeof ServerConfigStreamSettingsUpdatedEvent.Type;

export const ServerConfigStreamEvent = Schema.Union([
  ServerConfigStreamSnapshotEvent,
  ServerConfigStreamKeybindingsUpdatedEvent,
  ServerConfigStreamProviderStatusesEvent,
  ServerConfigStreamSettingsUpdatedEvent,
]);
export type ServerConfigStreamEvent = typeof ServerConfigStreamEvent.Type;

export const ServerLifecycleReadyPayload = Schema.Struct({
  at: IsoDateTime,
  environment: ExecutionEnvironmentDescriptor,
});
export type ServerLifecycleReadyPayload = typeof ServerLifecycleReadyPayload.Type;

export const ServerLifecycleWelcomePayload = Schema.Struct({
  environment: ExecutionEnvironmentDescriptor,
  cwd: TrimmedNonEmptyString,
  projectName: TrimmedNonEmptyString,
  bootstrapProjectId: Schema.optional(ProjectId),
  bootstrapThreadId: Schema.optional(ThreadId),
});
export type ServerLifecycleWelcomePayload = typeof ServerLifecycleWelcomePayload.Type;

export const ServerLifecycleStreamWelcomeEvent = Schema.Struct({
  version: Schema.Literal(1),
  sequence: NonNegativeInt,
  type: Schema.Literal("welcome"),
  payload: ServerLifecycleWelcomePayload,
});
export type ServerLifecycleStreamWelcomeEvent = typeof ServerLifecycleStreamWelcomeEvent.Type;

export const ServerLifecycleStreamReadyEvent = Schema.Struct({
  version: Schema.Literal(1),
  sequence: NonNegativeInt,
  type: Schema.Literal("ready"),
  payload: ServerLifecycleReadyPayload,
});
export type ServerLifecycleStreamReadyEvent = typeof ServerLifecycleStreamReadyEvent.Type;

export const ServerLifecycleStreamEvent = Schema.Union([
  ServerLifecycleStreamWelcomeEvent,
  ServerLifecycleStreamReadyEvent,
]);
export type ServerLifecycleStreamEvent = typeof ServerLifecycleStreamEvent.Type;

export const ServerProviderUpdatedPayload = Schema.Struct({
  providers: ServerProviders,
});
export type ServerProviderUpdatedPayload = typeof ServerProviderUpdatedPayload.Type;
