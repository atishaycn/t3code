import type { MessageId, TurnId } from "@t3tools/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import { describe, expect, it } from "vitest";

import {
  buildForkChatPrompt,
  buildForkChatSummaryInstructions,
  buildForkChatThreadTitle,
} from "./forkChat";

const asMessageId = (value: string) => value as MessageId;
const asTurnId = (value: string) => value as TurnId;

describe("buildForkChatThreadTitle", () => {
  it("adds a fork prefix once", () => {
    expect(buildForkChatThreadTitle("Debug sidebar layout")).toBe("(fork) Debug sidebar layout");
    expect(buildForkChatThreadTitle("(fork) Debug sidebar layout")).toBe(
      "(fork) Debug sidebar layout",
    );
  });
});

describe("buildForkChatSummaryInstructions", () => {
  it("builds Pi compaction instructions tailored for a fork handoff", () => {
    const instructions = buildForkChatSummaryInstructions({
      title: "Debug sidebar layout",
      branch: "feature/sidebar",
      worktreePath: "/tmp/sidebar-worktree",
      latestTurn: {
        turnId: asTurnId("turn-2"),
        state: "completed",
        requestedAt: "2026-04-13T10:00:00.000Z",
        startedAt: "2026-04-13T10:00:01.000Z",
        completedAt: "2026-04-13T10:01:00.000Z",
        assistantMessageId: asMessageId("assistant-2"),
      },
      proposedPlans: [
        {
          id: "plan-1",
          turnId: asTurnId("turn-2"),
          planMarkdown: "# Fix sidebar\n\n- tighten spacing\n- add a hover state",
          implementedAt: null,
          implementationThreadId: null,
          createdAt: "2026-04-13T10:00:30.000Z",
          updatedAt: "2026-04-13T10:00:30.000Z",
        },
      ],
      messages: [
        {
          id: asMessageId("msg-1"),
          role: "user",
          text: "Can you debug the sidebar layout drift?",
          createdAt: "2026-04-13T09:58:00.000Z",
          streaming: false,
        },
        {
          id: asMessageId("msg-2"),
          role: "assistant",
          text: "Yes — I found a flex regression in the header row.",
          createdAt: "2026-04-13T09:59:00.000Z",
          streaming: false,
        },
      ],
    });

    expect(instructions).toContain("Create a concise fork handoff summary for this conversation.");
    expect(instructions).toContain("Original thread title: Debug sidebar layout");
    expect(instructions).toContain("Current branch: feature/sidebar");
    expect(instructions).toContain("Latest proposed plan:");
    expect(instructions).toContain("Latest user request:");
    expect(instructions).toContain("Latest assistant progress:");
  });
});

