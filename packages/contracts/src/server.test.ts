import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  ServerGetPiThreadRuntimeResult,
  ServerProvider,
  ServerUpdatePiThreadRuntimeInput,
} from "./server";

const decodeServerProvider = Schema.decodeUnknownSync(ServerProvider);
const decodeServerGetPiThreadRuntimeResult = Schema.decodeUnknownSync(
  ServerGetPiThreadRuntimeResult,
);
const decodeServerUpdatePiThreadRuntimeInput = Schema.decodeUnknownSync(
  ServerUpdatePiThreadRuntimeInput,
);

describe("ServerProvider", () => {
  it("defaults capability arrays when decoding legacy snapshots", () => {
    const parsed = decodeServerProvider({
      provider: "codex",
      enabled: true,
      installed: true,
      version: "1.0.0",
      status: "ready",
      auth: {
        status: "authenticated",
      },
      checkedAt: "2026-04-10T00:00:00.000Z",
      models: [],
    });

    expect(parsed.slashCommands).toEqual([]);
    expect(parsed.skills).toEqual([]);
  });

  it("accepts pi providers", () => {
    const parsed = decodeServerProvider({
      provider: "pi",
      enabled: true,
      installed: true,
      version: "0.66.1",
      status: "ready",
      auth: {
        status: "unknown",
        label: "Managed by pi",
      },
      checkedAt: "2026-04-14T00:00:00.000Z",
      message: "Using /Users/test/Developer/pi-mono/pi-test.sh as the pi RPC launcher.",
      models: [
        {
          slug: "default",
          name: "Default (pi)",
          isCustom: false,
          capabilities: null,
        },
      ],
    });

    expect(parsed.provider).toBe("pi");
    expect(parsed.models[0]?.slug).toBe("default");
  });

  it("decodes Pi thread runtime payloads", () => {
    const parsed = decodeServerGetPiThreadRuntimeResult({
      state: {
        model: {
          provider: "openai",
          id: "gpt-5",
          contextWindow: 200000,
          reasoning: true,
        },
        thinkingLevel: "medium",
        isStreaming: true,
        isCompacting: false,
        steeringMode: "one-at-a-time",
        followUpMode: "all",
        sessionId: "pi-session-1",
        autoCompactionEnabled: true,
        messageCount: 12,
        pendingMessageCount: 2,
      },
      stats: {
        sessionId: "pi-session-1",
        userMessages: 3,
        assistantMessages: 4,
        toolCalls: 2,
        toolResults: 2,
        totalMessages: 11,
        tokens: {
          input: 100,
          output: 200,
          cacheRead: 10,
          cacheWrite: 20,
          total: 330,
        },
        cost: 0.12,
      },
    });

    expect(parsed.state.followUpMode).toBe("all");
    expect(parsed.stats?.tokens.total).toBe(330);
  });

  it("decodes Pi thread runtime updates", () => {
    const parsed = decodeServerUpdatePiThreadRuntimeInput({
      threadId: "thread-123",
      steeringMode: "all",
      autoCompactionEnabled: false,
    });

    expect(parsed.steeringMode).toBe("all");
    expect(parsed.autoCompactionEnabled).toBe(false);
  });
});
