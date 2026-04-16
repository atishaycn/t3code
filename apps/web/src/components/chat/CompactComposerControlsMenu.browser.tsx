import {
  DEFAULT_MODEL_BY_PROVIDER,
  EnvironmentId,
  ModelSelection,
  ThreadId,
} from "@t3tools/contracts";
import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import "../../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { CompactComposerControlsMenu } from "./CompactComposerControlsMenu";
import { TraitsMenuContent } from "./TraitsPicker";
import { useComposerDraftStore } from "../../composerDraftStore";

const LOCAL_ENVIRONMENT_ID = EnvironmentId.make("environment-local");

async function mountMenu(props?: { modelSelection?: ModelSelection; prompt?: string }) {
  const threadId = ThreadId.make("thread-compact-menu");
  const threadRef = scopeThreadRef(LOCAL_ENVIRONMENT_ID, threadId);
  const threadKey = scopedThreadKey(threadRef);
  const provider = props?.modelSelection?.provider ?? "claudeAgent";
  const model = props?.modelSelection?.model ?? DEFAULT_MODEL_BY_PROVIDER[provider];

  useComposerDraftStore.setState({
    draftsByThreadKey: {
      [threadKey]: {
        prompt: props?.prompt ?? "",
        images: [],
        nonPersistedImageIds: [],
        persistedAttachments: [],
        terminalContexts: [],
        modelSelectionByProvider: {
          [provider]: {
            provider,
            model,
            ...(props?.modelSelection?.options ? { options: props.modelSelection.options } : {}),
          },
        },
        activeProvider: provider,
        runtimeMode: null,
        interactionMode: null,
      },
    },
    draftThreadsByThreadKey: {},
    logicalProjectDraftThreadKeyByLogicalProjectKey: {},
  });
  const host = document.createElement("div");
  document.body.append(host);
  const onPromptChange = vi.fn();
  const providerOptions = props?.modelSelection?.options;
  const models =
    provider === "claudeAgent"
      ? [
          {
            slug: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            isCustom: false,
            capabilities: {
              reasoningEffortLevels: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High", isDefault: true },
                { value: "max", label: "Max" },
                { value: "ultrathink", label: "Ultrathink" },
              ],
              supportsFastMode: true,
              supportsThinkingToggle: false,
              contextWindowOptions: [],
              promptInjectedEffortLevels: ["ultrathink"],
            },
          },
          {
            slug: "claude-haiku-4-5",
            name: "Claude Haiku 4.5",
            isCustom: false,
            capabilities: {
              reasoningEffortLevels: [],
              supportsFastMode: false,
              supportsThinkingToggle: true,
              contextWindowOptions: [],
              promptInjectedEffortLevels: [],
            },
          },
          {
            slug: "claude-sonnet-4-6",
            name: "Claude Sonnet 4.6",
            isCustom: false,
            capabilities: {
              reasoningEffortLevels: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High", isDefault: true },
                { value: "ultrathink", label: "Ultrathink" },
              ],
              supportsFastMode: false,
              supportsThinkingToggle: false,
              contextWindowOptions: [],
              promptInjectedEffortLevels: ["ultrathink"],
            },
          },
        ]
      : [
          {
            slug: "gpt-5.4",
            name: "GPT-5.4",
            isCustom: false,
            capabilities: {
              reasoningEffortLevels: [
                { value: "xhigh", label: "Extra High" },
                { value: "high", label: "High", isDefault: true },
              ],
              supportsFastMode: true,
              supportsThinkingToggle: false,
              contextWindowOptions: [],
              promptInjectedEffortLevels: [],
            },
          },
        ];
  const screen = await render(
    <CompactComposerControlsMenu
      activePlan={false}
      interactionMode="default"
      showInteractionModeControls={true}
      planSidebarLabel="Plan"
      planSidebarOpen={false}
      runtimeMode="approval-required"
      traitsMenuContent={
        <TraitsMenuContent
          provider={provider}
          models={models}
          threadRef={threadRef}
          model={model}
          prompt={props?.prompt ?? ""}
          modelOptions={providerOptions}
          onPromptChange={onPromptChange}
        />
      }
      onToggleInteractionMode={vi.fn()}
      onTogglePlanSidebar={vi.fn()}
      onRuntimeModeChange={vi.fn()}
    />,
    { container: host },
  );

  const cleanup = async () => {
    await screen.unmount();
    host.remove();
  };

  return {
    [Symbol.asyncDispose]: cleanup,
    cleanup,
  };
}

