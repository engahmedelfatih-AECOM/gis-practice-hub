import "server-only";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { paginationSchema, type Page } from "@/domain/shared/schema";
import { db } from "@/infrastructure/db/client";
import { appUser, auditLog } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { assertCan, parseInput } from "@/application/shared/guard";
import { countWhere, offsetOf, paginate } from "@/application/shared/service";

export interface AuditRow {
  id: string;
  occurredAt: Date;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
}

export interface AuditFilter {
  entityType?: string | null;
  entityId?: string | null;
  action?: string | null;
  from?: string | null;
  to?: string | null;
  page?: unknown;
  pageSize?: unknown;
}

export async function listAudit(actor: Actor, filter: AuditFilter = {}): Promise<Page<AuditRow>> {
  assertCan(actor, "audit:read");
  const p = parseInput(paginationSchema, { page: filter.page, pageSize: filter.pageSize });
  const conds: SQL[] = [];
  if (filter.entityType) conds.push(eq(auditLog.entityType, filter.entityType));
  if (filter.entityId) conds.push(eq(auditLog.entityId, filter.entityId));
  if (filter.action) conds.push(eq(auditLog.action, filter.action));
  if (filter.from) conds.push(gte(auditLog.occurredAt, new Date(filter.from)));
  if (filter.to) conds.push(lte(auditLog.occurredAt, new Date(`${filter.to}T23:59:59.999Z`)));
  const where = conds.length ? and(...conds) : undefined;
  const [items, total] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        occurredAt: auditLog.occurredAt,
        actorEmail: appUser.email,
        actorName: appUser.name,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        before: auditLog.before,
        after: auditLog.after,
      })
      .from(auditLog)
      .leftJoin(appUser, eq(appUser.id, auditLog.actorUserId))
      .where(where)
      .orderBy(desc(auditLog.occurredAt))
      .limit(p.pageSize)
      .offset(offsetOf(p)),
    countWhere(auditLog, where),
  ]);
  return paginate(items, total, p);
}

/** History of one record, for "History" panels on detail screens (permission = can view the record). */
export async function historyFor(
  entityType: string,
  entityId: string,
  limit = 50,
): Promise<AuditRow[]> {
  return db
    .select({
      id: auditLog.id,
      occurredAt: auditLog.occurredAt,
      actorEmail: appUser.email,
      actorName: appUser.name,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      before: auditLog.before,
      after: auditLog.after,
    })
    .from(auditLog)
    .leftJoin(appUser, eq(appUser.id, auditLog.actorUserId))
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
    .orderBy(desc(auditLog.occurredAt))
    .limit(limit);
}
