import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { AUTH_PROVIDERS } from "@/domain/shared/enums";
import { check } from "drizzle-orm/pg-core";
import { citext, inSet, timestamps } from "./_shared";

/**
 * Identity tables. Column set is dictated by Better Auth (user/session/account/
 * verification) plus our additional user fields. Roles are NOT stored here; see
 * `role_assignment` in access.ts.
 */
export const appUser = pgTable(
  "app_user",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: citext().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // --- application fields ---
    isActive: boolean().notNull().default(true),
    mustChangePassword: boolean().notNull().default(false),
    authProvider: text().notNull().default("LOCAL"),
    lastLoginAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("app_user_is_active_idx").on(t.isActive),
    check("app_user_auth_provider_chk", inSet(t.authProvider, AUTH_PROVIDERS)),
  ],
);

export const authSession = pgTable(
  "auth_session",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps,
  },
  (t) => [index("auth_session_user_id_idx").on(t.userId)],
);

export const authAccount = pgTable(
  "auth_account",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index("auth_account_user_id_idx").on(t.userId)],
);

export const authVerification = pgTable(
  "auth_verification",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("auth_verification_identifier_idx").on(t.identifier)],
);

/** Better Auth rate-limit counters (storage: "database"). */
export const authRateLimit = pgTable("auth_rate_limit", {
  id: uuid().primaryKey().defaultRandom(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});