describe("buildForkChatPrompt", () => {
  it("includes a generated workspace summary, metadata, plans, and a compact transcript handoff", () => {
    const prompt = buildForkChatPrompt({
      title: "Debug sidebar layout",
      modelSelection: {
        provider: "codex",
        model: "gpt-5",
      },
      runtimeMode: "full-access",
      interactionMode: "default",
      branch: "feature/sidebar",
      worktreePath: "/tmp/sidebar-worktree",
      latestTurn: {
        turnId: asTurnId("turn-2"),
        state: "completed",
        requestedAt: "2026-04-13T10:00:00.000Z",
        startedAt: "2026-04-13T10:00:01.000Z",
        completedAt: "2026-04-13T10:01:00.000Z",
        assistantMessageId: asMessageId("assistant-2"),
      },
      proposedPlans: [
        {
          id: "plan-1",
          turnId: asTurnId("turn-2"),
          planMarkdown: "# Fix sidebar\n\n- tighten spacing\n- add a hover state",
          implementedAt: null,
          implementationThreadId: null,
          createdAt: "2026-04-13T10:00:30.000Z",
          updatedAt: "2026-04-13T10:00:30.000Z",
        },
      ],
      messages: [
        {
          id: asMessageId("msg-1"),
          role: "user",
          text: "Can you debug the sidebar layout drift?",
          createdAt: "2026-04-13T09:58:00.000Z",
          streaming: false,
          attachments: [
            {
              type: "image",
              id: "img-1",
              name: "sidebar.png",
              mimeType: "image/png",
              sizeBytes: 123,
            },
          ],
        },
        {
          id: asMessageId("msg-2"),
          role: "assistant",
          text: "Yes — I found a flex regression in the header row.",
          createdAt: "2026-04-13T09:59:00.000Z",
          streaming: false,
        },
      ],
    });

    expect(prompt).toContain("This thread is a fork of an earlier chat.");
    expect(prompt).toContain("## Workspace summary");
    expect(prompt).toContain("- Thread focus: Debug sidebar layout");
    expect(prompt).toContain("- Current goal/request: Can you debug the sidebar layout drift?");
    expect(prompt).toContain(
      "- Latest known progress: Yes — I found a flex regression in the header row.",
    );
    expect(prompt).toContain("- Referenced artifacts: sidebar.png");
    expect(prompt).toContain("## Original thread metadata");
    expect(prompt).toContain("- Model: codex/gpt-5");
    expect(prompt).toContain("- Branch: feature/sidebar");
    expect(prompt).toContain("## Latest proposed plan");
    expect(prompt).toContain("# Fix sidebar");
    expect(prompt).toContain("1. USER: Can you debug the sidebar layout drift?");
    expect(prompt).toContain("[attachments: image:sidebar.png]");
    expect(prompt).toContain("2. ASSISTANT: Yes — I found a flex regression in the header row.");
    expect(prompt).toContain(
      "The summary below is the fork handoff. Treat it as the current workspace summary for the new thread.",
    );
  });

  it("prefers an existing assistant workspace summary when present", () => {
    const prompt = buildForkChatPrompt({
      title: "Debug sidebar layout",
      modelSelection: {
        provider: "codex",
        model: "gpt-5",
      },
      runtimeMode: "full-access",
      interactionMode: "default",
      branch: "feature/sidebar",
      worktreePath: "/tmp/sidebar-worktree",
      latestTurn: null,
      proposedPlans: [],
      messages: [
        {
          id: asMessageId("msg-1"),
          role: "user",
          text: "Can you debug the sidebar layout drift?",
          createdAt: "2026-04-13T09:58:00.000Z",
          streaming: false,
        },
        {
          id: asMessageId("msg-2"),
          role: "assistant",
          text: "## Quick workspace understanding from a manual scan\n\n- app shell lives in apps/web\n- fork flow is wired in ChatView.tsx\n- risk is message ordering during navigation",
          createdAt: "2026-04-13T09:59:00.000Z",
          streaming: false,
        },
      ],
    });

    expect(prompt).toContain("## Workspace summary");
    expect(prompt).toContain("## Quick workspace understanding from a manual scan");
    expect(prompt).toContain("- app shell lives in apps/web");
    expect(prompt).not.toContain("- Thread focus: Debug sidebar layout");
  });

  it("includes the current provider settings summary when available", () => {
    const prompt = buildForkChatPrompt(
      {
        title: "Debug sidebar layout",
        modelSelection: {
          provider: "codex",
          model: "gpt-5",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        latestTurn: null,
        proposedPlans: [],
        messages: [],
      },
      {
        settings: {
          ...DEFAULT_UNIFIED_SETTINGS,
          providers: {
            ...DEFAULT_UNIFIED_SETTINGS.providers,
            pi: {
              ...DEFAULT_UNIFIED_SETTINGS.providers.pi,
              homePath: "/tmp/pi-home",
              enableAutoreason: true,
              fullAutonomy: true,
              customModels: ["openai/gpt-5"],
            },
          },
        },
        selectedProvider: "pi",
        selectedModelSelection: {
          provider: "pi",
          model: "openai/gpt-5",
          options: {
            reasoningEffort: "high",
          },
        },
      },
    );

    expect(prompt).toContain("## Current provider settings for this fork");
    expect(prompt).toContain("- Active provider: pi");
    expect(prompt).toContain("- Selected model: pi/openai/gpt-5");
    expect(prompt).toContain('- Model options: {"reasoningEffort":"high"}');
    expect(prompt).toContain("- Home path: /tmp/pi-home");
    expect(prompt).toContain("- /autoreason enabled: yes");
    expect(prompt).toContain("- Full autonomy: yes");
    expect(prompt).toContain("- Custom models: openai/gpt-5");
  });

  it("prefers a Pi-generated summary when one is provided", () => {
    const prompt = buildForkChatPrompt(
      {
        title: "Debug sidebar layout",
        modelSelection: {
          provider: "pi",
          model: "openai/gpt-5",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: "feature/sidebar",
        worktreePath: "/tmp/sidebar-worktree",
        latestTurn: null,
        proposedPlans: [],
        messages: [
          {
            id: asMessageId("msg-1"),
            role: "user",
            text: "Can you debug the sidebar layout drift?",
            createdAt: "2026-04-13T09:58:00.000Z",
            streaming: false,
          },
        ],
      },
      undefined,
      {
        piSummary:
          "Keep the flex header fix. The remaining work is to verify sidebar spacing in the worktree and ship the hover-state polish.",
      },
    );

    expect(prompt).toContain(
      "Keep the flex header fix. The remaining work is to verify sidebar spacing in the worktree and ship the hover-state polish.",
    );
    expect(prompt).not.toContain("- Thread focus: Debug sidebar layout");
  });

  it("omits middle transcript messages when the thread is long", () => {
    const prompt = buildForkChatPrompt({
      title: "Long thread",
      modelSelection: {
        provider: "codex",
        model: "gpt-5",
      },
      runtimeMode: "full-access",
      interactionMode: "default",
      branch: null,
      worktreePath: null,
      latestTurn: null,
      proposedPlans: [],
      messages: Array.from({ length: 16 }, (_, index) => ({
        id: asMessageId(`msg-${index + 1}`),
        role: index % 2 === 0 ? "user" : "assistant",
        text: `message ${index + 1}`,
        createdAt: `2026-04-13T10:${String(index).padStart(2, "0")}:00.000Z`,
        streaming: false,
      })),
    });

    expect(prompt).toContain("omitted 6 middle messages");
    expect(prompt).toContain(
      "- Transcript compression note: 6 middle messages were omitted from the detailed excerpt below.",
    );
    expect(prompt).toContain("1. USER: message 1");
    expect(prompt).toContain("10. ASSISTANT: message 16");
  });
});
