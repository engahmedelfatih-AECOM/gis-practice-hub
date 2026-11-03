import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/infrastructure/db/schema";
import type { Role, ScopeType } from "../src/domain/shared/enums";

/**
 * Load the sample workbook into a local database, as the first Administrator, so a local run or
 * an end-to-end walk-through has the same data the test suite uses.
 *
 *   npx tsx scripts/import-sample.ts [path to the workbook]
 *
 * Sample data only. Never point this at the Render database or at a database holding real client
 * data: the import rewrites the registers.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const file = process.argv[2] ?? "tests/fixtures/GIS_Practice_Hub_sample.xlsx";
  const client = postgres(url, { max: 1, onnotice: () => undefined });
  const db = drizzle(client, { schema, casing: "snake_case" });
  try {
    const [user] = await db
      .select({ id: schema.appUser.id, email: schema.appUser.email, name: schema.appUser.name })
      .from(schema.appUser)
      .orderBy(schema.appUser.createdAt)
      .limit(1);
    if (!user) throw new Error("No users: run the seed first");
    const roles = await db
      .select({ role: schema.roleAssignment.role, scopeType: schema.roleAssignment.scopeType, scopeId: schema.roleAssignment.scopeId })
      .from(schema.roleAssignment)
      .where(eq(schema.roleAssignment.userId, user.id));
    const grants = roles.map((r) => ({ role: r.role as Role, scopeType: r.scopeType as ScopeType, scopeId: r.scopeId }));
    // The application layer is marked `server-only`, which throws outside the React bundler.
    // This script is the server, so the guard is satisfied in advance with an empty module.
    const guard = require.resolve("server-only");
    require.cache[guard] = { id: guard, filename: guard, loaded: true, exports: {}, children: [], paths: [] } as never;
    const { importHubWorkbook } = await import("../src/application/hub/import");
    const summary = await importHubWorkbook(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        sessionId: "script",
        mustChangePassword: false,
        ipAddress: null,
        roles: grants,
      },
      { name: path.basename(file), buffer: readFileSync(path.resolve(file)) },
      false,
    );
    for (const r of summary.registers) {
      console.log(`${r.key}: ${r.inserted} inserted, ${r.updated} updated, ${r.skipped} skipped`);
    }
    console.log(`${summary.periods} periods, ${summary.workflows} workflow steps, ${summary.warnings.length} warnings`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
