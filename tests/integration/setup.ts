import { afterAll, beforeAll } from "vitest";
import { runMigrations } from "@/infrastructure/db/migrate";

/**
 * Integration tests run against a real PostgreSQL database (TEST_DATABASE_URL,
 * default local port 5433 → gh_test). Migrations are applied once per run.
 */
const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5433/gh_test";
process.env.DATABASE_URL = url;
process.env.APP_URL ??= "http://127.0.0.1:3100";
process.env.BETTER_AUTH_SECRET ??= "test-only-secret-0123456789abcdef0123456789abcdef";
process.env.LOG_LEVEL ??= "silent";

beforeAll(async () => {
  await runMigrations(url);
});

// Leave the database empty so later steps (seeding, end-to-end) start from a known state.
afterAll(async () => {
  // Imported lazily: a static import would load the database client before the env vars above are set.
  const { resetDb } = await import("./helpers");
  await resetDb();
});
