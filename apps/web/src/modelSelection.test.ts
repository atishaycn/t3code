import { describe, expect, it } from "vitest";
import type { ServerProvider } from "@t3tools/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";

import { getCustomModelOptionsByProvider } from "./modelSelection";

const PROVIDERS: ReadonlyArray<ServerProvider> = [
  {
    provider: "codex",
    enabled: true,
    installed: true,
    version: "1.0.0",
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-04-14T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
  },
  {
    provider: "pi",
    enabled: true,
    installed: true,
    version: "0.66.1",
    status: "ready",
    auth: { status: "unknown", label: "Managed by pi" },
    checkedAt: "2026-04-14T00:00:00.000Z",
    models: [
      {
        slug: "default",
        name: "Default (pi)",
        isCustom: false,
        capabilities: null,
      },
    ],
    slashCommands: [],
    skills: [],
  },
  {
    provider: "claudeAgent",
    enabled: true,
    installed: true,
    version: "1.0.0",
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-04-14T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
  },
];

describe("getCustomModelOptionsByProvider", () => {
  it("includes pi custom models alongside discovered pi models", () => {
    const settings = {
      ...DEFAULT_UNIFIED_SETTINGS,
      providers: {
        ...DEFAULT_UNIFIED_SETTINGS.providers,
        pi: {
          ...DEFAULT_UNIFIED_SETTINGS.providers.pi,
          customModels: ["openai/gpt-5"],
        },
      },
    };

    const options = getCustomModelOptionsByProvider(settings, PROVIDERS, "pi", "openai/gpt-5");

    expect(options.pi.map((option) => option.slug)).toEqual(["default", "openai/gpt-5"]);
  });
});
