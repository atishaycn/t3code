import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatHeader } from "./ChatHeader";
import { SidebarProvider } from "../ui/sidebar";

function renderHeader(forkDisabled = false, forkDisabledReason = "Fork chat") {
  return renderToStaticMarkup(
    <SidebarProvider>
      <ChatHeader
        activeThreadEnvironmentId={"env-1" as never}
        activeThreadId={"thread-1" as never}
        activeThreadTitle="Fork me"
        activeProjectName={undefined}
        isGitRepo
        openInCwd={null}
        activeProjectScripts={undefined}
        preferredScriptId={null}
        keybindings={{} as never}
        availableEditors={[]}
        terminalAvailable
        terminalOpen={false}
        terminalToggleShortcutLabel={null}
        diffToggleShortcutLabel={null}
        gitCwd={null}
        diffOpen={false}
        forkDisabled={forkDisabled}
        forkDisabledReason={forkDisabledReason}
        onRunProjectScript={() => undefined}
        onAddProjectScript={async () => undefined}
        onUpdateProjectScript={async () => undefined}
        onDeleteProjectScript={async () => undefined}
        onForkChat={() => undefined}
        onToggleTerminal={() => undefined}
        onToggleDiff={() => undefined}
      />
    </SidebarProvider>,
  );
}

describe("ChatHeader fork action", () => {
  it("renders the fork control as a stateless button action", () => {
    const html = renderHeader();
    const forkButtonMarkup = html.match(/<button[^>]*aria-label="Fork chat"[^>]*>/)?.[0] ?? "";

    expect(html).toContain('data-slot="tooltip-trigger"');
    expect(forkButtonMarkup).not.toContain("aria-pressed");
  });

  it("surfaces the disabled reason inline and on the tooltip trigger wrapper", () => {
    const reason = "Wait for the current turn to finish before forking this chat.";
    const html = renderHeader(true, reason);
    const triggerWrapperMarkup = html.match(/<span[^>]*title="[^"]+"[^>]*>/)?.[0] ?? "";

    expect(html).toContain(reason);
    expect(triggerWrapperMarkup).toContain(`title="${reason}"`);
    expect(html).toContain('aria-describedby="fork-chat-disabled-reason"');
  });
});
