import { describe, expect, it } from "vitest";

import { shouldPiTurnCompletionStayOpen } from "./piTurnCompletion";

describe("shouldPiTurnCompletionStayOpen", () => {
  it("does not keep completed turns open for compaction lifecycle events", () => {
    expect(
      shouldPiTurnCompletionStayOpen({
        type: "compaction_start",
        reason: "threshold",
      }),
    ).toBe(false);

    expect(
      shouldPiTurnCompletionStayOpen({
        type: "compaction_end",
        reason: "threshold",
      }),
    ).toBe(false);
  });

  it("keeps completed turns open for late tool activity", () => {
    expect(
      shouldPiTurnCompletionStayOpen({
        type: "tool_execution_update",
        toolCallId: "tool-1",
        toolName: "bash",
      }),
    ).toBe(true);
  });
});
