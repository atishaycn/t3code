export type AgentStatus =
  | "idle"
  | "planning"
  | "running"
  | "waiting"
  | "verifying"
  | "completed"
  | "blocked"
  | "failed"
  | "interrupted";

export interface ProjectRecord {
  id: string;
  name: string;
  path: string;
  rootThreadId: string | null;
  currentRunId: string | null;
}

export interface AgentRecord {
  threadId: string;
  parentThreadId: string | null;
  name: string;
  role: string;
  status: AgentStatus;
  model: string | null;
  currentTurnId: string | null;
  runId: string | null;
  lastMessage: string;
  activity: string;
  updatedAt: string;
}

export interface QueuedMessageRecord {
  id: string;
  receiver: string;
  content: string;
  status: string;
  createdAt: string;
}

export interface EventRecord {
  id: number;
  kind: string;
  threadId: string | null;
  summary: string;
  createdAt: string;
}

export interface ApprovalRecord {
  id: string;
  method: string;
  threadId: string | null;
  reason: string;
  command: string | null;
  createdAt: string;
}

export interface ArtifactRecord {
  id: number;
  threadId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface PlanItemRecord {
  id: string;
  runId: string;
  title: string;
  status: AgentStatus | "pending";
  detail: string | null;
  position: number;
  updatedAt: string;
}
export interface ReviewSummaryRecord {
  id: string;
  runId: string | null;
  status: string;
  summary: string;
  files: unknown[];
  checks: unknown[];
  createdAt: string;
}
export interface InboxRecord {
  id: string;
  kind: "approval" | "question" | "failure" | "finding";
  severity: "high" | "medium" | "low";
  state: "open" | "resolved" | "dismissed";
  title: string;
  summary: string;
  source: string;
  sourceRole: string | null;
  createdAt: string;
}
export interface AutomationDefinitionRecord {
  id: string;
  name: string;
  description: string;
  heartbeat: string;
  status: "enabled" | "paused" | "running" | "failed";
  nextRun: string | null;
  lastRun: string | null;
  createdAt: string;
}
export interface AutomationRunRecord {
  id: string;
  automationId: string;
  startedAt: string;
  finishedAt: string | null;
  status: "completed" | "running" | "failed";
  summary: string | null;
}
export interface ArtifactFileRecord {
  id: string;
  artifactId: number;
  name: string;
  size: string | null;
  kind: string | null;
}
export interface ArtifactEvidenceRecord {
  id: string;
  artifactId: number;
  label: string;
  value: string;
  status: "verified" | "pending" | "failed";
}
export interface TaskMetadataRecord {
  threadId: string;
  pinned: boolean;
  archived: boolean;
  updatedAt: string;
}

export type WriterLeaseState = "reserved" | "active" | "released" | "failed";

export interface WriterLeaseRecord {
  id: string;
  projectId: string;
  runId: string;
  taskId: string;
  agentThreadId: string;
  worktreePath: string;
  ownedPaths: string[];
  state: WriterLeaseState;
  createdAt: string;
  releasedAt: string | null;
}

export type AgentTaskStatus =
  | "ready"
  | "active"
  | "needs-input"
  | "failed"
  | "completed"
  | "cancelled";

export interface AgentTaskRecord {
  taskId: string;
  projectId: string;
  runId: string;
  parentTaskId: string | null;
  parentThreadId: string | null;
  childThreadId: string | null;
  role: string;
  objective: string;
  contract: TaskContractRecord | null;
  model: string | null;
  reasoningEffort: string | null;
  permissionProfile: string | null;
  status: AgentTaskStatus;
  latestActivity: string;
  resultSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskContractRecord {
  objective: string;
  contextPointers: string[];
  ownedPaths: string[];
  prohibitedPaths: string[];
  dependencies: string[];
  expectedDeliverable: string;
  acceptanceChecks: string[];
  parentReportingRoute: string;
}

export interface TaskClassificationRecord {
  id: string;
  projectId: string;
  runId: string | null;
  threadId: string;
  messageText: string;
  classification: "root-executable" | "delegate-required";
  rationale: string;
  signals: string[];
  createdAt: string;
}

export interface OperationalMetricsRecord {
  rootImplementationTurns: number;
  childImplementationTurns: number;
  delegatedTaskCount: number;
  childSuccessCount: number;
  childRetryCount: number;
  writerLeaseCount: number;
  recoveryEvents: number;
  memoryProposalAccepted: number;
  memoryProposalRejected: number;
}

export interface CompletionGateRecord {
  runId: string;
  implementerResult: boolean;
  filesInspected: boolean;
  targetedChecksPassed: boolean;
  reviewerCompleted: boolean;
  findingsResolved: boolean;
  broadCheckPassed: boolean;
  artifactPersisted: boolean;
  ready: boolean;
}

export interface ReasoningEffortOption {
  reasoningEffort: string;
  description: string;
}

export interface ModelOption {
  id: string;
  model: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: ReasoningEffortOption[];
}

export interface KnowledgeReleaseRecord {
  id: string;
  digest: string;
  status: "draft" | "active" | "previous" | "superseded";
  entryCount: number;
  createdAt: string;
  activatedAt: string | null;
}

export interface RunPinRecord {
  id: string;
  threadId: string;
  releaseId: string;
  manifestDigest: string;
  model: string;
  effort: string;
  createdAt: string;
}

export interface KnowledgeCandidateRecord {
  id: string;
  title: string;
  status: "pending" | "evaluated" | "approved" | "rejected" | "promoted";
  risk: "low" | "medium" | "high";
  baseReleaseId: string;
  patch: string;
  verdict: "pending" | "pass" | "fail";
  score: number | null;
  createdAt: string;
}

export interface MemoryAutomationRecord {
  enabled: boolean;
  intervalMessages: number;
  completedMessages: number;
  lastTriggerMessage: number;
  activeThreadId: string | null;
}

export interface DoctorReportRecord {
  id: string;
  triggerMessage: number;
  threadId: string | null;
  status: string;
  findings: unknown[];
  createdAt: string;
}

export interface CodexThreadSummary {
  id: string;
  projectPath: string;
  name: string;
  preview: string;
  status: string;
  modelProvider: string;
  updatedAt: string;
  parentThreadId: string | null;
}

export interface CodexProjectSummary {
  path: string;
  name: string;
  threads: CodexThreadSummary[];
}

export interface ProjectSnapshot {
  project: ProjectRecord;
  runtime: {
    connected: boolean;
    engine: "pi" | "codex";
    version: string;
    error: string | null;
  };
  agents: AgentRecord[];
  events: EventRecord[];
  approvals: ApprovalRecord[];
  queuedMessages: QueuedMessageRecord[];
  output: ArtifactRecord | null;
  plan?: PlanItemRecord[];
  review?: ReviewSummaryRecord | null;
  inbox?: InboxRecord[];
  automations?: AutomationDefinitionRecord[];
  automationRuns?: AutomationRunRecord[];
  artifactFiles?: ArtifactFileRecord[];
  artifactEvidence?: ArtifactEvidenceRecord[];
  taskMetadata?: TaskMetadataRecord[];
  agentTasks?: AgentTaskRecord[];
  writerLeases?: WriterLeaseRecord[];
  taskClassifications?: TaskClassificationRecord[];
  operationalMetrics?: OperationalMetricsRecord;
  completionGate?: CompletionGateRecord | null;
  knowledge: {
    documents: number;
    skills: number;
    proposals: number;
    activeRelease: KnowledgeReleaseRecord | null;
    releases: KnowledgeReleaseRecord[];
    pins: RunPinRecord[];
    evidenceCount: number;
    candidates: KnowledgeCandidateRecord[];
    automation: MemoryAutomationRecord;
    doctorReports: DoctorReportRecord[];
    graph: { nodes: unknown[]; edges: unknown[]; brokenLinks: unknown[] };
  };
}

export type StreamEnvelope =
  | { type: "snapshot"; data: ProjectSnapshot }
  | {
      type: "delta";
      threadId: string;
      delta: string;
    }
  | { type: "runtime-error"; message: string };
