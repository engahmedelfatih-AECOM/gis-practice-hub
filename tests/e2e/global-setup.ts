import "dotenv/config";
import postgres from "postgres";

/**
 * Reset sign-in rate-limit counters so repeated local runs are deterministic.
 * The limit itself (5 attempts / minute / IP) stays active during the run.
 */
export default async function globalSetup(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    await sql`delete from auth_rate_limit`;
  } finally {
    await sql.end();
  }
}
