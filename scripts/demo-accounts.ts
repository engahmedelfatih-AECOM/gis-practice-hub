import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/infrastructure/db/schema";
import type { Role } from "../src/domain/shared/enums";

/**
 * Demo accounts for a hosted demonstration (one per role). Idempotent: creates missing users,
 * resets their password to DEMO_ACCOUNTS_PASSWORD and ensures the role grants.
 *
 *   DEMO_ACCOUNTS_PASSWORD=... npm run demo:accounts
 *
 * Never run against a production database: it sets known passwords.
 */
const ACCOUNTS: { email: string; name: string; role: Role; region?: string }[] = [
  { email: "manager.demo@aecom.com", name: "Demo GIS Manager", role: "GIS_MANAGER" },
  { email: "lead.demo@aecom.com", name: "Demo GIS Lead", role: "GIS_LEAD" },
  { email: "specialist.demo@aecom.com", name: "Demo GIS Specialist", role: "GIS_SPECIALIST" },
  { email: "viewer.demo@aecom.com", name: "Demo Viewer", role: "VIEWER" },
  // A lead of one hub only, so the REGION scope can be seen and tested (report 2026-11-02, B2).
  { email: "lead.india.demo@aecom.com", name: "Demo GIS Lead (India)", role: "GIS_LEAD", region: "India" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  const password = process.env.DEMO_ACCOUNTS_PASSWORD;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!password || password.length < 12)
    throw new Error("DEMO_ACCOUNTS_PASSWORD (12+ characters) is required");
  const client = postgres(url, { max: 1, onnotice: () => undefined });
  const db = drizzle(client, { schema, casing: "snake_case" });
  try {
    await db.transaction(async (tx) => {
      const [admin] = await tx
        .select({ id: schema.appUser.id })
        .from(schema.appUser)
        .orderBy(schema.appUser.createdAt)
        .limit(1);
      const regions = await tx
        .select({ id: schema.listItem.id, value: schema.listItem.value })
        .from(schema.listItem)
        .where(eq(schema.listItem.listKey, "region"));
      const hash = await hashPassword(password);
      for (const a of ACCOUNTS) {
        let [user] = await tx.select().from(schema.appUser).where(eq(schema.appUser.email, a.email));
        if (!user) {
          [user] = await tx
            .insert(schema.appUser)
            .values({ email: a.email, name: a.name, isActive: true, mustChangePassword: false, authProvider: "LOCAL" })
            .returning();
        }
        const [account] = await tx
          .select()
          .from(schema.authAccount)
          .where(and(eq(schema.authAccount.userId, user!.id), eq(schema.authAccount.providerId, "credential")));
        if (account) {
          await tx.update(schema.authAccount).set({ password: hash }).where(eq(schema.authAccount.id, account.id));
        } else {
          await tx.insert(schema.authAccount).values({ userId: user!.id, accountId: user!.id, providerId: "credential", password: hash });
        }
        const region = a.region ? regions.find((r) => r.value.trim() === a.region) : undefined;
        if (a.region && !region) {
          console.log(`${a.email}: skipped, the region "${a.region}" is not in the Hub / Region list yet`);
          continue;
        }
        const scopeType = region ? "REGION" : "GLOBAL";
        const scopeId = region?.id ?? null;
        const [grant] = await tx
          .select()
          .from(schema.roleAssignment)
          .where(
            and(
              eq(schema.roleAssignment.userId, user!.id),
              eq(schema.roleAssignment.role, a.role),
              eq(schema.roleAssignment.scopeType, scopeType),
              scopeId ? eq(schema.roleAssignment.scopeId, scopeId) : isNull(schema.roleAssignment.scopeId),
              isNull(schema.roleAssignment.revokedAt),
            ),
          );
        if (!grant) {
          await tx.insert(schema.roleAssignment).values({
            userId: user!.id,
            role: a.role,
            scopeType,
            scopeId,
            grantedBy: admin?.id ?? user!.id,
          });
        }
        console.log(`${a.email}: ${a.role}${region ? ` (REGION ${region.value})` : ""}`);
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
