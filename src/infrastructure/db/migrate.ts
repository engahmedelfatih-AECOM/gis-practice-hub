import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Applies pending SQL migrations from db/migrations. Used by `npm run db:migrate`
 * (release step) and by the integration-test setup. Independent of `env.ts` so
 * it can run without the full application configuration.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    const db = drizzle(client, { casing: "snake_case" });
    await migrate(db, { migrationsFolder: "db/migrations" });
  } finally {
    await client.end();
  }
}
