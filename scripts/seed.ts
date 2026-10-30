import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/infrastructure/db/schema";
import { LIST_KEY_VALUES } from "../src/domain/shared/enums";
import {
  SEED_LISTS,
  SEED_PERIOD_COUNT,
  SEED_PERIOD_DAYS,
  SEED_PERIOD_START,
} from "../src/domain/hub/seed-lists";

/**
 * Idempotent bootstrap seed.
 *  - Creates the first Administrator from SEED_ADMIN_* when no users exist.
 *  - Loads the dropdown lists of the workbook when a list is empty.
 *  - Creates the bi-weekly report periods when none exist.
 * Project data is never seeded: it comes from the workbook import or the screens.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1, onnotice: () => undefined });
  const db = drizzle(client, { schema, casing: "snake_case" });

  try {
    await db.transaction(async (tx) => {
      // --- first administrator -----------------------------------------------
      const [countRow] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.appUser);
      const userCount = countRow?.n ?? 0;
      if (userCount === 0) {
        const email = process.env.SEED_ADMIN_EMAIL;
        const name = process.env.SEED_ADMIN_NAME ?? "Administrator";
        const password = process.env.SEED_ADMIN_PASSWORD;
        if (!email || !password) {
          throw new Error(
            "No users exist. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first Administrator.",
          );
        }
        if (password.length < 12)
          throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
        const [user] = await tx
          .insert(schema.appUser)
          .values({
            email: email.toLowerCase(),
            name,
            isActive: true,
            mustChangePassword: false,
            authProvider: "LOCAL",
          })
          .returning({ id: schema.appUser.id });
        const adminId = user!.id;
        await tx.insert(schema.authAccount).values({
          userId: adminId,
          accountId: adminId,
          providerId: "credential",
          password: await hashPassword(password),
        });
        await tx.insert(schema.roleAssignment).values({
          userId: adminId,
          role: "ADMINISTRATOR",
          scopeType: "GLOBAL",
          scopeId: null,
          grantedBy: adminId,
        });
        await tx.insert(schema.auditLog).values({
          actorUserId: adminId,
          action: "system.seedAdministrator",
          entityType: "app_user",
          entityId: adminId,
          after: { email: email.toLowerCase(), name },
        });
        console.log(`Created Administrator ${email}`);
      } else {
        console.log(`Users already exist (${userCount}); administrator seeding skipped`);
      }

      // --- dropdown lists ------------------------------------------------------
      let added = 0;
      for (const key of LIST_KEY_VALUES) {
        const [existing] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.listItem)
          .where(eq(schema.listItem.listKey, key));
        if ((existing?.n ?? 0) > 0) continue;
        const items = SEED_LISTS[key];
        await tx.insert(schema.listItem).values(
          items.map((it, i) => ({ listKey: key, value: it.value, group: it.group ?? null, sortOrder: i + 1 })),
        );
        added += items.length;
      }
      console.log(added ? `Loaded ${added} list values` : "Lists already present");

      // --- report periods ------------------------------------------------------
      const [periods] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.reportPeriod);
      if ((periods?.n ?? 0) === 0) {
        const rows = [];
        const start = new Date(`${SEED_PERIOD_START}T00:00:00Z`);
        for (let i = 0; i < SEED_PERIOD_COUNT; i++) {
          const s = new Date(start.getTime() + i * SEED_PERIOD_DAYS * 86_400_000);
          const e = new Date(s.getTime() + (SEED_PERIOD_DAYS - 1) * 86_400_000);
          rows.push({ startDate: s.toISOString().slice(0, 10), endDate: e.toISOString().slice(0, 10) });
        }
        await tx.insert(schema.reportPeriod).values(rows);
        console.log(`Created ${rows.length} report periods from ${SEED_PERIOD_START}`);
      }
    });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
