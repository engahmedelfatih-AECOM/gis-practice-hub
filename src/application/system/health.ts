import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { logger } from "@/lib/logger";

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch (err) {
    logger.error({ err }, "database health check failed");
    return false;
  }
}
