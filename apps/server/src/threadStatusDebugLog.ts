import fs from "node:fs/promises";
import path from "node:path";

import {
  type ServerAppendThreadStatusLogInput,
  type ThreadStatusDiagnosticRecord,
  ThreadStatusDiagnosticRecord as ThreadStatusDiagnosticRecordSchema,
  type ThreadId,
} from "@t3tools/contracts";
import { Data, Effect, Schema } from "effect";

import { toSafeThreadAttachmentSegment } from "./attachmentStore";

const THREAD_STATUS_LOG_DIRNAME = "thread-status";

class ThreadStatusDebugLogError extends Data.TaggedError("ThreadStatusDebugLogError")<{
  message: string;
  cause?: unknown;
}> {}

export function resolveThreadStatusLogPath(logsDir: string, threadId: ThreadId): string {
  const threadSegment = toSafeThreadAttachmentSegment(threadId) ?? "unknown-thread";
  return path.join(logsDir, THREAD_STATUS_LOG_DIRNAME, `${threadSegment}.ndjson`);
}

export const appendThreadStatusDebugLog = Effect.fn("appendThreadStatusDebugLog")(
  function* (input: {
    readonly logsDir: string;
    readonly payload: ServerAppendThreadStatusLogInput;
  }) {
    const normalizedRecord = input.payload.recordJson.trim();
    if (normalizedRecord.length === 0) {
      throw new ThreadStatusDebugLogError({
        message: "Thread status log record must not be empty.",
      });
    }

    const decodeRecord = Schema.decodeUnknownSync(ThreadStatusDiagnosticRecordSchema);
    const record = yield* Effect.try({
      try: () => decodeRecord(JSON.parse(normalizedRecord)) as ThreadStatusDiagnosticRecord,
      catch: (cause) =>
        new ThreadStatusDebugLogError({
          message: "Thread status log record is not valid JSON.",
          cause,
        }),
    });

    if (record.threadId !== input.payload.threadId) {
      throw new ThreadStatusDebugLogError({
        message: "Thread status log record threadId does not match request threadId.",
      });
    }

    const filePath = resolveThreadStatusLogPath(input.logsDir, input.payload.threadId);
    yield* Effect.tryPromise({
      try: async () => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.appendFile(filePath, `${normalizedRecord}\n`, "utf8");
      },
      catch: (cause) =>
        new ThreadStatusDebugLogError({
          message: "Failed to append thread status log record.",
          cause,
        }),
    });
    return { path: filePath };
  },
);
