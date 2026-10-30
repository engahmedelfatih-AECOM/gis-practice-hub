import postgres from "postgres";

/**
 * Shared-instance mode for small deployments: when HUB_DATABASE_NAME is set, DATABASE_URL may
 * point at another database of the same PostgreSQL instance (for example the Resource Planner
 * database on the Render free tier, which allows one instance per workspace). This script creates
 * the Hub database on that instance when it is missing and prints the URL to use for it.
 * Data stays fully separate: a different database, its own tables, its own migrations.
 *
 *   DATABASE_URL=$(node dist-scripts/ensure-db.js)
 */
async function main() {
  const url = process.env.DATABASE_URL;
  const name = process.env.HUB_DATABASE_NAME?.trim();
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!name) {
    process.stdout.write(url);
    return;
  }
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(name)) throw new Error("HUB_DATABASE_NAME must be a simple lower-case identifier");
  const parsed = new URL(url);
  const current = parsed.pathname.replace(/^\//, "");
  if (current === name) {
    process.stdout.write(url);
    return;
  }
  const admin = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    const [row] = await admin`select 1 as n from pg_database where datname = ${name}`;
    if (!row) {
      await admin.unsafe(`create database "${name}"`);
      console.error(`[ensure-db] created database ${name}`);
    }
  } finally {
    await admin.end();
  }
  parsed.pathname = `/${name}`;
  process.stdout.write(parsed.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
