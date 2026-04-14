import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ServerProvider } from "./server";

const decodeServerProvider = Schema.decodeUnknownSync(ServerProvider);

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
});
