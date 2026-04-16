import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const columns = yield* sql<{ readonly name: string }>`PRAGMA table_info(orchestration_events)`;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columnNames.size === 0) {
    return;
  }

  const hasCurrentSchema =
    columnNames.has("aggregate_kind") &&
    columnNames.has("stream_id") &&
    columnNames.has("stream_version") &&
    columnNames.has("causation_event_id") &&
    columnNames.has("correlation_id") &&
    columnNames.has("actor_kind") &&
    columnNames.has("metadata_json");

  if (hasCurrentSchema) {
    return;
  }

  const hasLegacySchema =
    columnNames.has("aggregate_type") &&
    columnNames.has("aggregate_id") &&
    !columnNames.has("aggregate_kind");

  if (!hasLegacySchema) {
    return;
  }

  yield* sql`ALTER TABLE orchestration_events RENAME TO orchestration_events_legacy`;

  yield* sql`
    CREATE TABLE orchestration_events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      aggregate_kind TEXT NOT NULL,
      stream_id TEXT NOT NULL,
      stream_version INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      command_id TEXT,
      causation_event_id TEXT,
      correlation_id TEXT,
      actor_kind TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    )
  `;

  yield* sql`
    INSERT INTO orchestration_events (
      sequence,
      event_id,
      aggregate_kind,
      stream_id,
      stream_version,
      event_type,
      occurred_at,
      command_id,
      causation_event_id,
      correlation_id,
      actor_kind,
      payload_json,
      metadata_json
    )
    SELECT
      legacy.sequence,
      legacy.event_id,
      legacy.aggregate_type,
      legacy.aggregate_id,
      ROW_NUMBER() OVER (
        PARTITION BY legacy.aggregate_type, legacy.aggregate_id
        ORDER BY legacy.sequence ASC
      ) - 1,
      legacy.event_type,
      legacy.occurred_at,
      legacy.command_id,
      NULL,
      legacy.command_id,
      CASE
        WHEN legacy.command_id IS NULL THEN 'server'
        WHEN legacy.command_id LIKE 'provider:%' THEN 'provider'
        WHEN legacy.command_id LIKE 'server:%' THEN 'server'
        ELSE 'client'
      END,
      legacy.payload_json,
      '{}'
    FROM orchestration_events_legacy AS legacy
    ORDER BY legacy.sequence ASC
  `;

  yield* sql`DROP TABLE orchestration_events_legacy`;

  yield* sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orch_events_stream_version
    ON orchestration_events(aggregate_kind, stream_id, stream_version)
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_orch_events_stream_sequence
    ON orchestration_events(aggregate_kind, stream_id, sequence)
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_orch_events_command_id
    ON orchestration_events(command_id)
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_orch_events_correlation_id
    ON orchestration_events(correlation_id)
  `;
});