describe("CompactComposerControlsMenu", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    useComposerDraftStore.setState({
      draftsByThreadKey: {},
      draftThreadsByThreadKey: {},
      logicalProjectDraftThreadKeyByLogicalProjectKey: {},
      stickyModelSelectionByProvider: {},
    });
  });

  it("shows fast mode controls for Opus", async () => {
    await using _ = await mountMenu({
      modelSelection: { provider: "claudeAgent", model: "claude-opus-4-6" },
    });

    await page.getByLabelText("More composer controls").click();

    await vi.waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("Fast Mode");
      expect(text).toContain("off");
      expect(text).toContain("on");
    });
  });

  it("hides fast mode controls for non-Opus Claude models", async () => {
    await using _ = await mountMenu({
      modelSelection: { provider: "claudeAgent", model: "claude-sonnet-4-6" },
    });

    await page.getByLabelText("More composer controls").click();

    await vi.waitFor(() => {
      expect(document.body.textContent ?? "").not.toContain("Fast Mode");
    });
  });

  it("shows Pi runtime controls when provided", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const screen = await render(
      <CompactComposerControlsMenu
        activePlan={false}
        interactionMode="default"
        showInteractionModeControls={false}
        planSidebarLabel="Plan"
        planSidebarOpen={false}
        runtimeMode="approval-required"
        piRuntime={{
          steeringMode: "one-at-a-time",
          followUpMode: "all",
          autoCompactionEnabled: true,
          sessionStatsLabel: "12 msgs · 1,200 tok · 2 queued",
          onSteeringModeChange: vi.fn(),
          onFollowUpModeChange: vi.fn(),
          onAutoCompactionChange: vi.fn(),
          onCompactNow: vi.fn(),
        }}
        onToggleInteractionMode={vi.fn()}
        onTogglePlanSidebar={vi.fn()}
        onRuntimeModeChange={vi.fn()}
      />,
      { container: host },
    );

    await page.getByLabelText("More composer controls").click();

    await vi.waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("Pi runtime");
      expect(text).toContain("Steering queue");
      expect(text).toContain("Follow-up queue");
      expect(text).toContain("Disable auto-compaction");
      expect(text).toContain("Compact now");
      expect(text).not.toContain("Mode");
      expect(text).not.toContain("Chat");
      expect(text).not.toContain("Plan");
    });

    await screen.unmount();
    host.remove();
  });

  it("shows only the provided effort options", async () => {
    await using _ = await mountMenu({
      modelSelection: { provider: "claudeAgent", model: "claude-sonnet-4-6" },
    });

    await page.getByLabelText("More composer controls").click();

    await vi.waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("Low");
      expect(text).toContain("Medium");
      expect(text).toContain("High");
      expect(text).not.toContain("Max");
      expect(text).toContain("Ultrathink");
    });
  });

  it("shows a Claude thinking on/off section for Haiku", async () => {
    await using _ = await mountMenu({
      modelSelection: {
        provider: "claudeAgent",
        model: "claude-haiku-4-5",
        options: { thinking: true },
      },
    });

    await page.getByLabelText("More composer controls").click();

    await vi.waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("Thinking");
      expect(text).toContain("On (default)");
      expect(text).toContain("Off");
    });
  });

  it("shows prompt-controlled Ultrathink state with selectable effort controls", async () => {
    await using _ = await mountMenu({
      modelSelection: {
        provider: "claudeAgent",
        model: "claude-opus-4-6",
        options: { effort: "high" },
      },
      prompt: "Ultrathink:\nInvestigate this",
    });

    await page.getByLabelText("More composer controls").click();

    await vi.waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain("Effort");
      expect(text).not.toContain("ultrathink");
    });
  });

  it("warns when ultrathink appears in prompt body text", async () => {
    await using _ = await mountMenu({
      modelSelection: {
        provider: "claudeAgent",
        model: "claude-opus-4-6",
        options: { effort: "high" },
      },
      prompt: "Ultrathink:\nplease ultrathink about this problem",
    });

    await page.getByLabelText("More composer controls").click();

    await vi.waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toContain(
        'Your prompt contains "ultrathink" in the text. Remove it to change effort.',
      );
    });
  });
});
