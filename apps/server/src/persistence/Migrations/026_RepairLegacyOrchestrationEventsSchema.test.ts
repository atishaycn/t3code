import { assert, it } from "@effect/vitest";
import { CommandId, EventId, ProjectId } from "@t3tools/contracts";
import { Effect, Layer, Stream } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import { OrchestrationEventStore } from "../Services/OrchestrationEventStore.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";
import { OrchestrationEventStoreLive } from "../Layers/OrchestrationEventStore.ts";

const layer = it.layer(
  OrchestrationEventStoreLive.pipe(Layer.provideMerge(NodeSqliteClient.layerMemory())),
);

layer("026_RepairLegacyOrchestrationEventsSchema", (it) => {
  it.effect(
    "upgrades legacy orchestration_events schema and preserves append/replay behavior",
    () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const eventStore = yield* OrchestrationEventStore;
        const now = "2026-01-01T00:00:00.000Z";

        yield* sql`
        CREATE TABLE orchestration_events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT NOT NULL UNIQUE,
          event_type TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          occurred_at TEXT NOT NULL,
          command_id TEXT,
          payload_json TEXT NOT NULL
        )
      `;

        yield* sql`
        INSERT INTO orchestration_events (
          event_id,
          event_type,
          aggregate_type,
          aggregate_id,
          occurred_at,
          command_id,
          payload_json
        )
        VALUES (
          'evt-legacy-project-created',
          'project.created',
          'project',
          'project-legacy',
          ${now},
          'cmd-legacy-project-created',
          '{"projectId":"project-legacy","title":"Legacy Project","workspaceRoot":"/tmp/legacy","defaultModelSelection":null,"scripts":[],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}'
        )
      `;

        yield* sql`
        CREATE TABLE effect_sql_migrations (
          migration_id INTEGER PRIMARY KEY NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          name VARCHAR(255) NOT NULL
        )
      `;
        for (let migrationId = 1; migrationId <= 25; migrationId += 1) {
          yield* sql`
          INSERT INTO effect_sql_migrations (migration_id, name)
          VALUES (${migrationId}, ${`migration-${migrationId}`})
        `;
        }

        yield* runMigrations({ toMigrationInclusive: 26 });

        const columns = yield* sql<{
          readonly name: string;
        }>`PRAGMA table_info(orchestration_events)`;
        assert.ok(columns.some((column) => column.name === "aggregate_kind"));
        assert.ok(columns.some((column) => column.name === "stream_id"));
        assert.ok(columns.some((column) => column.name === "metadata_json"));

        const migratedRows = yield* sql<{
          readonly aggregateKind: string;
          readonly streamId: string;
          readonly streamVersion: number;
          readonly correlationId: string | null;
          readonly actorKind: string;
          readonly metadataJson: string;
        }>`
        SELECT
          aggregate_kind AS "aggregateKind",
          stream_id AS "streamId",
          stream_version AS "streamVersion",
          correlation_id AS "correlationId",
          actor_kind AS "actorKind",
          metadata_json AS "metadataJson"
        FROM orchestration_events
        WHERE event_id = 'evt-legacy-project-created'
      `;
        assert.equal(migratedRows[0]?.aggregateKind, "project");
        assert.equal(migratedRows[0]?.streamId, "project-legacy");
        assert.equal(migratedRows[0]?.streamVersion, 0);
        assert.equal(migratedRows[0]?.correlationId, "cmd-legacy-project-created");
        assert.equal(migratedRows[0]?.actorKind, "client");
        assert.equal(migratedRows[0]?.metadataJson, "{}");

        const appended = yield* eventStore.append({
          type: "project.meta-updated",
          eventId: EventId.make("evt-post-migration-append"),
          aggregateKind: "project",
          aggregateId: ProjectId.make("project-legacy"),
          occurredAt: now,
          commandId: CommandId.make("cmd-post-migration-append"),
          causationEventId: EventId.make("evt-legacy-project-created"),
          correlationId: CommandId.make("cmd-post-migration-append"),
          metadata: {},
          payload: {
            projectId: ProjectId.make("project-legacy"),
            title: "Legacy Project v2",
            workspaceRoot: "/tmp/legacy",
            defaultModelSelection: null,
            scripts: [],
            updatedAt: now,
          },
        });

        assert.equal(appended.sequence, 2);

        const replayed = yield* Stream.runCollect(eventStore.readAll()).pipe(
          Effect.map((chunk) => Array.from(chunk)),
        );
        assert.equal(replayed.length, 2);
        assert.equal(replayed[0]?.eventId, EventId.make("evt-legacy-project-created"));
        assert.equal(replayed[1]?.eventId, EventId.make("evt-post-migration-append"));

        const appendedRow = yield* sql<{ readonly streamVersion: number }>`
        SELECT stream_version AS "streamVersion"
        FROM orchestration_events
        WHERE event_id = ${appended.eventId}
      `;
        assert.equal(appendedRow[0]?.streamVersion, 1);
      }),
  );
});
