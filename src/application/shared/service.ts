import "server-only";
import { and, count, eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db, type Tx } from "@/infrastructure/db/client";
import { logger } from "@/lib/logger";
import { conflict, isAppError, notFound } from "@/application/errors";
import { translateDbError } from "./db-errors";
import type { Page, Pagination } from "@/domain/shared/schema";

/**
 * Run `fn` in a database transaction, translating PostgreSQL constraint
 * violations to application errors. Every mutating use case goes through here.
 */
export async function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.transaction(async (tx) => fn(tx));
  } catch (err) {
    if (isAppError(err)) throw err;
    const translated = translateDbError(err);
    if (translated) throw translated;
    logger.error({ err }, "unhandled database error");
    throw err;
  }
}

/**
 * Optimistic-locking update helper: updates `table` where id and version
 * match, bumps version, returns the row. Throws CONFLICT when someone else
 * changed the record first.
 */
export async function updateVersioned<T extends PgTable & { id: PgColumn; version: PgColumn }>(
  tx: Tx,
  table: T,
  id: string,
  version: number,
  values: Record<string, unknown>,
  label: string,
) {
  const rows = await tx
    .update(table)
    .set({ ...values, version: sql`${table.version} + 1` } as never)
    .where(and(eq(table.id, id), eq(table.version, version)))
    .returning();
  const row = rows[0];
  if (!row) {
    const exists = await tx
      .select({ id: table.id })
      .from(table as PgTable)
      .where(eq(table.id, id))
      .limit(1);
    if (exists.length === 0) throw notFound(label);
    throw conflict(`${label} was changed by someone else. Reload and try again.`);
  }
  return row;
}

/** Count rows matching `where` on `table`. */
export async function countWhere(table: PgTable, where: SQL | undefined): Promise<number> {
  const [row] = await db.select({ n: count() }).from(table).where(where);
  return row?.n ?? 0;
}

export function paginate<T>(items: T[], total: number, p: Pagination): Page<T> {
  return { items, total, page: p.page, pageSize: p.pageSize };
}

export function offsetOf(p: Pagination): number {
  return (p.page - 1) * p.pageSize;
}

/** ILIKE pattern for simple search boxes. */
export function likePattern(q: string | undefined | null): string | null {
  const s = q?.trim();
  return s ? `%${s.replace(/[%_\\]/g, (m) => `\\${m}`)}%` : null;
}
