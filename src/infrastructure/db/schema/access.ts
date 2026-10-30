import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ROLES, SCOPE_TYPES } from "@/domain/shared/enums";
import { appUser } from "./auth";
import { inSet } from "./_shared";

/**
 * Scoped role assignments: the single source of truth for authorisation.
 * Discipline Directors and Team Leads are rows here (scope DISCIPLINE / TEAM),
 * not separate tables. Revoked rows are kept for audit history.
 */
export const roleAssignment = pgTable(
  "role_assignment",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    role: text().notNull(),
    scopeType: text().notNull(),
    scopeId: uuid(),
    grantedBy: uuid().references(() => appUser.id),
    grantedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    revokedBy: uuid().references(() => appUser.id),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("role_assignment_user_idx").on(t.userId),
    index("role_assignment_scope_idx").on(t.role, t.scopeType, t.scopeId),
    uniqueIndex("role_assignment_active_uniq")
      .on(
        t.userId,
        t.role,
        t.scopeType,
        sql`coalesce(${t.scopeId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      )
      .where(sql`${t.revokedAt} is null`),
    check("role_assignment_role_chk", inSet(t.role, ROLES)),
    check("role_assignment_scope_type_chk", inSet(t.scopeType, SCOPE_TYPES)),
    check(
      "role_assignment_scope_id_chk",
      sql`(${t.scopeType} = 'GLOBAL' and ${t.scopeId} is null) or (${t.scopeType} <> 'GLOBAL' and ${t.scopeId} is not null)`,
    ),
  ],
);
