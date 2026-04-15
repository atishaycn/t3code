import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as Effect from "effect/Effect";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const columns = yield* sql<{ name: string }>`PRAGMA table_info(projection_threads)`;
  const hasIsPinnedColumn = columns.some((column) => column.name === "is_pinned");

  if (!hasIsPinnedColumn) {
    yield* sql`
      ALTER TABLE projection_threads
      ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0
    `;
  }
});
