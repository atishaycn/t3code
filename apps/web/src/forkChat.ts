import { truncate } from "@t3tools/shared/String";
import type { Thread, ChatMessage } from "./types";

const FORK_CHAT_MAX_PROMPT_CHARS = 18_000;
const FORK_CHAT_MAX_PLAN_CHARS = 4_000;
const FORK_CHAT_MAX_MESSAGE_CHARS = 900;
const FORK_CHAT_TRANSCRIPT_HEAD_COUNT = 2;
const FORK_CHAT_TRANSCRIPT_TAIL_COUNT = 8;

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

export function buildForkChatThreadTitle(title: string): string {
  const normalized = title.trim();
  if (normalized.length === 0) {
    return "Fork chat";
  }
  return truncate(
    normalized.toLowerCase().endsWith("(fork)") ? normalized : `${normalized} (fork)`,
  );
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
    "This thread is a fork of an earlier chat. Treat the compact handoff below as the carried-over context from the original thread.",
    "",
    "Please use this context to continue the work without redoing already completed steps. If the handoff is missing something important, say exactly what is missing.",
    "",
    "Do not start new work yet. First, briefly acknowledge that you have the forked context and are ready for the next instruction.",
    "",
    "## Original thread metadata",
    metadataLines.join("\n"),
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
  ].filter((section) => section.length > 0);

  return clipForkSection(sections.join("\n"), FORK_CHAT_MAX_PROMPT_CHARS);
}
