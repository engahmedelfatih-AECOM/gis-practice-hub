import { sql, type SQL } from "drizzle-orm";
import { customType, integer, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

/** Case-insensitive text (PostgreSQL `citext` extension). Used for e-mail addresses. */
export const citext = customType<{ data: string }>({
  dataType: () => "citext",
});

/** `created_at` / `updated_at` pair used by every business table. */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Optimistic-locking counter. Incremented by the application on every update. */
export const versionColumn = {
  version: integer().notNull().default(1),
};

export const uuidPrimaryKey = () => uuid().primaryKey().defaultRandom();

/** Build `col IN ('A','B',…)` for CHECK constraints from a closed set of string constants. */
export function inSet(column: AnyPgColumn, values: readonly string[]): SQL {
  const list = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
  return sql`${column} in (${sql.raw(list)})`;
}
