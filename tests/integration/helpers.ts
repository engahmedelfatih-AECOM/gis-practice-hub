import { eq, sql } from "drizzle-orm";
import { SEED_LISTS } from "@/domain/hub/seed-lists";
import { LIST_KEY_VALUES } from "@/domain/shared/enums";
import { db } from "@/infrastructure/db/client";
import * as schema from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import type { Role, ScopeType } from "@/domain/shared/enums";

/** Truncate every business table (keeps the migrations journal). */
export async function resetDb(): Promise<void> {
  // audit_log refuses TRUNCATE unless gh.allow_truncate is on for the transaction (migration 0002).
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('gh.allow_truncate', 'on', true)`);
    await tx.execute(sql`
    TRUNCATE TABLE
      import_run, client_domain, client_subtype, client_field, client_feature_class, client_schema,
      workflow_step, enterprise_app, innovation_item, standard_item, qaqc_checklist, rfi, risk,
      update_item, resource_row, schema_feature, package, project, report_period, list_item,
      api_key, app_setting, audit_log,
      role_assignment, auth_session, auth_account, auth_verification, auth_rate_limit, app_user
    RESTART IDENTITY CASCADE`);
  });
}

export interface Grant {
  role: Role;
  scopeType?: ScopeType;
  scopeId?: string | null;
}

/** Insert a user row and build an Actor with the given grants (no HTTP session needed). */
export async function makeActor(grants: Grant[], opts: { email?: string } = {}): Promise<Actor> {
  const email = opts.email ?? `user-${crypto.randomUUID()}@example.com`;
  const [user] = await db
    .insert(schema.appUser)
    .values({ email, name: email.split("@")[0]! })
    .returning();
  const roles = grants.map((g) => ({
    role: g.role,
    scopeType: g.scopeType ?? (g.scopeId ? "REGION" : "GLOBAL"),
    scopeId: g.scopeId ?? null,
  }));
  if (roles.length) {
    await db
      .insert(schema.roleAssignment)
      .values(roles.map((r) => ({ userId: user!.id, ...r, grantedBy: user!.id })));
  }
  return {
    userId: user!.id,
    email,
    name: user!.name,
    sessionId: crypto.randomUUID(),
    mustChangePassword: false,
    ipAddress: null,
    roles: roles.map((r) => ({ role: r.role, scopeType: r.scopeType as ScopeType, scopeId: r.scopeId })),
  };
}

export const admin = () => makeActor([{ role: "ADMINISTRATOR" }]);
export const manager = () => makeActor([{ role: "GIS_MANAGER" }]);
export const lead = () => makeActor([{ role: "GIS_LEAD" }]);
export const specialist = () => makeActor([{ role: "GIS_SPECIALIST" }]);
export const viewer = () => makeActor([{ role: "VIEWER" }]);

/**
 * Load the dropdown lists of the workbook, as `scripts/seed.ts` does. A strict field is only
 * valid against the Lists sheet, so a test that creates rows through the services needs them.
 */
export async function seedLists(): Promise<void> {
  for (const key of LIST_KEY_VALUES) {
    const items = SEED_LISTS[key];
    if (!items.length) continue;
    const existing = await db.select({ id: schema.listItem.id }).from(schema.listItem).where(eq(schema.listItem.listKey, key)).limit(1);
    if (existing.length) continue;
    await db
      .insert(schema.listItem)
      .values(items.map((it, i) => ({ listKey: key, value: it.value, group: it.group ?? null, sortOrder: i + 1 })));
  }
}

/** A region list value (for region-scoped grants). */
export async function seedRegion(value = "India") {
  const [row] = await db
    .insert(schema.listItem)
    .values({ listKey: "region", value, sortOrder: 1 })
    .returning();
  return row!;
}

export { db, schema };
