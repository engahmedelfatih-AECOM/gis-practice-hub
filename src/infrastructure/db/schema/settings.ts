import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { appUser } from "./auth";

/** Key/value configuration maintained by Administrators (see domain/settings). */
export const appSetting = pgTable("app_setting", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedBy: uuid().references(() => appUser.id),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** API keys for machine access to the read-only JSON feed. Only the SHA-256 hash is stored. */
export const apiKey = pgTable(
  "api_key",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    prefix: text().notNull(),
    keyHash: text().notNull(),
    scopes: text()
      .array()
      .notNull()
      .default(sql`'{hub:read}'::text[]`),
    createdBy: uuid()
      .notNull()
      .references(() => appUser.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    revokedBy: uuid().references(() => appUser.id),
  },
  (t) => [uniqueIndex("api_key_hash_uq").on(t.keyHash), index("api_key_prefix_idx").on(t.prefix)],
);
