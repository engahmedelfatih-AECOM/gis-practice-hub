import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { addDays, periodBucket, periodLabel, todayIso } from "@/domain/hub/rules";
import { isoDateSchema, uuidSchema } from "@/domain/shared/schema";
import { db } from "@/infrastructure/db/client";
import { reportPeriod } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { notFound, validation } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { withTx } from "@/application/shared/service";
import { getSetting } from "@/application/settings/settings";

export interface PeriodView {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
}

/** All report periods in calendar order (the Lists sheet columns R to T). */
export const listPeriods = cache(async (): Promise<PeriodView[]> => {
  const rows = await db.select().from(reportPeriod).orderBy(asc(reportPeriod.startDate));
  return rows.map((r) => ({ id: r.id, startDate: r.startDate, endDate: r.endDate, label: periodLabel(r.startDate, r.endDate) }));
});

/** The period to show by default: the one containing today, else the last one before today, else the first. */
export async function defaultPeriod(periods: PeriodView[], today = todayIso()): Promise<PeriodView | null> {
  if (!periods.length) return null;
  const current = periodBucket(today, periods);
  if (current) return current;
  const before = periods.filter((p) => p.endDate < today);
  return before.length ? before[before.length - 1]! : periods[0]!;
}

export async function resolvePeriod(id: string | null | undefined): Promise<PeriodView | null> {
  const periods = await listPeriods();
  if (id) {
    const found = periods.find((p) => p.id === id);
    if (found) return found;
  }
  return defaultPeriod(periods);
}

const periodInput = z.object({ startDate: isoDateSchema, endDate: isoDateSchema.optional().or(z.literal("")) });

export async function createPeriod(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "period:manage");
  const input = parseInput(periodInput, raw);
  const days = await getSetting("report.periodDays");
  const endDate = input.endDate || addDays(input.startDate, days - 1);
  if (endDate < input.startDate) throw validation("The end date is before the start date.", { endDate: ["End before start."] });
  await withTx(async (tx) => {
    const [row] = await tx.insert(reportPeriod).values({ startDate: input.startDate, endDate }).returning();
    await writeAudit(tx, actor, { action: "period.create", entityType: "report_period", entityId: row!.id, after: row });
  });
}

/** Regenerate the whole calendar from a first start date: N periods of the configured length. */
export async function regeneratePeriods(actor: Actor, raw: unknown): Promise<number> {
  assertCan(actor, "period:manage");
  const input = parseInput(z.object({ startDate: isoDateSchema, count: z.coerce.number().int().min(1).max(200) }), raw);
  const days = await getSetting("report.periodDays");
  return withTx(async (tx) => {
    await tx.delete(reportPeriod);
    const rows = [];
    for (let i = 0; i < input.count; i++) {
      const s = addDays(input.startDate, i * days);
      rows.push({ startDate: s, endDate: addDays(s, days - 1) });
    }
    await tx.insert(reportPeriod).values(rows);
    await writeAudit(tx, actor, { action: "period.regenerate", entityType: "report_period", after: { startDate: input.startDate, count: input.count, days } });
    return rows.length;
  });
}

export async function updatePeriod(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "period:manage");
  const input = parseInput(z.object({ id: uuidSchema, startDate: isoDateSchema, endDate: isoDateSchema }), raw);
  if (input.endDate < input.startDate) throw validation("The end date is before the start date.", { endDate: ["End before start."] });
  await withTx(async (tx) => {
    const [before] = await tx.select().from(reportPeriod).where(eq(reportPeriod.id, input.id));
    if (!before) throw notFound("Report period");
    const [after] = await tx.update(reportPeriod).set({ startDate: input.startDate, endDate: input.endDate }).where(eq(reportPeriod.id, input.id)).returning();
    await writeAudit(tx, actor, { action: "period.update", entityType: "report_period", entityId: input.id, before, after });
  });
}

export async function deletePeriod(actor: Actor, rawId: unknown): Promise<void> {
  assertCan(actor, "period:manage");
  const id = parseInput(uuidSchema, rawId);
  await withTx(async (tx) => {
    const [before] = await tx.select().from(reportPeriod).where(eq(reportPeriod.id, id));
    if (!before) throw notFound("Report period");
    await tx.delete(reportPeriod).where(eq(reportPeriod.id, id));
    await writeAudit(tx, actor, { action: "period.delete", entityType: "report_period", entityId: id, before });
  });
}
