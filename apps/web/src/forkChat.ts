import { truncate } from "@t3tools/shared/String";
import type { UnifiedSettings } from "@t3tools/contracts/settings";
import type { ModelSelection, ProviderKind } from "@t3tools/contracts";
import type { Thread, ChatMessage } from "./types";

const FORK_CHAT_MAX_PROMPT_CHARS = 18_000;
const FORK_CHAT_MAX_PLAN_CHARS = 4_000;
const FORK_CHAT_MAX_MESSAGE_CHARS = 900;
const FORK_CHAT_TRANSCRIPT_HEAD_COUNT = 2;
const FORK_CHAT_TRANSCRIPT_TAIL_COUNT = 8;
const FORK_CHAT_PROMPT_PREFIX =
  "This thread is a fork of an earlier chat. Treat the compact handoff below as the carried-over context from the original thread.";
const FORK_CHAT_SUMMARY_MAX_CHARS = 6_000;

function compactWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clipForkSection(value: string, maxChars: number): string {
  const normalized = compactWhitespace(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${truncate(normalized, maxChars - 1).trimEnd()}…`;
}

function formatForkAttachmentSummary(message: ChatMessage): string {
  if (!message.attachments || message.attachments.length === 0) {
    return "";
  }

  const attachmentSummary = message.attachments
    .map((attachment) => {
      if (attachment.type === "image") {
        return `image:${attachment.name}`;
      }
      return attachment.type;
    })
    .join(", ");

  return `\n[attachments: ${attachmentSummary}]`;
}

function selectForkTranscriptMessages(messages: ReadonlyArray<ChatMessage>): ChatMessage[] {
  if (messages.length <= FORK_CHAT_TRANSCRIPT_HEAD_COUNT + FORK_CHAT_TRANSCRIPT_TAIL_COUNT + 1) {
    return [...messages];
  }

  return [
    ...messages.slice(0, FORK_CHAT_TRANSCRIPT_HEAD_COUNT),
    ...messages.slice(-FORK_CHAT_TRANSCRIPT_TAIL_COUNT),
  ];
}

function summarizeTranscriptMessages(messages: ReadonlyArray<ChatMessage>): string[] {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const attachmentNames = messages.flatMap((message) =>
    (message.attachments ?? []).map((attachment) => attachment.name),
  );

  return [
    ...(latestUserMessage
      ? [`- Current goal/request: ${clipForkSection(latestUserMessage.text, 240)}`]
      : []),
    ...(latestAssistantMessage
      ? [`- Latest known progress: ${clipForkSection(latestAssistantMessage.text, 280)}`]
      : []),
    ...(attachmentNames.length > 0
      ? [
          `- Referenced artifacts: ${attachmentNames.slice(0, 6).join(", ")}${attachmentNames.length > 6 ? ", …" : ""}`,
        ]
      : []),
  ];
}

function buildForkWorkspaceSummary(input: {
  thread: Pick<
    Thread,
    | "title"
    | "modelSelection"
    | "runtimeMode"
    | "interactionMode"
    | "branch"
    | "worktreePath"
    | "latestTurn"
    | "messages"
    | "proposedPlans"
  >;
  selectedMessages: ReadonlyArray<ChatMessage>;
  omittedMessageCount: number;
  latestPlan: Thread["proposedPlans"][number] | null;
}): string {
  const lines = [
    `- Thread focus: ${input.thread.title}`,
    ...summarizeTranscriptMessages(input.selectedMessages),
    ...(input.latestPlan
      ? [`- Current plan: ${clipForkSection(input.latestPlan.planMarkdown, 280)}`]
      : []),
    ...(input.thread.branch ? [`- Active branch: ${input.thread.branch}`] : []),
    ...(input.thread.worktreePath ? [`- Worktree path: ${input.thread.worktreePath}`] : []),
    ...(input.thread.latestTurn
      ? [
          `- Latest turn status: ${input.thread.latestTurn.state} (requested ${input.thread.latestTurn.requestedAt})`,
        ]
      : []),
    ...(input.omittedMessageCount > 0
      ? [
          `- Transcript compression note: ${input.omittedMessageCount} middle message${input.omittedMessageCount === 1 ? " was" : "s were"} omitted from the detailed excerpt below.`,
        ]
      : []),
  ];

  return clipForkSection(lines.join("\n"), 2_000);
}

function formatProviderSettingsSummary(input: {
  settings: UnifiedSettings;
  provider: ProviderKind;
  modelSelection: ModelSelection;
}): string[] {
  const lines = [
    `- Active provider: ${input.provider}`,
    `- Selected model: ${input.modelSelection.provider}/${input.modelSelection.model}`,
  ];

  if (input.modelSelection.options && Object.keys(input.modelSelection.options).length > 0) {
    lines.push(`- Model options: ${JSON.stringify(input.modelSelection.options)}`);
  }

  const addSharedProviderSettings = (providerSettings: {
    enabled: boolean;
    binaryPath: string;
    customModels: ReadonlyArray<string>;
    homePath?: string;
  }) => {
    lines.push(`- Provider enabled: ${providerSettings.enabled ? "yes" : "no"}`);

    if (providerSettings.binaryPath.trim().length > 0) {
      lines.push(`- Binary path: ${providerSettings.binaryPath}`);
    }

    if (providerSettings.homePath && providerSettings.homePath.trim().length > 0) {
      lines.push(`- Home path: ${providerSettings.homePath}`);
    }

    if (providerSettings.customModels.length > 0) {
      lines.push(`- Custom models: ${providerSettings.customModels.join(", ")}`);
    }
  };

  switch (input.provider) {
    case "codex": {
      addSharedProviderSettings(input.settings.providers.codex);
      break;
    }
    case "pi": {
      const providerSettings = input.settings.providers.pi;
      addSharedProviderSettings(providerSettings);
      lines.push(`- /autoreason enabled: ${providerSettings.enableAutoreason ? "yes" : "no"}`);
      lines.push(`- Full autonomy: ${providerSettings.fullAutonomy ? "yes" : "no"}`);
      break;
    }
    case "claudeAgent": {
      addSharedProviderSettings(input.settings.providers.claudeAgent);
      break;
    }
  }

  return lines;
}

export function buildForkChatThreadTitle(title: string): string {
  const normalized = title.trim();
  if (normalized.length === 0) {
    return "(fork) Chat";
  }

  const withoutExistingForkMarker = normalized.replace(/^\(fork\)\s*/i, "");
  return truncate(`(fork) ${withoutExistingForkMarker}`);
}

export function buildForkChatSummaryInstructions(
  thread: Pick<
    Thread,
    "title" | "branch" | "worktreePath" | "latestTurn" | "messages" | "proposedPlans"
  >,
): string {
  const latestPlan = thread.proposedPlans.at(-1) ?? null;
  const latestUserMessage = [...thread.messages]
    .reverse()
    .find((message) => message.role === "user");
  const latestAssistantMessage = [...thread.messages]
    .reverse()
    .find((message) => message.role === "assistant");

  return [
    "Create a concise fork handoff summary for this conversation.",
    "Focus on preserving the current objective, completed work, open questions, branch/worktree context, and the next best step.",
    "Do not restate the full transcript. Do not mention compaction. Write the result so it can be pasted directly into a new thread as carried-over context.",
    thread.title ? `Original thread title: ${thread.title}` : null,
    thread.branch ? `Current branch: ${thread.branch}` : null,
    thread.worktreePath ? `Current worktree: ${thread.worktreePath}` : null,
    thread.latestTurn
      ? `Latest turn state: ${thread.latestTurn.state} (requested ${thread.latestTurn.requestedAt})`
      : null,
    latestPlan ? `Latest proposed plan:\n${clipForkSection(latestPlan.planMarkdown, 1_200)}` : null,
    latestUserMessage
      ? `Latest user request:\n${clipForkSection(latestUserMessage.text, 1_000)}`
      : null,
    latestAssistantMessage
      ? `Latest assistant progress:\n${clipForkSection(latestAssistantMessage.text, 1_200)}`
      : null,
  ]
    .filter((line): line is string => Boolean(line && line.length > 0))
    .join("\n\n");
}

export function buildForkChatPrompt(
  thread: Pick<
    Thread,
    | "title"
    | "modelSelection"
    | "runtimeMode"
    | "interactionMode"
    | "branch"
    | "worktreePath"
    | "latestTurn"
    | "messages"
    | "proposedPlans"
  >,
  currentContext?: {
    settings: UnifiedSettings;
    selectedProvider: ProviderKind;
    selectedModelSelection: ModelSelection;
  },
  options?: {
    piSummary?: string | null;
  },
): string {
  const selectedMessages = selectForkTranscriptMessages(thread.messages);
  const omittedMessageCount = Math.max(0, thread.messages.length - selectedMessages.length);
  const latestPlan = thread.proposedPlans.at(-1) ?? null;

  const transcriptLines = selectedMessages.map((message, index) => {
    const prefix = `${index + 1}. ${message.role.toUpperCase()}: `;
    return `${prefix}${clipForkSection(message.text, FORK_CHAT_MAX_MESSAGE_CHARS)}${formatForkAttachmentSummary(message)}`;
  });

  if (omittedMessageCount > 0) {
    transcriptLines.splice(
      FORK_CHAT_TRANSCRIPT_HEAD_COUNT,
      0,
      `… omitted ${omittedMessageCount} middle message${omittedMessageCount === 1 ? "" : "s"} to keep this handoff compact …`,
    );
  }

  const workspaceSummary = options?.piSummary
    ? clipForkSection(options.piSummary, FORK_CHAT_SUMMARY_MAX_CHARS)
    : buildForkWorkspaceSummary({
        thread,
        selectedMessages,
        omittedMessageCount,
        latestPlan,
      });

  const metadataLines = [
    `- Original title: ${thread.title}`,
    `- Model: ${thread.modelSelection.provider}/${thread.modelSelection.model}`,
    `- Runtime mode: ${thread.runtimeMode}`,
    `- Interaction mode: ${thread.interactionMode}`,
    ...(thread.branch ? [`- Branch: ${thread.branch}`] : []),
    ...(thread.worktreePath ? [`- Worktree: ${thread.worktreePath}`] : []),
    ...(thread.latestTurn
      ? [`- Latest turn: ${thread.latestTurn.state} (requested ${thread.latestTurn.requestedAt})`]
      : []),
  ];

  const sections = [
    FORK_CHAT_PROMPT_PREFIX,
    "",
    "Please use this context to continue the work without redoing already completed steps. If the handoff is missing something important, say exactly what is missing.",
    "",
    "The summary below is the fork handoff. Treat it as the current workspace summary for the new thread.",
    "",
    "## Workspace summary",
    workspaceSummary,
    options?.piSummary ? "" : null,
    "",
    "## Original thread metadata",
    metadataLines.join("\n"),
    currentContext
      ? [
          "",
          "## Current provider settings for this fork",
          formatProviderSettingsSummary({
            settings: currentContext.settings,
            provider: currentContext.selectedProvider,
            modelSelection: currentContext.selectedModelSelection,
          }).join("\n"),
        ].join("\n")
      : "",
    latestPlan
      ? [
          "",
          "## Latest proposed plan",
          clipForkSection(latestPlan.planMarkdown, FORK_CHAT_MAX_PLAN_CHARS),
        ].join("\n")
      : "",
    "",
    "## Conversation transcript excerpt",
    transcriptLines.length > 0
      ? transcriptLines.join("\n\n")
      : "(No messages were present in the original thread.)",
  ].filter((section): section is string => Boolean(section && section.length > 0));

  return clipForkSection(sections.join("\n"), FORK_CHAT_MAX_PROMPT_CHARS);
}
