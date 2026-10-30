import { index, inet, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUser } from "./auth";

/**
 * Append-only technical audit trail. A database trigger (see migration
 * 0001_constraints) rejects UPDATE and DELETE on this table.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid().references(() => appUser.id),
    actorIp: inet(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid(),
    before: jsonb(),
    after: jsonb(),
    correlationId: uuid(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorUserId, t.occurredAt),
    index("audit_log_occurred_idx").on(t.occurredAt),
  ],
);
