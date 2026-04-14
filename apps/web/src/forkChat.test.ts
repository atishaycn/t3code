import type { MessageId, TurnId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { buildForkChatPrompt, buildForkChatThreadTitle } from "./forkChat";

const asMessageId = (value: string) => value as MessageId;
const asTurnId = (value: string) => value as TurnId;

describe("buildForkChatThreadTitle", () => {
  it("adds a fork suffix once", () => {
    expect(buildForkChatThreadTitle("Debug sidebar layout")).toBe("Debug sidebar layout (fork)");
    expect(buildForkChatThreadTitle("Debug sidebar layout (fork)")).toBe(
      "Debug sidebar layout (fork)",
    );
  });
});

describe("buildForkChatPrompt", () => {
  it("includes metadata, plans, and a compact transcript handoff", () => {
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
    expect(prompt).toContain("## Original thread metadata");
    expect(prompt).toContain("- Model: codex/gpt-5");
    expect(prompt).toContain("- Branch: feature/sidebar");
    expect(prompt).toContain("## Latest proposed plan");
    expect(prompt).toContain("# Fix sidebar");
    expect(prompt).toContain("1. USER: Can you debug the sidebar layout drift?");
    expect(prompt).toContain("[attachments: image:sidebar.png]");
    expect(prompt).toContain("2. ASSISTANT: Yes — I found a flex regression in the header row.");
    expect(prompt).toContain("Do not start new work yet.");
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
    expect(prompt).toContain("1. USER: message 1");
    expect(prompt).toContain("10. ASSISTANT: message 16");
  });
});
