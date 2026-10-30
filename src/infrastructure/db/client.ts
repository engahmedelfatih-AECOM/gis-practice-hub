import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, isProduction } from "@/infrastructure/config/env";
import * as schema from "./schema";

/**
 * Single connection pool for the process. Next.js reloads modules in
 * development, so the pool is cached on `globalThis` to avoid leaking
 * connections on every hot reload.
 */
declare global {
  var __ghSql: ReturnType<typeof postgres> | undefined;
}

function createSql() {
  return postgres(env.DATABASE_URL, {
    max: isProduction ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: true,
    onnotice: () => undefined,
  });
}

export const sql = globalThis.__ghSql ?? createSql();
if (!isProduction) globalThis.__ghSql = sql;

export const db = drizzle(sql, { schema, casing: "snake_case" });

export type Db = typeof db;
/** The transaction-scoped database handle passed through use cases. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
